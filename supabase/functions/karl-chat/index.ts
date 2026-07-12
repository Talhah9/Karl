import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.40.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RECHARGE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 heures
const FREE_RECHARGE = 5;
const FREE_MAX = 20;
const PRO_RECHARGE = 25;
const PRO_MAX = 100;
const ABUSE_LIMIT = 60; // par fenêtre glissante de 24h

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
        exceptionnelle: { type: "boolean", description: "Mettre à true si l'utilisateur indique que c'est une dépense ponctuelle, exceptionnelle, non représentative du quotidien (ex: machine à laver, réparation voiture, achat unique). Omis ou false pour une dépense courante." },
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
        nouvelle_exceptionnelle: { type: "boolean", description: "Modifier le statut exceptionnel/ponctuel de la transaction (optionnel)" },
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

const COMMON_RULES = `Règles impératives :
- N'invente JAMAIS de chiffres. Utilise toujours les tools pour obtenir des données réelles.
- Appelle ajouter_transaction UNIQUEMENT pour une transaction nouvelle dans le message actuel de l'utilisateur — jamais pour une transaction déjà présente dans l'historique.
- N'appelle JAMAIS ajouter_transaction si l'utilisateur n'a pas fourni de montant explicite (chiffre) dans la conversation. Si le montant est absent ou ambigu, pose la question en texte pur et attends la réponse — ne devine et n'invente jamais un prix.
- Ne dis JAMAIS "c'est noté", "enregistré", "ajouté", "supprimé", "modifié" ou toute formule indiquant qu'une opération est faite avant que l'utilisateur ait cliqué sur le bouton de confirmation dans l'app. L'opération n'est exécutée QUE sur confirmation explicite.
- Quand tu appelles ajouter_transaction, modifier_transaction ou supprimer_transaction, n'inclus PAS de texte confirmant que l'opération est déjà faite — l'app affiche d'abord une carte de confirmation.
- Sois concis. Réponds comme dans un SMS, pas un email. Maximum 3-4 phrases.
- Tu peux utiliser des emojis avec parcimonie.
- Si l'historique contient "✅ Confirmé" ou "🗑️ Supprimé" suivi de ton accusé de réception : cette opération est DÉFINITIVEMENT clôturée. Ne la ré-exécute JAMAIS. Et surtout : ne génère AUCUN commentaire sur cette clôture ("Attends, ça a déjà été confirmé", "la transaction est déjà enregistrée", etc.). Réponds au message actuel normalement, comme si la transaction passée n'existait plus.`;

function buildSystemPrompt(profile: string): string {
  if (profile === "perso") {
    return `Tu es Karl, un coach budgétaire personnel. Tu es direct, cash, légèrement sarcastique mais toujours bienveillant. Tu parles en français, de façon décontractée (pas de vouvoiement).

Tu parles à un(e) salarié(e) / particulier(ère). Adapte ton vocabulaire au quotidien :
- Utilise : budget du mois, dépenses, salaire, économies, fin de mois, il reste X€, prélèvements, loyer, abonnements, objectif épargne, courses, sorties
- N'utilise JAMAIS : URSSAF, TVA, charges sociales, trimestre fiscal, encaisser une facture, te verser un salaire, provision de charges, BNC, BIC, auto-entrepreneur, trésorerie d'entreprise

${COMMON_RULES}`;
  }

  return `Tu es Karl, un coach financier pour entrepreneurs et freelances. Tu es direct, cash, légèrement sarcastique mais toujours bienveillant. Tu parles en français, de façon décontractée (pas de vouvoiement).

Tu parles à un(e) entrepreneur(e) / freelance. Vocabulaire adapté :
- Utilise librement : tréso, encaissé, charges, URSSAF, TVA, trimestre, ce que tu peux te verser, provision, auto-entrepreneur, BNC, BIC, revenu d'activité
- Évite le vocabulaire purement salarié (salaire fixe mensuel, ton employeur, ta fiche de paie)

${COMMON_RULES}`;
}

function buildSystemBlocks(
  systemPrompt: string,
  learnedHints?: string,
  customCategories?: Array<{ nom: string; emoji: string; budget_mensuel: number }>
): Anthropic.TextBlockParam[] {
  const blocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];
  if (learnedHints) {
    blocks.push({
      type: "text",
      text: `\n\nCatégories mémorisées pour cet utilisateur (utilise-les automatiquement, sans demander) : ${learnedHints}.`,
    });
  }
  if (customCategories && customCategories.length > 0) {
    const catList = customCategories
      .map((c) => `"${c.nom}" (${c.emoji}, budget: ${c.budget_mensuel}€/mois)`)
      .join(", ");
    blocks.push({
      type: "text",
      text: `\n\nCatégories budgétaires personnalisées de l'utilisateur : ${catList}. Utilise ces noms exacts (tels quels, sans modification) quand tu catégorises une transaction qui leur correspond.`,
    });
  }
  return blocks;
}

