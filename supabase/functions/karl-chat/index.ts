import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.40.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FREE_LIMIT = 20;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "ajouter_transaction",
    description: "Propose d'enregistrer une transaction financière. Le système demandera confirmation avant insertion réelle.",
    input_schema: {
      type: "object" as const,
      properties: {
        montant: { type: "number", description: "Montant en euros (positif)" },
        categorie: { type: "string", description: "Catégorie (restauration, transport, salaire, loyer, loisirs...)" },
        type: { type: "string", enum: ["depense", "revenu"], description: "Type de transaction" },
        description: { type: "string", description: "Description courte optionnelle" },
      },
      required: ["montant", "categorie", "type"],
    },
  },
  {
    name: "calculer_solde_disponible",
    description: "Calcule le solde disponible du mois en cours, après provision des charges (entrepreneur) ou déduction des dépenses (particulier).",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "verifier_si_achat_possible",
    description: "Vérifie si un achat envisagé est raisonnable par rapport au solde disponible.",
    input_schema: {
      type: "object" as const,
      properties: {
        montant: { type: "number", description: "Montant de l'achat envisagé en euros" },
      },
      required: ["montant"],
    },
  },
  {
    name: "lister_transactions_recentes",
    description: "Retourne les dernières transactions de l'utilisateur.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: { type: "number", description: "Nombre max de transactions à retourner (défaut: 10, max: 50)" },
      },
    },
  },
];

const SYSTEM_PROMPT = `Tu es Karl, un coach financier personnel. Tu es direct, cash, légèrement sarcastique mais toujours bienveillant. Tu parles en français, de façon décontractée (pas de vouvoiement).

Règles impératives :
- N'invente JAMAIS de chiffres. Utilise toujours les tools pour obtenir des données réelles.
- Pour toute transaction mentionnée par l'utilisateur, appelle le tool ajouter_transaction — le système gèrera la confirmation.
- Sois concis. Réponds comme dans un SMS, pas un email. Maximum 3-4 phrases.
- Tu peux utiliser des emojis avec parcimonie.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const jwt = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const userId = user.id;
    const body = await req.json() as {
      message: string;
      history: { role: string; content: string }[];
      confirmed_transaction?: { montant: number; categorie: string; type: string; description?: string };
    };
    const { message, history = [], confirmed_transaction } = body;

    // --- Rate limiting ---
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const { data: usageRow } = await supabase
      .from("usage_mensuel")
      .select("nombre_messages_utilises")
      .eq("user_id", userId)
      .eq("mois", monthStart)
      .maybeSingle();

    const used = (usageRow as any)?.nombre_messages_utilises ?? 0;

    if (used >= FREE_LIMIT) {
      return jsonResponse({
        type: "paywall",
        message: `Tu as utilisé tes ${FREE_LIMIT} messages gratuits ce mois-ci. Passe à Karl+ pour continuer. 🔓`,
      });
    }

    // --- Confirmed transaction: execute then get ack ---
    if (confirmed_transaction) {
      const { montant, categorie, type, description } = confirmed_transaction;
      await supabase.from("transactions").insert({
        user_id: userId,
        montant,
        categorie,
        type,
        description: description ?? null,
        date: now.toISOString().split("T")[0],
      });

      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const ackResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `[SYSTÈME] Transaction enregistrée : ${montant}€ en ${categorie} (${type}). Confirme-le à l'utilisateur en une phrase courte et relance la conversation.`,
        }],
      });

      const ackText = ackResponse.content.find((b: any) => b.type === "text")?.text
        ?? `${montant}€ en ${categorie} — enregistré. ✅`;

      await saveAndIncrementUsage(supabase, userId, monthStart, message || "confirmation", ackText);
      return jsonResponse({ type: "message", message: ackText });
    }

    // --- Normal chat flow ---
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const recentHistory = history.slice(-10);

    let messages: Anthropic.MessageParam[] = [
      ...recentHistory.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Agentic tool loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      if (!toolUseBlock) break;

      const { id: toolUseId, name: toolName, input } = toolUseBlock;

      if (toolName === "ajouter_transaction") {
        // Feed "awaiting confirmation" so Claude writes a confirmation question
        const confirmMessages: Anthropic.MessageParam[] = [
          ...messages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [{
              type: "tool_result" as const,
              tool_use_id: toolUseId,
              content: JSON.stringify({
                status: "awaiting_confirmation",
                note: "L'utilisateur doit confirmer avant l'enregistrement. Pose la question de confirmation en une phrase courte et précise.",
              }),
            }],
          },
        ];

        const confirmResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: confirmMessages,
        });

        const confirmText = confirmResponse.content.find((b: any) => b.type === "text")?.text
          ?? `Tu veux que j'enregistre ${(input as any).montant}€ en ${(input as any).categorie} ?`;

        await saveAndIncrementUsage(supabase, userId, monthStart, message, confirmText);
        return jsonResponse({
          type: "pending_confirmation",
          message: confirmText,
          pending: input,
        });
      }

      // Execute other tools deterministically — Claude never invents the numbers
      let toolResult: unknown;
      try {
        toolResult = await executeTool(supabase, userId, toolName, input as Record<string, unknown>);
      } catch (err) {
        toolResult = { error: String(err) };
      }

      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: [{
            type: "tool_result" as const,
            tool_use_id: toolUseId,
            content: JSON.stringify(toolResult),
          }],
        },
      ];

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });
    }

    const finalText = response.content.find((b: any) => b.type === "text")?.text
      ?? "Hmm, je sèche là. 🤔";

    await saveAndIncrementUsage(supabase, userId, monthStart, message, finalText);
    return jsonResponse({ type: "message", message: finalText });

  } catch (err) {
    console.error("karl-chat error:", err);
    return jsonResponse({ error: "Erreur interne. Réessaie dans un instant. 🛠️" }, 500);
  }
});

