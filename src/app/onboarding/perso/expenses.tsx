import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const PRESETS = [
  { label: 'Loyer', emoji: '🏠', suggested: 700 },
  { label: 'Abonnements', emoji: '📱', suggested: 80 },
  { label: 'Transport', emoji: '🚇', suggested: 90 },
  { label: 'Assurances', emoji: '🛡️', suggested: 50 },
];

export default function ExpensesScreen() {
  const { persoSetup, setPersoSetup, completeOnboarding } = useApp();
  const [fixed, setFixed] = useState(persoSetup.fixedExpenses);

  const remaining = persoSetup.netSalary - fixed;

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
            <Text style={styles.title}>Tes dépenses fixes</Text>
            <Text style={styles.sub}>
              Loyer, abos, transport… Ce qui sort chaque mois automatiquement.
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total mensuel</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.amountInput}
                value={String(fixed)}
                onChangeText={(t) => setFixed(Number(t.replace(/\D/g, '')) || 0)}
                keyboardType="number-pad"
                selectionColor={C.purple}
              />
              <Text style={styles.currency}>€</Text>
            </View>
          </View>

          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <View key={p.label} style={styles.presetRow}>
                <Text style={styles.presetEmoji}>{p.emoji}</Text>
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={styles.presetAmount}>≈ {p.suggested} €</Text>
              </View>
            ))}
          </View>

          <Card style={styles.karlCard}>
            <View style={styles.karlRow}>
              <KarlMascot size={34} color={C.purple} />
              <Text style={styles.karlText}>
                Avec {fixed} € de fixes, il te resterait{' '}
                <Text style={styles.purp}>{remaining > 0 ? remaining : 0} €</Text> à
                dépenser librement chaque mois.
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={3} current={2} />
          <Button
            onPress={() => {
              setPersoSetup({ fixedExpenses: fixed });
              completeOnboarding();
              router.replace('/(tabs)');
            }}
            accentColor={C.purple}
          >
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
  scrollContent: { gap: 18, paddingBottom: 16 },
  header: { gap: 8 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.8,
  },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  amountRow: {
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  amountLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  inputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  amountInput: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 42,
    color: C.purple,
    letterSpacing: -1.5,
    minWidth: 100,
    textAlign: 'right',
  },
  currency: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 28,
    color: C.purple,
  },
  presets: {
    gap: 10,
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 14,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  presetEmoji: { fontSize: 16 },
  presetLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.text,
    flex: 1,
  },
  presetAmount: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: C.muted,
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
  purp: { fontFamily: 'Sora_700Bold', color: C.purple },
  footer: { gap: 18 },
});
