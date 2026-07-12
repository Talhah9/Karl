import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useChargesFixes } from '@/hooks/useChargesFixes';
import { useObjectifEpargne } from '@/hooks/useObjectifEpargne';

function fmt(n: number) {
  return n.toLocaleString('fr-FR');
}

export default function EditSavingsGoalScreen() {
  const { persoSetup } = useApp();
  const { total: chargesTotal, loading: chargesLoading } = useChargesFixes();
  const { goal, save: saveGoal } = useObjectifEpargne();

  const salary = persoSetup.netSalary;
  const reste = salary - chargesTotal;

  const [goalText, setGoalText] = useState(goal ? String(goal.montant_cible) : '');
  const [labelText, setLabelText] = useState(goal?.label ?? 'Épargne mensuelle');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const goalAmount = parseFloat(goalText.replace(',', '.'));
  const hasInput = goalText.trim().length > 0;
  const isValid = !isNaN(goalAmount) && goalAmount >= 0 && (chargesLoading || goalAmount < reste);
  const remainingAfterGoal = isValid && hasInput && !isNaN(goalAmount) ? reste - goalAmount : reste;
  const showKarlPositive = hasInput && isValid && !isNaN(goalAmount) && goalAmount > 0;

  async function handleSave() {
    if (!hasInput) {
      router.back();
      return;
    }

    const g = parseFloat(goalText.replace(',', '.'));
    if (isNaN(g) || g < 0) return;

    if (!chargesLoading && g > 0 && g >= reste) {
      if (reste <= 0) {
        setError(`Tes charges (${fmt(chargesTotal)} €) dépassent ton salaire (${fmt(salary)} €). Ajuste tes charges d'abord.`);
      } else {
        setError(`Il te reste ${fmt(reste)} € après charges. Vise en dessous.`);
      }
      return;
    }

    setSaving(true);
    await saveGoal({
      label: labelText.trim() || 'Épargne mensuelle',
      montant_cible: g,
      montant_actuel: goal?.montant_actuel ?? 0,
    });
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.nav}>
          <View style={{ width: 24 }} />
          <Text style={styles.navTitle}>Objectif d'épargne</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.navClose}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Combien mettre de côté ?</Text>
            <Text style={styles.sub}>Par mois. Tu peux ajuster à tout moment.</Text>
          </View>

          {!chargesLoading && (
            <View style={styles.recapBlock}>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Salaire net</Text>
                <Text style={styles.recapValue}>{fmt(salary)} €</Text>
              </View>
              <View style={[styles.recapRow, styles.recapBorder]}>
                <Text style={styles.recapLabel}>Charges fixes</Text>
                <Text style={[styles.recapValue, { color: C.warm }]}>− {fmt(chargesTotal)} €</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapTotalLabel}>Reste disponible</Text>
                <Text style={[styles.recapTotalValue, { color: C.purple }]}>{fmt(reste)} €</Text>
              </View>
            </View>
          )}

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Nom de l'objectif</Text>
            <TextInput
              style={styles.labelInput}
              value={labelText}
              onChangeText={setLabelText}
              placeholder="Épargne mensuelle"
              placeholderTextColor={C.muted}
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Montant mensuel</Text>
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
                  ? `Parfait. ${fmt(goalAmount)} € de côté, il te reste `
                  : 'Zéro, c\'est ok. Mais même 50 € par mois = 600 € sur un an. '}
                {showKarlPositive && (
                  <Text style={styles.purp}>{fmt(remainingAfterGoal)} €</Text>
                )}
                {showKarlPositive ? ' pour dépenser librement. 💜' : ''}
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button onPress={handleSave} loading={saving} accentColor={C.purple}>
            {hasInput ? 'Enregistrer' : 'Passer'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.text },
  navClose: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },
  scroll: { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 16 },
  header: { gap: 8 },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: C.text, letterSpacing: -0.8 },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  recapBlock: {
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  labelInput: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 15,
    color: C.text,
    padding: 0,
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
  errorText: { fontFamily: 'Sora_400Regular', fontSize: 12.5, lineHeight: 18, color: C.text, flex: 1 },
  karlCard: { backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.25)' },
  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: { fontFamily: 'Sora_400Regular', fontSize: 12.5, lineHeight: 18, color: C.text, flex: 1 },
  purp: { fontFamily: 'Sora_700Bold', color: C.purple },
  footer: { gap: 18 },
});