async function executeTool(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "calculer_solde_disponible": {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const [{ data: profile }, { data: transactions }] = await Promise.all([
        supabase.from("profiles").select("profil_type, revenu_moyen_mensuel, statut_juridique").eq("id", userId).maybeSingle(),
        supabase.from("transactions").select("montant, type").eq("user_id", userId).gte("date", monthStart),
      ]);

      const txs = (transactions ?? []) as { montant: number; type: string }[];
      const totalRevenu = txs.filter((t) => t.type === "revenu").reduce((s, t) => s + Number(t.montant), 0);
      const totalDepense = txs.filter((t) => t.type === "depense").reduce((s, t) => s + Number(t.montant), 0);

      const p = profile as any;
      if (p?.profil_type === "entrepreneur") {
        const rates: Record<string, number> = { bnc: 0.246, bic: 0.212, vente: 0.123, other: 0.246 };
        const rate = rates[p.statut_juridique ?? "other"] ?? 0.246;
        const charges = Math.round(totalRevenu * rate);
        const solde = totalRevenu - charges - totalDepense;
        return {
          solde_disponible: solde,
          detail: `Revenus: ${totalRevenu}€ | Charges (${Math.round(rate * 100)}%): ${charges}€ | Dépenses: ${totalDepense}€ | Disponible: ${solde}€`,
        };
      } else {
        const salaire = Number(p?.revenu_moyen_mensuel ?? 0);
        const solde = salaire - totalDepense;
        return {
          solde_disponible: solde,
          detail: `Salaire: ${salaire}€ | Dépenses ce mois: ${totalDepense}€ | Disponible: ${solde}€`,
        };
      }
    }

    case "verifier_si_achat_possible": {
      const montantAchat = Number(input.montant);
      const result = await executeTool(supabase, userId, "calculer_solde_disponible", {}) as { solde_disponible: number };
      const apres = result.solde_disponible - montantAchat;
      return {
        possible: apres >= 0,
        solde_actuel: result.solde_disponible,
        solde_apres_achat: apres,
        message: apres >= 0
          ? `Achat OK. Il restera ${apres}€ après.`
          : `Achat risqué. Déficit de ${Math.abs(apres)}€.`,
      };
    }

    case "lister_transactions_recentes": {
      const limite = Math.min(Number(input.limite ?? 10), 50);
      const { data } = await supabase
        .from("transactions")
        .select("montant, categorie, type, description, date")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limite);
      return { transactions: data ?? [] };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function saveAndIncrementUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  monthStart: string,
  userMessage: string,
  assistantMessage: string
) {
  await Promise.all([
    supabase.from("conversations").insert([
      { user_id: userId, role: "user", contenu: userMessage },
      { user_id: userId, role: "assistant", contenu: assistantMessage },
    ]),
    supabase.rpc("increment_usage", { p_user_id: userId, p_mois: monthStart }),
  ]);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
