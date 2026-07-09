import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Slider } from '@/components/ui/Slider';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { C, getChargeRate } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function fmt(n: number) {
  return n.toLocaleString('fr-FR') + ' €';
}

export default function RevenueScreen() {
  const { freelanceSetup, setFreelanceSetup } = useApp();
  const [revenue, setRevenue] = useState(freelanceSetup.monthlyRevenue);

  const rate = getChargeRate(
    freelanceSetup.status,
    freelanceSetup.versementLiberatoire,
    freelanceSetup.acre
  );
  const charges = Math.round(revenue * rate);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Tu encaisses combien{'\n'}par mois ?</Text>
            <Text style={styles.sub}>
              En moyenne. Pas besoin d'être précis, on ajustera avec tes vrais chiffres.
            </Text>
          </View>

          <View style={styles.sliderBlock}>
            <Text style={styles.bigAmount}>{fmt(revenue)}</Text>
            <View style={styles.sliderWrap}>
              <Slider
                style={{ width: '100%', height: 30 }}
                minimumValue={0}
                maximumValue={10000}
                step={100}
                value={revenue}
                onValueChange={setRevenue}
                minimumTrackTintColor={C.lime}
                maximumTrackTintColor="rgba(255,255,255,0.10)"
                thumbTintColor={C.lime}
              />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0 €</Text>
              <Text style={styles.sliderLabel}>10 000 €+</Text>
            </View>
          </View>

          <Card style={styles.karlCard}>
            <View style={styles.karlRow}>
              <KarlMascot size={34} />
              <Text style={styles.karlText}>
                Ok. À ce rythme, je te réserverais{' '}
                <Text style={styles.lime}>≈ {fmt(charges)}/mois</Text> de
                charges. On verra ça ensemble.
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={3} current={1} />
          <Button
            onPress={() => {
              setFreelanceSetup({ monthlyRevenue: revenue });
              router.push('/onboarding/freelance/charges');
            }}
          >
            Suivant
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
  scrollContent: { gap: 22, paddingBottom: 16 },
  header: { gap: 8 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.8,
  },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  sliderBlock: { alignItems: 'center', gap: 10, marginTop: 6 },
  bigAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 42,
    color: C.lime,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  sliderWrap: { width: '100%', paddingHorizontal: 4 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sliderLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  karlCard: {
    backgroundColor: 'rgba(196,245,66,0.06)',
    borderColor: 'rgba(196,245,66,0.2)',
  },
  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
  },
  lime: { fontFamily: 'Sora_700Bold', color: C.lime },
  footer: { gap: 18 },
});
