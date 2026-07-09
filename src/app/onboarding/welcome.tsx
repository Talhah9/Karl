import { router } from 'expo-router';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const COPY = {
  freelance: {
    body: "Je calcule ce que tu peux vraiment te payer et je mets tes charges de côté. Fini le stress avant chaque échéance.",
    accent: C.lime,
  },
  perso: {
    body: "Je suis ton budget au jour le jour et je te dis ce qu'il te reste vraiment pour finir le mois sans te prendre la tête.",
    accent: C.purple,
  },
};

export default function WelcomeScreen() {
  const { profile } = useApp();
  const copy = COPY[profile ?? 'freelance'];
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -9,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {/* Centre — Karl flottant + texte */}
        <View style={styles.heroWrap}>
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <KarlMascot size={96} color={copy.accent} />
          </Animated.View>
          <View style={styles.textBlock}>
            <Text style={styles.title}>Salut.{'\n'}Moi c'est Karl.</Text>
            <Text style={styles.body}>{copy.body}</Text>
          </View>
        </View>

        {/* Bas — dots + CTA */}
        <View style={styles.footer}>
          <OnboardingDots total={3} current={1} />
          <Button
            onPress={() => router.push('/onboarding/how-it-works')}
            accentColor={copy.accent}
          >
            Ça m'intéresse
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 27,
    color: C.text,
    letterSpacing: -1,
    lineHeight: 28,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.text,
    textAlign: 'center',
    maxWidth: 230,
  },
  bold: {
    fontFamily: 'Sora_700Bold',
  },
  footer: {
    gap: 18,
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