function extractKeywords(text: string): string[] {
  return (text.toLowerCase().match(/\b[a-zA-ZÀ-ÿ]{3,}\b/g) ?? []).slice(0, 25);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditsInfo {
  credits_restants: number;
  abonne: boolean;
  credits_max: number;
  derniere_recharge: string;
}

async function getOrCreateCredits(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  now: Date
): Promise<CreditsInfo> {
  const { data: row } = await supabase
    .from("credits_utilisateur")
    .select("credits_restants, abonne, derniere_recharge")
    .eq("user_id", userId)
    .maybeSingle();

  const abonne = (row as any)?.abonne ?? false;
  const rechargeAmt = abonne ? PRO_RECHARGE : FREE_RECHARGE;
  const maxCredits = abonne ? PRO_MAX : FREE_MAX;

  if (!row) {
    // Nouveau utilisateur : migration depuis usage_mensuel si existant
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: usageRow } = await supabase
      .from("usage_mensuel")
      .select("nombre_messages_utilises")
      .eq("user_id", userId)
      .eq("mois", monthStart)
      .maybeSingle();
    const used = (usageRow as any)?.nombre_messages_utilises ?? 0;
    const initialCredits = Math.max(0, FREE_MAX - used);
    const nowIso = now.toISOString();

    await supabase.from("credits_utilisateur").insert({
      user_id: userId,
      credits_restants: initialCredits,
      derniere_recharge: nowIso,
      abonne: false,
    });
    return { credits_restants: initialCredits, abonne: false, credits_max: FREE_MAX, derniere_recharge: nowIso };
  }

  // Recharge par fenêtre glissante
  const derniere = new Date((row as any).derniere_recharge);
  const msSince = now.getTime() - derniere.getTime();
  const recharges = Math.floor(msSince / RECHARGE_INTERVAL_MS);

  if (recharges > 0) {
    const newCredits = Math.min((row as any).credits_restants + recharges * rechargeAmt, maxCredits);
    const newDerniereIso = new Date(derniere.getTime() + recharges * RECHARGE_INTERVAL_MS).toISOString();
    await supabase.from("credits_utilisateur").update({
      credits_restants: newCredits,
      derniere_recharge: newDerniereIso,
    }).eq("user_id", userId);
    return { credits_restants: newCredits, abonne, credits_max: maxCredits, derniere_recharge: newDerniereIso };
  }

  return {
    credits_restants: (row as any).credits_restants,
    abonne,
    credits_max: maxCredits,
    derniere_recharge: (row as any).derniere_recharge,
  };
}

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
    const now = new Date();

    const body = await req.json() as {
      message: string;
      history: { role: string; content: string }[];
      profile?: string;
      persoSetup?: { netSalary: number; payday: number; fixedExpenses: number };
      freelanceSetup?: { status: string; monthlyRevenue: number; versementLiberatoire: boolean; acre: boolean };
      confirmed_transaction?: { montant: number; categorie: string; type: string; description?: string; exceptionnelle?: boolean };
      confirmed_modification?: { id: string; montant: number; categorie: string; type: string; description?: string; exceptionnelle?: boolean };
      confirmed_deletion?: { id: string };
      customCategories?: Array<{ nom: string; emoji: string; budget_mensuel: number }>;
    };
    const { message, history = [], profile = "freelance", persoSetup, freelanceSetup, confirmed_transaction, confirmed_modification, confirmed_deletion, customCategories = [] } = body;
    const userCtx: UserContext = { profile, persoSetup, freelanceSetup };
    const systemPrompt = buildSystemPrompt(profile);

    // --- Crédits : recharge glissante + création si absent ---
    const credits = await getOrCreateCredits(supabase, userId, now);

    // --- Vérification abus (60 messages / 24h glissantes) ---
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", windowStart);

    if ((recentCount ?? 0) >= ABUSE_LIMIT) {
      return jsonResponse({
        type: "rate_limited",
        message: "Tu envoies trop de messages. Limite de 60 messages par 24h atteinte. Reviens plus tard 🕐",
        credits_restants: credits.credits_restants,
        credits_max: credits.credits_max,
        abonne: credits.abonne,
      });
    }

    // --- Vérification crédits ---
    if (credits.credits_restants <= 0) {
      const nextRechargeAt = new Date(new Date(credits.derniere_recharge).getTime() + RECHARGE_INTERVAL_MS);
      const minsLeft = Math.max(1, Math.ceil((nextRechargeAt.getTime() - now.getTime()) / 60000));
      const timeLabel = minsLeft >= 60 ? `${Math.ceil(minsLeft / 60)}h` : `${minsLeft} min`;
      if (credits.abonne) {
        return jsonResponse({
          type: "rate_limited",
          message: `Je souffle 2 minutes et je reviens. 😮‍💨 Recharge dans ${timeLabel}.`,
          credits_restants: 0,
          credits_max: credits.credits_max,
          abonne: true,
        });
      }
      return jsonResponse({
        type: "paywall",
        message: `Plus de crédits. Prochaine recharge dans ${timeLabel} (+${FREE_RECHARGE} crédits). Passe à Karl Pro pour 25 crédits toutes les 6h 🚀`,
        credits_restants: 0,
        credits_max: credits.credits_max,
        abonne: false,
      });
    }

    // Décrémente atomiquement et retourne le nouveau solde
    async function useCredit(): Promise<number> {
      const { data: newCount } = await supabase.rpc("try_use_credit", { p_user_id: userId });
      return typeof newCount === "number" && newCount >= 0 ? newCount : Math.max(0, credits.credits_restants - 1);
    }

    // --- Transaction confirmée : insertion ---
    if (confirmed_transaction) {
      const { montant, categorie, type, description, exceptionnelle } = confirmed_transaction;
      await supabase.from("transactions").insert({
        user_id: userId,
        montant,
        categorie,
        type,
        description: description ?? null,
        date: now.toISOString().split("T")[0],
        exceptionnelle: exceptionnelle ?? false,
      });

      if (description) {
        const keywords = extractKeywords(description).slice(0, 5);
        if (keywords.length > 0) {
          await supabase.from("categories_apprises").upsert(
            keywords.map((mot_cle) => ({ user_id: userId, mot_cle, categorie })),
            { onConflict: "user_id,mot_cle" }
          );
        }
      }

      const ackText = await ackWithContext(
        history,
        `[TRANSACTION_INSÉRÉE : ${montant}€ - ${categorie} - ${type}${description ? ` (${description})` : ""}] Accuse réception en une phrase courte et relance la conversation.`,
        `${montant}€ en ${categorie} — enregistré. ✅`,
        buildSystemBlocks(systemPrompt)
      );
      await saveConversation(supabase, userId, message || "confirmation", ackText);
      const creditsAfter = await useCredit();
      return jsonResponse({ type: "message", message: ackText, credits_restants: creditsAfter, credits_max: credits.credits_max, abonne: credits.abonne });
    }

    // --- Modification confirmée ---
    if (confirmed_modification) {
      const { id, montant, categorie, type, description, exceptionnelle } = confirmed_modification;
      await supabase
        .from("transactions")
        .update({
          montant, categorie, type, description: description ?? null,
          ...(exceptionnelle !== undefined ? { exceptionnelle } : {}),
        })
        .eq("id", id)
        .eq("user_id", userId);

      const ackText = await ackWithContext(
        history,
        `[TRANSACTION_MODIFIÉE : ${montant}€ - ${categorie} - ${type}] Accuse réception en une phrase courte.`,
        `Transaction modifiée : ${montant}€ en ${categorie}. ✅`,
        buildSystemBlocks(systemPrompt)
      );
      await saveConversation(supabase, userId, message || "modification", ackText);
      const creditsAfter = await useCredit();
      return jsonResponse({ type: "message", message: ackText, credits_restants: creditsAfter, credits_max: credits.credits_max, abonne: credits.abonne });
    }

    // --- Suppression confirmée ---
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
        `Transaction supprimée. ✅`,
        buildSystemBlocks(systemPrompt)
      );
      await saveConversation(supabase, userId, message || "suppression", ackText);
      const creditsAfter = await useCredit();
      return jsonResponse({ type: "message", message: ackText, credits_restants: creditsAfter, credits_max: credits.credits_max, abonne: credits.abonne });
    }

    // --- Catégories apprises (injection dans le prompt) ---
    let learnedHints: string | undefined;
    const msgKeywords = extractKeywords(message);
    if (msgKeywords.length > 0) {
      const { data: learned } = await supabase
        .from("categories_apprises")
        .select("mot_cle, categorie")
        .eq("user_id", userId)
        .in("mot_cle", msgKeywords);

      if (learned && (learned as any[]).length > 0) {
        learnedHints = (learned as any[])
          .map((r: any) => `"${r.mot_cle}" → catégorie "${r.categorie}"`)
          .join(", ");
      }
    }

    const systemBlocks = buildSystemBlocks(systemPrompt, learnedHints, customCategories);

    // --- Flux de chat normal ---
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
      system: systemBlocks,
      tools: TOOLS,
      messages,
    });

    // Boucle agentique
    while (response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      if (!toolUseBlock) break;

      const { id: toolUseId, name: toolName, input } = toolUseBlock;

      if (toolName === "ajouter_transaction") {
        const txInput = input as { montant: number; categorie: string; type: string; description?: string };

        if (!montantMentionnedByUser(txInput.montant, message, history)) {
          const clarifyText =
            response.content.find((b: any) => b.type === "text")?.text ??
            `C'était combien exactement ? Je vais pas inventer le prix 😅`;
          await saveConversation(supabase, userId, message, clarifyText);
          const creditsAfter = await useCredit();
          return jsonResponse({ type: "message", message: clarifyText, credits_restants: creditsAfter, credits_max: credits.credits_max, abonne: credits.abonne });
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
          `Tu veux que j'enregistre ${txInput.montant}€ en ${txInput.categorie} ?`,
          systemBlocks
        );

        await saveConversation(supabase, userId, message, confirmText);
        const creditsAfter = await useCredit();
        return jsonResponse({
          type: "pending_confirmation",
          message: confirmText,
          pending: { action: "add", ...input },
          credits_restants: creditsAfter,
          credits_max: credits.credits_max,
          abonne: credits.abonne,
        });
      }

      if (toolName === "modifier_transaction") {
        const modInput = input as { id: string; nouveau_montant?: number; nouvelle_categorie?: string; nouveau_type?: string; nouvelle_description?: string; nouvelle_exceptionnelle?: boolean };

        const { data: existing } = await supabase
          .from("transactions")
          .select("id, montant, categorie, type, description, exceptionnelle")
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
            system: systemBlocks,
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
        if (modInput.nouvelle_exceptionnelle !== undefined) changes.exceptionnelle = modInput.nouvelle_exceptionnelle;

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
          `Tu veux modifier cette transaction ?`,
          systemBlocks
        );

        await saveConversation(supabase, userId, message, confirmText);
        const creditsAfter = await useCredit();
        return jsonResponse({
          type: "pending_confirmation",
          message: confirmText,
          pending: {
            action: "modify",
            id: ex.id,
            current: { montant: ex.montant, categorie: ex.categorie, type: ex.type, description: ex.description, exceptionnelle: ex.exceptionnelle },
            changes,
          },
          credits_restants: creditsAfter,
          credits_max: credits.credits_max,
          abonne: credits.abonne,
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
            system: systemBlocks,
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
          `Tu veux supprimer cette transaction ?`,
          systemBlocks
        );

        await saveConversation(supabase, userId, message, confirmText);
        const creditsAfter = await useCredit();
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
          credits_restants: creditsAfter,
          credits_max: credits.credits_max,
          abonne: credits.abonne,
        });
      }

      // Outils en lecture seule
      let toolResult: unknown;
      try {
        toolResult = await executeTool(supabase, userId, toolName, input as Record<string, unknown>, userCtx);
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
        system: systemBlocks,
        tools: TOOLS,
        messages,
      });
    }

    const finalText = response.content.find((b: any) => b.type === "text")?.text
      ?? "Hmm, je sèche là. 🤔";

    await saveConversation(supabase, userId, message, finalText);
    const creditsAfter = await useCredit();
    return jsonResponse({ type: "message", message: finalText, credits_restants: creditsAfter, credits_max: credits.credits_max, abonne: credits.abonne });

  } catch (err) {
    console.error("karl-chat error:", err);
    return jsonResponse({ error: "Erreur interne. Réessaie dans un instant. 🛠️" }, 500);
  }
});

