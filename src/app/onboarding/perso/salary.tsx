import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Slider } from '@/components/ui/Slider';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function fmt(n: number) {
  return n.toLocaleString('fr-FR') + ' €';
}

export default function SalaryScreen() {
  const { persoSetup, setPersoSetup } = useApp();
  const [salary, setSalary] = useState(persoSetup.netSalary);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.top}>
          <View style={styles.header}>
            <Text style={styles.title}>Ton salaire net,{'\n'}c'est combien ?</Text>
            <Text style={styles.sub}>Ce qui tombe vraiment sur ton compte chaque mois.</Text>
          </View>

          <View style={styles.sliderBlock}>
            <Text style={styles.bigAmount}>{fmt(salary)}</Text>
            <View style={styles.sliderWrap}>
              <Slider
                style={{ width: '100%', height: 30 }}
                minimumValue={0}
                maximumValue={6000}
                step={50}
                value={salary}
                onValueChange={setSalary}
                minimumTrackTintColor={C.purple}
                maximumTrackTintColor="rgba(255,255,255,0.10)"
                thumbTintColor={C.purple}
              />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0 €</Text>
              <Text style={styles.sliderLabel}>6 000 €+</Text>
            </View>
          </View>

          <Card style={styles.karlCard}>
            <View style={styles.karlRow}>
              <KarlMascot size={34} color={C.purple} />
              <Text style={styles.karlText}>
                Ok. Je vais suivre ça de près pour qu'il t'en reste à la fin du mois. 💜
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.footer}>
          <OnboardingDots total={3} current={0} />
          <Button
            onPress={() => {
              setPersoSetup({ netSalary: salary });
              router.push('/onboarding/perso/payday');
            }}
            accentColor={C.purple}
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
    justifyContent: 'space-between',
  },
  top: { gap: 22 },
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
    color: C.purple,
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
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.25)',
  },
  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
  },
  footer: { gap: 18 },
});
