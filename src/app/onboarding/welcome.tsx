import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    title: 'Bienvenue\nsur Karl.',
    body: "Ton coach financier personnel.\nClair, direct, sans jargon.",
    visual: 'karl-happy',
  },
  {
    key: '2',
    title: 'Tes données\nsont sécurisées.',
    body: "Rien n'est partagé, rien n'est revendu.\nTes finances restent tes affaires.",
    visual: 'lock',
  },
  {
    key: '3',
    title: "Un coach qui\ns'adapte à toi.",
    body: "Entrepreneur ou salarié — Karl ajuste\nses conseils à ta situation réelle.",
    visual: 'karl-smug',
  },
];

function Slide({ item }: { item: (typeof SLIDES)[number] }) {
  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      <View style={styles.visual}>
        {item.visual === 'lock' ? (
          <View style={styles.lockWrap}>
            <Text style={styles.lockEmoji}>🔒</Text>
          </View>
        ) : (
          <KarlMascot size={108} smug={item.visual === 'karl-smug'} />
        )}
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList>(null);

  function handleScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== current) setCurrent(idx);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {/* Carrousel */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          renderItem={({ item }) => <Slide item={item} />}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          style={styles.flatList}
        />

        {/* Footer */}
        <View style={styles.footer}>
          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === current && styles.dotActive]}
              />
            ))}
          </View>

          <Button onPress={() => router.push('/onboarding/goals')}>
            Continuer
          </Button>

          <Text style={styles.legal}>
            Karl est un coach, pas un conseiller{'\n'}financier réglementé.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingBottom: 22 },
  flatList: { flex: 1 },

  slide: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
  },
  visual: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  lockWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(196,245,66,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(196,245,66,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: { fontSize: 52 },

  textBlock: { alignItems: 'center', gap: 14 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 30,
    color: C.text,
    letterSpacing: -1.2,
    lineHeight: 34,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14.5,
    lineHeight: 22,
    color: C.muted,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: 24,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 4,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    width: 22,
    backgroundColor: C.lime,
  },
  legal: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.2,
  },
});
