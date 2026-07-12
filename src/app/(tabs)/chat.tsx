import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

type MessageFrom = 'karl' | 'user';
type Message = { id: string; from: MessageFrom; text: string };

type KarlResponse = {
  type: string;
  message: string;
  pending?: PendingAction;
  credits_restants?: number;
  credits_max?: number;
  abonne?: boolean;
};

type PendingAction =
  | { action: 'add'; montant: number; categorie: string; type: 'depense' | 'revenu'; description?: string; exceptionnelle?: boolean }
  | { action: 'delete'; id: string; montant: number; categorie: string; type: 'depense' | 'revenu'; description?: string }
  | {
      action: 'modify';
      id: string;
      current: { montant: number; categorie: string; type: string; description?: string; exceptionnelle?: boolean };
      changes: { montant?: number; categorie?: string; type?: string; description?: string; exceptionnelle?: boolean };
    };

const SUGGESTIONS_FREELANCE = ['Je peux me payer combien ?', 'Mes dernières dépenses', 'J\'ai encaissé 500€'];
const SUGGESTIONS_PERSO = ['Il me reste combien ?', 'Mes plus grosses dépenses', 'J\'ai dépensé 40€ en resto'];

function renderText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <Text key={i} style={{ fontFamily: 'Sora_700Bold' }}>
          {p.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={i}>{p}</Text>;
  });
}

function creditsBadgeColor(restants: number, max: number, accent: string): string {
  const pct = max > 0 ? restants / max : 0;
  if (pct >= 0.5) return accent;
  if (pct >= 0.2) return C.warm;
  return '#ff5050';
}

function Bubble({ msg, accent }: { msg: Message; accent: string }) {
  const isKarl = msg.from === 'karl';
  return (
    <View
      style={[
        styles.bubble,
        isKarl
          ? styles.bubbleKarl
          : [styles.bubbleUser, { backgroundColor: accent }],
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          isKarl ? styles.bubbleTextKarl : [styles.bubbleTextUser, { color: C.dark }],
        ]}
      >
        {renderText(msg.text)}
      </Text>
    </View>
  );
}

function TypingBubble() {
  return (
    <View style={[styles.bubble, styles.bubbleKarl]}>
      <ActivityIndicator size="small" color={C.muted} />
    </View>
  );
}

const WELCOME_POINTS = [
  { emoji: '➕', text: 'Ajouter, modifier ou supprimer des transactions' },
  { emoji: '💰', text: 'Calculer ton solde disponible en temps réel' },
  { emoji: '📊', text: 'Analyser tes dépenses et revenus' },
  { emoji: '💡', text: 'Donner des conseils financiers personnalisés' },
];

