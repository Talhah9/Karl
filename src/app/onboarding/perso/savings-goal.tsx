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
import { useChargesFixes } from '@/hooks/useChargesFixes';
import { useObjectifEpargne } from '@/hooks/useObjectifEpargne';

function fmt(n: number) {
  return n.toLocaleString('fr-FR');
}

export default function SavingsGoalScreen() {
  const { persoSetup, completeOnboarding } = useApp();
  const { total: chargesTotal, loading: chargesLoading } = useChargesFixes();
  const { save: saveGoal } = useObjectifEpargne();

  const salary = persoSetup.netSalary;
  const reste = salary - chargesTotal;

  const [goalText, setGoalText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const goal = parseFloat(goalText.replace(',', '.'));
  const hasInput = goalText.trim().length > 0;
  const isValid = !isNaN(goal) && goal >= 0 && (chargesLoading || goal < reste);

  async function handleContinue() {
    if (!hasInput) {
      completeOnboarding();
      router.replace('/(tabs)');
      return;
    }

    const g = parseFloat(goalText.replace(',', '.'));
    if (isNaN(g) || g < 0) return;

    if (!chargesLoading && g > 0 && g >= reste) {
      if (reste <= 0) {
        setError(
          `Tes charges fixes (${fmt(chargesTotal)} €) dépassent ton salaire (${fmt(salary)} €). Reviens en arrière et ajuste tes charges avant de fixer un objectif d'épargne.`
        );
      } else {
        setError(
          `Avec ${fmt(chargesTotal)} € de charges sur ${fmt(salary)} € de salaire, il te reste ${fmt(reste)} €. Vise en dessous de ce montant — ou regarde si certaines charges peuvent être réduites.`
        );
      }
      return;
    }

    setSaving(true);
    if (g > 0) {
      await saveGoal({ label: 'Épargne mensuelle', montant_cible: g, montant_actuel: 0 });
    }
    completeOnboarding();
    router.replace('/(tabs)');
  }

  const remainingAfterGoal = isValid && hasInput && !isNaN(goal) ? reste - goal : reste;
  const showKarlPositive = hasInput && isValid && !isNaN(goal) && goal > 0;

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
            <Text style={styles.title}>Tu veux mettre{'\n'}combien de côté ?</Text>
            <Text style={styles.sub}>Par mois. Tu peux toujours ajuster plus tard.</Text>
          </View>

          {/* Récapitulatif budget */}
          {!chargesLoading && (
            <View style={styles.recapBlock}>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Salaire net</Text>
                <Text style={styles.recapValue}>{fmt(salary)} €</Text>
              </View>
              <View style={[styles.recapRow, styles.recapBorder]}>
                <Text style={styles.recapLabel}>Charges fixes</Text>
                <Text style={[styles.recapValue, { color: C.warm }]}>
                  − {fmt(chargesTotal)} €
                </Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapTotalLabel}>Reste disponible</Text>
                <Text style={[styles.recapTotalValue, { color: C.purple }]}>
                  {fmt(reste)} €
                </Text>
              </View>
            </View>
          )}

          {/* Saisie objectif */}
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Épargne mensuelle</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.goalInput}
                placeholder="0"
                placeholderTextColor={C.muted}
                value={goalText}
                onChangeText={(t) => {
                  setGoalText(t.replace(/[^0-9.,]/g, ''));
                  setError('');
                }}
                keyboardType="numeric"
                selectTextOnFocus
                maxLength={6}
              />
              <Text style={styles.inputUnit}>€ / mois</Text>
            </View>
          </View>

          {/* Message d'erreur Karl */}
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorEmoji}>🤔</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Card style={styles.karlCard}>
            <View style={styles.karlRow}>
              <KarlMascot size={34} color={C.purple} />
              <Text style={styles.karlText}>
                {showKarlPositive
                  ? `Parfait. ${fmt(goal)} € de côté par mois, il te reste `
                  : 'Zéro, c\'est ok. Mais même 50 € par mois, ça fait 600 € sur un an. '}
                {showKarlPositive && (
                  <Text style={styles.purp}>{fmt(remainingAfterGoal)} €</Text>
                )}
                {showKarlPositive ? ' pour vivre librement. 💜' : ''}
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={4} current={3} />
          <Button
            onPress={handleContinue}
            loading={saving}
            accentColor={C.purple}
          >
            {hasInput ? "C'est parti" : 'Passer'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 22 },
  scroll: { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 16 },

  header: { gap: 8 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.8,
  },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },

  recapBlock: {
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 0,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  recapBorder: {
    borderTopWidth: 1,
    borderTopColor: C.line,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  recapLabel: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  recapValue: { fontFamily: 'Sora_700Bold', fontSize: 14, color: C.text },
  recapTotalLabel: { fontFamily: 'Sora_700Bold', fontSize: 13, color: C.text },
  recapTotalValue: { fontFamily: 'Sora_800ExtraBold', fontSize: 17, letterSpacing: -0.4 },

  inputBlock: {
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  inputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  goalInput: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 38,
    color: C.purple,
    letterSpacing: -1,
    lineHeight: 44,
    padding: 0,
    minWidth: 60,
  },
  inputUnit: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: C.muted },

  errorCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255,122,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,77,0.3)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  errorEmoji: { fontSize: 18 },
  errorText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
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
