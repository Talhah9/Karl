import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [inputText, setInputText] = useState(String(persoSetup.netSalary));

  function handleSlider(v: number) {
    setSalary(v);
    setInputText(String(v));
  }

  function handleTextChange(t: string) {
    const digits = t.replace(/[^0-9]/g, '');
    setInputText(digits);
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n >= 0 && n <= 6000) setSalary(n);
  }

  function handleTextBlur() {
    const n = parseInt(inputText, 10);
    const clamped = isNaN(n) ? salary : Math.max(0, Math.min(6000, n));
    setSalary(clamped);
    setInputText(String(clamped));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Ton salaire net,{'\n'}c'est combien ?</Text>
            <Text style={styles.sub}>Ce qui tombe vraiment sur ton compte chaque mois.</Text>
          </View>

          <View style={styles.sliderBlock}>
            <Text style={styles.bigAmount}>{fmt(salary)}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.manualInput}
                value={inputText}
                onChangeText={handleTextChange}
                onBlur={handleTextBlur}
                keyboardType="numeric"
                selectTextOnFocus
                maxLength={4}
                placeholderTextColor={C.muted}
              />
              <Text style={styles.inputUnit}>€</Text>
            </View>
            <View style={styles.sliderWrap}>
              <Slider
                style={{ width: '100%', height: 30 }}
                minimumValue={0}
                maximumValue={6000}
                step={50}
                value={salary}
                onValueChange={handleSlider}
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
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={4} current={0} />
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 4,
  },
  manualInput: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: C.text,
    minWidth: 60,
    textAlign: 'right',
    padding: 0,
  },
  inputUnit: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: C.purple,
  },
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
