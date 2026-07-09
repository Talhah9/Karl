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
    description: "Propose d'enregistrer une transaction financière UNIQUEMENT quand l'utilisateur a fourni un montant explicite. Le système demandera confirmation avant insertion réelle. Ne jamais inclure de texte disant que la transaction est enregistrée — l'utilisateur doit d'abord confirmer via l'interface.",
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
    name: "modifier_transaction",
    description: "Propose de modifier une transaction existante. Appelle lister_transactions_recentes d'abord pour obtenir l'ID. Ne jamais indiquer que la modification est faite — l'utilisateur doit confirmer via l'interface.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "ID de la transaction à modifier" },
        nouveau_montant: { type: "number", description: "Nouveau montant en euros (optionnel)" },
        nouvelle_categorie: { type: "string", description: "Nouvelle catégorie (optionnel)" },
        nouveau_type: { type: "string", enum: ["depense", "revenu"], description: "Nouveau type (optionnel)" },
        nouvelle_description: { type: "string", description: "Nouvelle description (optionnel)" },
      },
      required: ["id"],
    },
  },
  {
    name: "supprimer_transaction",
    description: "Propose de supprimer une transaction existante. Appelle lister_transactions_recentes d'abord pour obtenir l'ID. Ne jamais indiquer que la suppression est faite — l'utilisateur doit confirmer via l'interface.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "ID de la transaction à supprimer" },
      },
      required: ["id"],
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
    description: "Retourne les dernières transactions de l'utilisateur avec leurs IDs.",
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
- Appelle ajouter_transaction UNIQUEMENT pour une transaction nouvelle dans le message actuel de l'utilisateur — jamais pour une transaction déjà présente dans l'historique.
- N'appelle JAMAIS ajouter_transaction si l'utilisateur n'a pas fourni de montant explicite (chiffre) dans la conversation. Si le montant est absent ou ambigu, pose la question en texte pur et attends la réponse — ne devine et n'invente jamais un prix.
- Ne dis JAMAIS "c'est noté", "enregistré", "ajouté", "supprimé", "modifié" ou toute formule indiquant qu'une opération est faite avant que l'utilisateur ait cliqué sur le bouton de confirmation dans l'app. L'opération n'est exécutée QUE sur confirmation explicite.
- Quand tu appelles ajouter_transaction, modifier_transaction ou supprimer_transaction, n'inclus PAS de texte confirmant que l'opération est déjà faite — l'app affiche d'abord une carte de confirmation.
- Sois concis. Réponds comme dans un SMS, pas un email. Maximum 3-4 phrases.
- Tu peux utiliser des emojis avec parcimonie.
- Si l'historique contient "✅ Confirmé" ou "🗑️ Supprimé" suivi de ton accusé de réception : cette opération est DÉFINITIVEMENT clôturée. Ne la ré-exécute JAMAIS. Et surtout : ne génère AUCUN commentaire sur cette clôture ("Attends, ça a déjà été confirmé", "la transaction est déjà enregistrée", etc.). Réponds au message actuel normalement, comme si la transaction passée n'existait plus.`;

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
      confirmed_modification?: { id: string; montant: number; categorie: string; type: string; description?: string };
      confirmed_deletion?: { id: string };
    };
    const { message, history = [], confirmed_transaction, confirmed_modification, confirmed_deletion } = body;

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

    // --- Confirmed transaction insert ---
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

      const ackText = await ackWithContext(
        history,
        `[TRANSACTION_INSÉRÉE : ${montant}€ - ${categorie} - ${type}${description ? ` (${description})` : ""}] Accuse réception en une phrase courte et relance la conversation.`,
        `${montant}€ en ${categorie} — enregistré. ✅`
      );
      await saveAndIncrementUsage(supabase, userId, monthStart, message || "confirmation", ackText);
      return jsonResponse({ type: "message", message: ackText });
    }

    // --- Confirmed modification ---
    if (confirmed_modification) {
      const { id, montant, categorie, type, description } = confirmed_modification;
      await supabase
        .from("transactions")
        .update({ montant, categorie, type, description: description ?? null })
        .eq("id", id)
        .eq("user_id", userId);

      const ackText = await ackWithContext(
        history,
        `[TRANSACTION_MODIFIÉE : ${montant}€ - ${categorie} - ${type}] Accuse réception en une phrase courte.`,
        `Transaction modifiée : ${montant}€ en ${categorie}. ✅`
      );
      await saveAndIncrementUsage(supabase, userId, monthStart, message || "modification", ackText);
      return jsonResponse({ type: "message", message: ackText });
    }

    // --- Confirmed deletion ---
    if (confirmed_deletion) {
      const { id } = confirmed_deletion;
      await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      const ackText = await ackWithContext(
        history,
        `[TRANSACTION_SUPPRIMÉE] Accuse réception en une phrase courte.`,
        `Transaction supprimée. ✅`
      );
      await saveAndIncrementUsage(supabase, userId, monthStart, message || "suppression", ackText);
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
        const txInput = input as { montant: number; categorie: string; type: string; description?: string };

        // Guard: montant must appear explicitly in user messages — never hallucinated.
        if (!montantMentionnedByUser(txInput.montant, message, history)) {
          const clarifyText =
            response.content.find((b: any) => b.type === "text")?.text ??
            `C'était combien exactement ? Je vais pas inventer le prix 😅`;
          await saveAndIncrementUsage(supabase, userId, monthStart, message, clarifyText);
          return jsonResponse({ type: "message", message: clarifyText });
        }

        const confirmText = await getConfirmationText(
          anthropic,
          messages,
          response.content,
          toolUseId,
          {
            status: "awaiting_confirmation",
            note: "L'utilisateur doit confirmer avant l'enregistrement. Pose la question de confirmation en une phrase courte et précise. Ne dis pas que c'est déjà enregistré.",
          },
          `Tu veux que j'enregistre ${txInput.montant}€ en ${txInput.categorie} ?`
        );

        await saveAndIncrementUsage(supabase, userId, monthStart, message, confirmText);
        return jsonResponse({
          type: "pending_confirmation",
          message: confirmText,
          pending: { action: "add", ...input },
        });
      }

      if (toolName === "modifier_transaction") {
        const modInput = input as { id: string; nouveau_montant?: number; nouvelle_categorie?: string; nouveau_type?: string; nouvelle_description?: string };

        const { data: existing } = await supabase
          .from("transactions")
          .select("id, montant, categorie, type, description")
          .eq("id", modInput.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          messages = [
            ...messages,
            { role: "assistant" as const, content: response.content },
            {
              role: "user" as const,
              content: [{
                type: "tool_result" as const,
                tool_use_id: toolUseId,
                content: JSON.stringify({ error: "Transaction introuvable. Appelle lister_transactions_recentes pour voir les IDs disponibles." }),
              }],
            },
          ];
          response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 300,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages,
          });
          continue;
        }

        const changes: Record<string, unknown> = {};
        if (modInput.nouveau_montant !== undefined) changes.montant = modInput.nouveau_montant;
        if (modInput.nouvelle_categorie !== undefined) changes.categorie = modInput.nouvelle_categorie;
        if (modInput.nouveau_type !== undefined) changes.type = modInput.nouveau_type;
        if (modInput.nouvelle_description !== undefined) changes.description = modInput.nouvelle_description;

        const ex = existing as any;
        const confirmText = await getConfirmationText(
          anthropic,
          messages,
          response.content,
          toolUseId,
          {
            status: "awaiting_confirmation",
            current: ex,
            changes,
            note: "Montre les changements et pose la question de confirmation en une phrase. Ne dis pas que la modification est déjà faite.",
          },
          `Tu veux modifier cette transaction ?`
        );

        await saveAndIncrementUsage(supabase, userId, monthStart, message, confirmText);
        return jsonResponse({
          type: "pending_confirmation",
          message: confirmText,
          pending: {
            action: "modify",
            id: ex.id,
            current: { montant: ex.montant, categorie: ex.categorie, type: ex.type, description: ex.description },
            changes,
          },
        });
      }

      if (toolName === "supprimer_transaction") {
        const delInput = input as { id: string };

        const { data: existing } = await supabase
          .from("transactions")
          .select("id, montant, categorie, type, description")
          .eq("id", delInput.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          messages = [
            ...messages,
            { role: "assistant" as const, content: response.content },
            {
              role: "user" as const,
              content: [{
                type: "tool_result" as const,
                tool_use_id: toolUseId,
                content: JSON.stringify({ error: "Transaction introuvable. Appelle lister_transactions_recentes pour voir les IDs disponibles." }),
              }],
            },
          ];
          response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 300,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages,
          });
          continue;
        }

        const ex = existing as any;
        const confirmText = await getConfirmationText(
          anthropic,
          messages,
          response.content,
          toolUseId,
          {
            status: "awaiting_confirmation",
            transaction: ex,
            note: "Demande confirmation de suppression en une phrase. Ne dis PAS que la suppression est déjà faite.",
          },
          `Tu veux supprimer cette transaction ?`
        );

        await saveAndIncrementUsage(supabase, userId, monthStart, message, confirmText);
        return jsonResponse({
          type: "pending_confirmation",
          message: confirmText,
          pending: {
            action: "delete",
            id: ex.id,
            montant: ex.montant,
            categorie: ex.categorie,
            type: ex.type,
            description: ex.description,
          },
        });
      }

      // Execute read-only tools deterministically
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