async function getConfirmationText(
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[],
  assistantContent: Anthropic.ContentBlock[],
  toolUseId: string,
  toolResultContent: unknown,
  fallback: string,
  systemBlocks: Anthropic.TextBlockParam[]
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
    system: systemBlocks,
    messages: confirmMessages,
  });

  return confirmResponse.content.find((b: any) => b.type === "text")?.text ?? fallback;
}

async function ackWithContext(
  history: { role: string; content: string }[],
  prompt: string,
  fallback: string,
  systemBlocks: Anthropic.TextBlockParam[]
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
    system: systemBlocks,
    messages: ackMessages,
  });

  return ackResponse.content.find((b: any) => b.type === "text")?.text ?? fallback;
}

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

  const euroSplit = /(\d+)\s*€\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = euroSplit.exec(userTexts)) !== null) {
    values.push(Number(m[1]) + Number(m[2]) / 100);
  }

  const euroWord = /(\d+)\s*euros?\s*(\d+)/gi;
  while ((m = euroWord.exec(userTexts)) !== null) {
    values.push(Number(m[1]) + Number(m[2]) / 100);
  }

  const standard = userTexts.match(/\d+([.,]\d+)?/g) ?? [];
  for (const n of standard) {
    values.push(parseFloat(n.replace(",", ".")));
  }

  return values.some((v) => Math.abs(v - montant) < 0.01);
}

