import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

type Message = { id: string; from: 'karl' | 'user'; text: string };

const MOCK_FREELANCE: Message[] = [
  { id: '1', from: 'karl', text: 'Cette semaine tu as encaissé **1 850 €**. 👏' },
  {
    id: '2',
    from: 'karl',
    text: "J'en garde **455 €** pour l'URSSAF. Tu peux te verser **1 200 €** tranquille.",
  },
  { id: '3', from: 'user', text: 'Je peux pas me payer 1 500 plutôt ? 🥺' },
  {
    id: '4',
    from: 'karl',
    text: "Tu **PEUX**. Est-ce que tu **DOIS** ? 😬\nIl te reste 18 jours avant l'échéance. Prends les 1 500, et c'est moi qui stresse à ta place.",
  },
  { id: '5', from: 'user', text: "J'ai claqué 340 € en resto ce mois 🙈" },
  {
    id: '6',
    from: 'karl',
    text: "340 balles de resto. J'espère au moins que c'était étoilé. ⭐\n\nC'est 3 jours de charges, ça. On respire — mais janvier, le resto c'est *chez toi*. 🍝",
  },
];

const MOCK_PERSO: Message[] = [
  { id: '1', from: 'karl', text: 'Salaire tombé : **2 100 €**. 🎉' },
  {
    id: '2',
    from: 'karl',
    text: "Je réserve **915 €** (fixe) + **200 €** pour tes vacances. Reste **985 €** pour vivre jusqu'au 27.",
  },
  { id: '3', from: 'user', text: "J'ai repris un abo salle à 40 €/mois 💪" },
  {
    id: '4',
    from: 'karl',
    text: "4ᵉ abo « cette fois je m'y mets ». 😏\nÇa fait 3 mois que tu paies l'ancien sans y aller. On annule celui-là avant, non ?",
  },
  { id: '5', from: 'user', text: '3 UberEats cette semaine 🙈' },
  {
    id: '6',
    from: 'karl',
    text: "3 UberEats = 47 balles = un plein de courses. 🛒\nTon budget sorties est à 80 % et on est le 12. La souris, on la lâche.",
  },
];

const SUGGESTIONS_FREELANCE = ['Je peux me payer combien ?', 'Simule +500 €'];
const SUGGESTIONS_PERSO = ['Il me reste combien ?', 'Mes plus grosses dépenses ?'];

function renderText(text: string, fromUser: boolean) {
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

function Bubble({ msg, accent }: { msg: Message; accent: string }) {
  const isKarl = msg.from === 'karl';
  return (
    <View style={[styles.bubble, isKarl ? styles.bubbleKarl : [styles.bubbleUser, { backgroundColor: accent }]]}>
      <Text
        style={[
          styles.bubbleText,
          isKarl
            ? styles.bubbleTextKarl
            : [styles.bubbleTextUser, { color: C.dark }],
        ]}
      >
        {renderText(msg.text, !isKarl)}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { profile } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;
  const messages = profile === 'perso' ? MOCK_PERSO : MOCK_FREELANCE;
  const suggestions = profile === 'perso' ? SUGGESTIONS_PERSO : SUGGESTIONS_FREELANCE;
  const dateLabel = profile === 'perso' ? 'Le 27 · jour de paie' : "Aujourd'hui";

  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Message[]>(messages);
  const listRef = useRef<FlatList>(null);

  function send() {
    if (!text.trim()) return;
    const newMsg: Message = { id: String(Date.now()), from: 'user', text };
    setMsgs((prev) => [...prev, newMsg]);
    setText('');
    setTimeout(() => {
      const reply: Message = {
        id: String(Date.now() + 1),
        from: 'karl',
        text: '…je réfléchis 🤔',
      };
      setMsgs((prev) => [...prev, reply]);
    }, 800);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderLeft}>
          <KarlMascot size={40} color={accent} />
          <View>
            <Text style={styles.karlName}>Karl</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <Text style={styles.statusText}>cash mais bienveillant</Text>
            </View>
          </View>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>···</Text>
        </View>
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
            <Text style={styles.dateLabel}>{dateLabel}</Text>
          }
          renderItem={({ item }) => <Bubble msg={item} accent={accent} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input area */}
        <View style={styles.inputArea}>
          <View style={styles.suggestionsRow}>
            {suggestions.map((s) => (
              <Pressable key={s} style={styles.suggestionPill} onPress={() => setText(s)}>
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
            />
            <Pressable
              style={[styles.sendBtn, { backgroundColor: accent }]}
              onPress={send}
            >
              <Text style={styles.sendArrow}>↑</Text>
            </Pressable>
          </View>
          <Text style={styles.legal}>Karl peut se tromper · ce n'est pas un conseil réglementé</Text>
        </View>
      </KeyboardAvoidingView>
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
  pillText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.text,
  },

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
    // backgroundColor applied inline with accent color
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextKarl: {
    fontFamily: 'Sora_400Regular',
    color: C.text,
  },
  bubbleTextUser: {
    fontFamily: 'Sora_600SemiBold',
    color: C.dark,
  },

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
  sendArrow: {
    fontSize: 19,
    color: C.dark,
    fontFamily: 'Sora_700Bold',
  },
  legal: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
  },
});