// Shared helper: ask Claude for a confirmation question then return the text
async function getConfirmationText(
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[],
  assistantContent: Anthropic.ContentBlock[],
  toolUseId: string,
  toolResultContent: unknown,
  fallback: string
): Promise<string> {
  const confirmMessages: Anthropic.MessageParam[] = [
    ...messages,
    { role: "assistant", content: assistantContent },
    {
      role: "user",
      content: [{
        type: "tool_result" as const,
        tool_use_id: toolUseId,
        content: JSON.stringify(toolResultContent),
      }],
    },
  ];

  const confirmResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: confirmMessages,
  });

  return confirmResponse.content.find((b: any) => b.type === "text")?.text ?? fallback;
}

// Shared helper: generate an ack message with history context
async function ackWithContext(
  history: { role: string; content: string }[],
  prompt: string,
  fallback: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const recentHistory = history.slice(-10);
  const ackMessages: Anthropic.MessageParam[] = [
    ...recentHistory.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: prompt },
  ];

  const ackResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: ackMessages,
  });

  return ackResponse.content.find((b: any) => b.type === "text")?.text ?? fallback;
}

// Handles French money formats: "1€20", "1 euro 20", standard decimals, etc.
function montantMentionnedByUser(
  montant: number,
  currentMessage: string,
  history: { role: string; content: string }[]
): boolean {
  const userTexts = [
    currentMessage,
    ...history.filter((h) => h.role === "user").map((h) => h.content),
  ].join(" ");

  const values: number[] = [];

  // "1€20", "1 € 20" → 1.20
  const euroSplit = /(\d+)\s*€\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = euroSplit.exec(userTexts)) !== null) {
    values.push(Number(m[1]) + Number(m[2]) / 100);
  }

  // "1 euro 20", "1 euros 20" → 1.20
  const euroWord = /(\d+)\s*euros?\s*(\d+)/gi;
  while ((m = euroWord.exec(userTexts)) !== null) {
    values.push(Number(m[1]) + Number(m[2]) / 100);
  }

  // Standard: "1.20", "1,20", integers
  const standard = userTexts.match(/\d+([.,]\d+)?/g) ?? [];
  for (const n of standard) {
    values.push(parseFloat(n.replace(",", ".")));
  }

  return values.some((v) => Math.abs(v - montant) < 0.01);
}

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
        .select("id, montant, categorie, type, description, date")
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
