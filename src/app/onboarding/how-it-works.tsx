import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const FEATURES_FREELANCE = [
  {
    ring: true,
    title: 'Je mets tes charges de côté',
    desc: "Avant que tu les dépenses. L'URSSAF ne te surprendra plus jamais.",
  },
  {
    icon: '€',
    title: 'Je te dis combien te verser',
    desc: 'Un montant que tu peux prendre sans culpabiliser, à chaque encaissement.',
  },
  {
    karl: true,
    title: 'Zéro jargon',
    desc: 'Je parle comme un pote qui a fait de la compta. Pas comme ta banque.',
  },
];

const FEATURES_PERSO = [
  {
    icon: '📅',
    title: 'Je suis ton budget au jour le jour',
    desc: "Tu sais toujours ce qu'il te reste vraiment, pas juste ce qui est sur le compte.",
  },
  {
    icon: '🎯',
    title: 'Tes objectifs, pas juste tes dettes',
    desc: "Vacances, épargne, gros achat — je t'aide à y arriver sans te serrer la ceinture en permanence.",
  },
  {
    karl: true,
    title: 'Zéro jargon',
    desc: 'Je parle comme un pote. Pas de tableau, pas de comptabilité — juste ce que tu dois savoir.',
  },
];

export default function HowItWorksScreen() {
  const { profile } = useApp();
  const isPerso = profile === 'perso';
  const features = isPerso ? FEATURES_PERSO : FEATURES_FREELANCE;
  const accent = isPerso ? C.purple : C.lime;

  function handleContinue() {
    if (profile === 'perso') {
      router.push('/onboarding/perso/salary');
    } else {
      router.push('/onboarding/freelance/status');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Voilà le deal.</Text>
          <View style={styles.cards}>
            {features.map((f, i) => (
              <Card key={i} style={styles.featureCard}>
                <View style={styles.featureRow}>
                  {f.ring && (
                    <View style={[styles.iconRing, { backgroundColor: accent }]}>
                      <Text style={styles.iconRingText}>%</Text>
                    </View>
                  )}
                  {f.icon && (
                    <View style={styles.iconBox}>
                      <Text style={styles.iconBoxText}>{f.icon}</Text>
                    </View>
                  )}
                  {f.karl && <KarlMascot size={38} color={accent} />}
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={3} current={2} />
          <Button onPress={handleContinue} accentColor={accent}>
            C'est parti
          </Button>
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
  },
  scroll: { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 16 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 23,
    color: C.text,
    letterSpacing: -0.8,
  },
  cards: { gap: 10 },
  featureCard: { paddingVertical: 14, paddingHorizontal: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  iconRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconRingText: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 14,
    color: C.dark,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBoxText: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20,
    color: C.purple,
  },
  featureText: { flex: 1, gap: 3 },
  featureTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: C.text,
  },
  featureDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: C.muted,
  },
  footer: { gap: 18 },
});