export default function ChatScreen() {
  const { profile, authReady, persoSetup, freelanceSetup, hasSeenChatWelcome, setHasSeenChatWelcome } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;
  const suggestions = profile === 'perso' ? SUGGESTIONS_PERSO : SUGGESTIONS_FREELANCE;

  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Message[]>([
    {
      id: '0',
      from: 'karl',
      text: profile === 'perso'
        ? "Salut 👋 Je suis Karl, ton coach financier. Dis-moi ce que tu veux savoir sur ton argent."
        : "Salut 👋 Je suis Karl. Pose-moi une question sur ta tréso, ou dis-moi ce que tu as encaissé/dépensé.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editedMontant, setEditedMontant] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creditsRestants, setCreditsRestants] = useState<number | null>(null);
  const [creditsMax, setCreditsMax] = useState(20);
  const [isPro, setIsPro] = useState(false);
  const [isExceptionnelle, setIsExceptionnelle] = useState(false);
  const listRef = useRef<FlatList>(null);

  function buildHistory(): { role: 'user' | 'assistant'; content: string }[] {
    return msgs
      .filter((m) => m.from === 'karl' || m.from === 'user')
      .map((m) => ({
        role: m.from === 'karl' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));
  }

  function addMessage(from: MessageFrom, text: string): string {
    const id = String(Date.now() + Math.random());
    setMsgs((prev) => [...prev, { id, from, text }]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    return id;
  }

  async function callKarlChat(body: object): Promise<KarlResponse> {
    const { data, error: fnError } = await supabase.functions.invoke('karl-chat', { body });
    if (fnError) throw new Error(fnError.message);
    if (!data) throw new Error('Réponse vide');
    return data as KarlResponse;
  }

  function applyCredits(result: KarlResponse) {
    if (result.credits_restants !== undefined) setCreditsRestants(result.credits_restants);
    if (result.credits_max !== undefined) setCreditsMax(result.credits_max);
    if (result.abonne !== undefined) setIsPro(result.abonne);
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (!authReady) {
      setError("Connexion en cours, réessaie dans un instant.");
      return;
    }

    setError(null);
    setText('');
    addMessage('user', trimmed);
    setIsLoading(true);

    try {
      const result = await callKarlChat({
        message: trimmed,
        history: buildHistory(),
        profile,
        persoSetup: profile === 'perso' ? persoSetup : undefined,
        freelanceSetup: profile === 'freelance' ? freelanceSetup : undefined,
      });

      applyCredits(result);
      if (result.type === 'paywall') {
        addMessage('karl', result.message);
        setTimeout(() => router.push('/paywall'), 1500);
      } else if (result.type === 'rate_limited') {
        addMessage('karl', result.message);
      } else if (result.type === 'pending_confirmation') {
        addMessage('karl', result.message);
        const pending = result.pending ?? null;
        setPendingAction(pending);
        if (pending?.action === 'add') {
          setEditedMontant(String(pending.montant).replace('.', ','));
          setIsExceptionnelle(pending.exceptionnelle ?? false);
        } else if (pending?.action === 'modify' && pending.changes.montant !== undefined) {
          setEditedMontant(String(pending.changes.montant).replace('.', ','));
          setIsExceptionnelle(false);
        } else {
          setEditedMontant('');
          setIsExceptionnelle(false);
        }
      } else {
        addMessage('karl', result.message);
      }
    } catch (err: any) {
      setError(err.message ?? 'Erreur réseau. Réessaie.');
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction || isLoading) return;

    // Capture before clearing — card must vanish the instant the user taps Confirm
    const action = pendingAction;
    const montantStr = editedMontant;
    const exceptionnelleSnap = isExceptionnelle;
    setPendingAction(null);
    setEditedMontant('');
    setIsExceptionnelle(false);
    setError(null);
    setIsLoading(true);

    try {
      if (action.action === 'add') {
        const parsedMontant = parseFloat(montantStr.replace(',', '.'));
        if (isNaN(parsedMontant) || parsedMontant <= 0) return;
        const result = await callKarlChat({
          message: 'confirmé',
          history: buildHistory(),
          profile,
          confirmed_transaction: { ...action, montant: parsedMontant, exceptionnelle: exceptionnelleSnap },
        });
        applyCredits(result);
        addMessage('user', '✅ Confirmé');
        addMessage('karl', result.message);

      } else if (action.action === 'modify') {
        const resolvedMontant = (() => {
          if (action.changes.montant !== undefined) {
            const parsed = parseFloat(montantStr.replace(',', '.'));
            return !isNaN(parsed) && parsed > 0 ? parsed : action.current.montant;
          }
          return action.current.montant;
        })();
        const result = await callKarlChat({
          message: 'confirmé',
          history: buildHistory(),
          profile,
          confirmed_modification: {
            id: action.id,
            montant: resolvedMontant,
            categorie: action.changes.categorie ?? action.current.categorie,
            type: action.changes.type ?? action.current.type,
            description: action.changes.description ?? action.current.description,
            exceptionnelle: action.changes.exceptionnelle ?? action.current.exceptionnelle,
          },
        });
        applyCredits(result);
        addMessage('user', '✅ Confirmé');
        addMessage('karl', result.message);

      } else if (action.action === 'delete') {
        const result = await callKarlChat({
          message: 'confirmé',
          history: buildHistory(),
          profile,
          confirmed_deletion: { id: action.id },
        });
        applyCredits(result);
        addMessage('user', '🗑️ Supprimé');
        addMessage('karl', result.message);
      }
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'opération.");
    } finally {
      setIsLoading(false);
    }
  }

  function cancelAction() {
    setPendingAction(null);
    setEditedMontant('');
    setIsExceptionnelle(false);
    addMessage('karl', "Pas de souci, on n'enregistre rien. 👍");
  }

  const isValidMontant = (() => {
    if (!pendingAction) return false;
    if (pendingAction.action === 'delete') return true;
    if (pendingAction.action === 'modify' && pendingAction.changes.montant === undefined) return true;
    const v = parseFloat(editedMontant.replace(',', '.'));
    return !isNaN(v) && v > 0;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderLeft}>
          <KarlMascot size={40} color={accent} />
          <View>
            <Text style={styles.karlName}>Karl</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: authReady ? accent : C.muted }]} />
              <Text style={styles.statusText}>
                {authReady ? 'cash mais bienveillant' : 'connexion…'}
              </Text>
            </View>
          </View>
        </View>
        {creditsRestants !== null && (
          <View style={[styles.pill, { borderColor: isPro ? accent : creditsBadgeColor(creditsRestants, creditsMax, accent) }]}>
            <Text style={[styles.pillText, { color: isPro ? accent : creditsBadgeColor(creditsRestants, creditsMax, accent) }]}>
              {isPro ? 'Illimité ✨' : `${creditsRestants}/${creditsMax}`}
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.msgList}
          ListHeaderComponent={
            <Text style={styles.dateLabel}>Aujourd'hui</Text>
          }
          ListFooterComponent={isLoading ? <TypingBubble /> : null}
          renderItem={({ item }) => <Bubble msg={item} accent={accent} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Input area */}
        <View style={styles.inputArea}>
          {pendingAction ? (
            <View style={styles.confirmBlock}>
              {/* ADD: editable amount + exceptional toggle */}
              {pendingAction.action === 'add' && (
                <>
                  <View style={styles.confirmAmountRow}>
                    <TextInput
                      style={styles.confirmAmountInput}
                      value={editedMontant}
                      onChangeText={setEditedMontant}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <Text style={styles.confirmMeta}>
                      {'€ · '}{pendingAction.categorie}{' · '}{pendingAction.type}
                    </Text>
                  </View>
                  {pendingAction.type === 'depense' && (
                    <View style={styles.confirmExceptRow}>
                      <Text style={[styles.confirmMeta, { flex: 1, textAlign: 'left' }]}>
                        ⚡ Dépense exceptionnelle
                      </Text>
                      <Switch
                        value={isExceptionnelle}
                        onValueChange={setIsExceptionnelle}
                        trackColor={{ true: C.warm, false: C.surf3 }}
                        thumbColor="#fff"
                      />
                    </View>
                  )}
                </>
              )}

              {/* MODIFY: show current → new */}
              {pendingAction.action === 'modify' && (
                <View style={styles.confirmModifyRow}>
                  {pendingAction.changes.montant !== undefined ? (
                    <View style={styles.confirmAmountRow}>
                      <TextInput
                        style={styles.confirmAmountInput}
                        value={editedMontant}
                        onChangeText={setEditedMontant}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                      <Text style={styles.confirmMeta}>
                        {'€ · '}{pendingAction.changes.categorie ?? pendingAction.current.categorie}
                        {' · '}{pendingAction.changes.type ?? pendingAction.current.type}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.confirmMeta}>
                      {pendingAction.current.montant}€ · {pendingAction.current.categorie}
                      {' → '}{pendingAction.changes.categorie ?? pendingAction.current.categorie}
                      {' · '}{pendingAction.changes.type ?? pendingAction.current.type}
                    </Text>
                  )}
                </View>
              )}

              {/* DELETE: show what will be removed */}
              {pendingAction.action === 'delete' && (
                <View style={styles.confirmDeleteRow}>
                  <Text style={styles.confirmDeleteText}>
                    🗑️ {pendingAction.montant}€ · {pendingAction.categorie} · {pendingAction.type}
                    {pendingAction.description ? ` · ${pendingAction.description}` : ''}
                  </Text>
                </View>
              )}

              <View style={styles.confirmButtons}>
                <Pressable
                  style={[
                    styles.confirmBtn,
                    pendingAction.action === 'delete'
                      ? styles.confirmBtnDelete
                      : { backgroundColor: accent, opacity: isValidMontant ? 1 : 0.4 },
                  ]}
                  onPress={confirmAction}
                  disabled={!isValidMontant}
                >
                  <Text style={[
                    styles.confirmBtnText,
                    { color: pendingAction.action === 'delete' ? C.text : C.dark },
                  ]}>
                    {pendingAction.action === 'delete' ? '🗑️ Confirmer la suppression' : '✅ Confirmer'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmBtn, styles.confirmBtnCancel]}
                  onPress={cancelAction}
                >
                  <Text style={styles.confirmBtnText}>❌ Annuler</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.suggestionsRow}>
                {suggestions.map((s) => (
                  <Pressable
                    key={s}
                    style={styles.suggestionPill}
                    onPress={() => {
                      setText(s);
                    }}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Écris à Karl…"
                  placeholderTextColor={C.muted}
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={send}
                  returnKeyType="send"
                  editable={!isLoading}
                />
                <Pressable
                  style={[styles.sendBtn, { backgroundColor: isLoading ? C.muted : accent }]}
                  onPress={send}
                  disabled={isLoading}
                >
                  <Text style={styles.sendArrow}>↑</Text>
                </Pressable>
              </View>
            </>
          )}
          <Text style={styles.legal}>Karl peut se tromper · ce n'est pas un conseil réglementé</Text>
        </View>
      </KeyboardAvoidingView>

      {/* First-open welcome modal */}
      <Modal
        visible={!hasSeenChatWelcome}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.welcomeOverlay}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeader}>
              <KarlMascot size={46} color={accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.welcomeTitle}>Karl, c'est quoi ?</Text>
                <Text style={styles.welcomeSub}>Ton assistant financier personnel</Text>
              </View>
            </View>

            <View style={styles.welcomePoints}>
              {WELCOME_POINTS.map((p, i) => (
                <View key={i} style={styles.welcomePoint}>
                  <Text style={styles.welcomePointEmoji}>{p.emoji}</Text>
                  <Text style={styles.welcomePointText}>{p.text}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.welcomeBtn, { backgroundColor: accent }]}
              onPress={() => setHasSeenChatWelcome(true)}
            >
              <Text style={[styles.welcomeBtnText, { color: C.dark }]}>C'est parti →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  chatHeaderLeft: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  karlName: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted },
  pill: {
    backgroundColor: C.surf2,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: C.text },

  msgList: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 9 },
  dateLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 19,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  bubbleKarl: {
    alignSelf: 'flex-start',
    backgroundColor: C.surf2,
    borderBottomLeftRadius: 6,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  bubbleText: { fontSize: 13, lineHeight: 18 },
  bubbleTextKarl: { fontFamily: 'Sora_400Regular', color: C.text },
  bubbleTextUser: { fontFamily: 'Sora_600SemiBold' },

  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 6,
    backgroundColor: 'rgba(255,80,80,0.12)',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  errorText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: '#ff5050' },

  inputArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
    gap: 9,
  },
  suggestionsRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  suggestionPill: {
    backgroundColor: C.surf2,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  suggestionText: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.text },
  inputRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: C.surf2,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 11,
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendArrow: { fontSize: 19, color: C.dark, fontFamily: 'Sora_700Bold' },

  confirmBlock: { gap: 10 },
  confirmAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  confirmExceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  confirmAmountInput: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 14,
    color: C.text,
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
    minWidth: 52,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  confirmMeta: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  confirmModifyRow: {
    alignItems: 'center',
    gap: 4,
  },
  confirmDeleteRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  confirmDeleteText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: '#ff5050',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  confirmButtons: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: C.surf2,
    borderWidth: 1,
    borderColor: C.line,
  },
  confirmBtnDelete: {
    backgroundColor: '#ff5050',
  },
  confirmBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
    color: C.text,
  },

  legal: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
  },

  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,6,4,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  welcomeCard: {
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 24,
    padding: 24,
    gap: 20,
    width: '100%',
  },
  welcomeHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  welcomeTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.4,
  },
  welcomeSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: C.muted,
  },
  welcomePoints: { gap: 11 },
  welcomePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomePointEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  welcomePointText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.text,
    flex: 1,
    lineHeight: 18,
  },
  welcomeBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
});