interface UserContext {
  profile: string;
  persoSetup?: { netSalary: number; payday: number; fixedExpenses: number };
  freelanceSetup?: { status: string; monthlyRevenue: number; versementLiberatoire: boolean; acre: boolean };
}

function getPayCycleStart(payday: number): string {
  const now = new Date();
  const day = now.getDate();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (day < payday) {
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  const d = Math.min(payday, lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function executeTool(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  toolName: string,
  input: Record<string, unknown>,
  ctx: UserContext = { profile: "freelance" }
): Promise<unknown> {
  switch (toolName) {
    case "calculer_solde_disponible": {
      const now = new Date();
      const payday = ctx.persoSetup?.payday ?? 1;
      const cycleStart = ctx.profile === "perso"
        ? getPayCycleStart(payday)
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const [{ data: txData }, { data: chargesData }, { data: goalData }] = await Promise.all([
        supabase.from("transactions").select("montant, type").eq("user_id", userId).gte("date", cycleStart),
        supabase.from("charges_fixes").select("montant").eq("user_id", userId),
        supabase.from("objectifs_epargne").select("montant_cible").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const txs = (txData ?? []) as { montant: number; type: string }[];
      const totalRevenu = txs.filter((t) => t.type === "revenu").reduce((s, t) => s + Number(t.montant), 0);
      const totalDepense = txs.filter((t) => t.type === "depense").reduce((s, t) => s + Number(t.montant), 0);
      const chargesTotal = (chargesData ?? []).reduce((s: number, c: any) => s + Number(c.montant), 0);
      const savingsGoal = Number((goalData as any)?.montant_cible ?? 0);

      if (ctx.profile === "freelance") {
        const rates: Record<string, number> = { bnc: 0.246, bic: 0.212, vente: 0.123, other: 0.246 };
        const rate = rates[ctx.freelanceSetup?.status ?? "other"] ?? 0.246;
        const chargesProvisionnees = Math.round(totalRevenu * rate);
        const solde = totalRevenu - chargesProvisionnees - totalDepense;
        return {
          solde_disponible: solde,
          detail: `Encaissé: ${totalRevenu}€ | Charges provisionnées (${Math.round(rate * 100)}%): ${chargesProvisionnees}€ | Dépenses: ${totalDepense}€ | Disponible: ${solde}€`,
        };
      } else {
        const salaire = ctx.persoSetup?.netSalary ?? 0;
        const solde = salaire + totalRevenu - chargesTotal - savingsGoal - totalDepense;
        console.log("[Karl solde debug]", { payday, cycleStart, salaire, totalRevenu, chargesTotal, savingsGoal, totalDepense, solde });
        return {
          solde_disponible: solde,
          detail: `Cycle depuis le ${cycleStart} | Salaire fixe: ${salaire}€ | Revenus additionnels: ${totalRevenu}€ | Charges fixes: ${chargesTotal}€ | Épargne réservée: ${savingsGoal}€ | Dépenses variables: ${totalDepense}€ | Reste: ${solde}€`,
        };
      }
    }

    case "verifier_si_achat_possible": {
      const montantAchat = Number(input.montant);
      const result = await executeTool(supabase, userId, "calculer_solde_disponible", {}, ctx) as { solde_disponible: number };
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

async function saveConversation(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userMessage: string,
  assistantMessage: string
) {
  await supabase.from("conversations").insert([
    { user_id: userId, role: "user", contenu: userMessage },
    { user_id: userId, role: "assistant", contenu: assistantMessage },
  ]);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
