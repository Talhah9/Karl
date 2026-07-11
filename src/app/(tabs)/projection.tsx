import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useProjectionPerso, type WeekData } from '@/hooks/useProjectionPerso';

// ─── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({
  bars,
  height = 120,
}: {
  bars: { label: string; pct: number; color: string; opacity?: number }[];
  height?: number;
}) {
  return (
    <View style={[styles.chartRow, { height }]}>
      {bars.map((b) => (
        <View key={b.label} style={styles.chartCol}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View
              style={{
                height: `${Math.max(b.pct * 100, 2)}%`,
                backgroundColor: b.color,
                borderRadius: 7,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
                opacity: b.opacity ?? 1,
              }}
            />
          </View>
          <Text style={styles.chartLabel}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Freelance (still projections — bank data pending) ────────────────────────
function FreelanceProjection() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 3 }}>
        <Text style={styles.mono}>Ta trajectoire</Text>
        <Text style={styles.title}>Si tu continues comme ça…</Text>
      </View>

      <Card variant="hero" style={{ gap: 2 }}>
        <Text style={styles.heroMono}>Dans 3 mois, de côté</Text>
        <Text style={styles.heroAmount}>— €</Text>
        <Text style={styles.heroSub}>connecte ton compte pour activer les projections</Text>
      </Card>

      <Card
        style={{
          backgroundColor: 'rgba(196,245,66,0.06)',
          borderColor: 'rgba(196,245,66,0.22)',
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <KarlMascot size={34} color={C.lime} />
        <Text style={styles.karlText}>
          Les projections freelance arrivent avec la connexion bancaire.{' '}
          <Text style={{ fontFamily: 'Sora_700Bold', color: C.lime }}>Bientôt disponible.</Text>
        </Text>
      </Card>

      <Text style={styles.legal}>Estimation basée sur tes 3 derniers mois · pas une boule de cristal 🔮</Text>
    </ScrollView>
  );
}

// ─── Perso ────────────────────────────────────────────────────────────────────
function PersoProjection() {
  const { data, loading, refresh } = useProjectionPerso();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (loading || !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.purple} />
      </View>
    );
  }

  const {
    budgetEnvelope,
    totalDepenses,
    paydayLabel,
    projectedRemaining,
    projectedMonthSpending,
    savingsGoal,
    savingsGoalLabel,
    weeks,
    weeklyBudget,
    daysElapsed,
    exceptionnellesTotal,
    exceptionnellesCount,
  } = data;

  const hasData = totalDepenses > 0;

  // Projected hero text
  const projectedRemainingRounded = Math.round(projectedRemaining);
  const heroAmount = hasData
    ? `${projectedRemainingRounded.toLocaleString('fr-FR')} €`
    : '— €';
  const heroSub = hasData
    ? projectedRemainingRounded >= 0
      ? `de quoi finir le mois tranquille 🙌`
      : `attention, trajectoire déficitaire ⚠️`
    : 'enregistre des dépenses pour voir ta projection';

  // Karl insight
  const karlText = (() => {
    if (!hasData) return "Dis-moi ce que tu dépenses et je te dirai comment tu termines le mois.";
    if (projectedRemaining < 0) {
      const deficit = Math.abs(Math.round(projectedRemaining));
      const adjust = Math.round(deficit / Math.max(1, data.daysInMonth - daysElapsed));
      return `Au rythme actuel, tu finis ${deficit.toLocaleString('fr-FR')} € dans le rouge. Réduis d'environ ${adjust} €/jour les prochains jours pour équilibrer.`;
    }
    if (projectedRemaining < budgetEnvelope * 0.1) {
      return `C'est serré — il te reste ~${Math.round(projectedRemaining).toLocaleString('fr-FR')} € de marge. Surveille les petites dépenses d'ici ${paydayLabel}.`;
    }
    return `Sur ta lancée, il te restera ~${Math.round(projectedRemaining).toLocaleString('fr-FR')} € fin de mois. Bien joué. 💪`;
  })();

  const isKarlWarn = projectedRemaining < budgetEnvelope * 0.1;

  // Bar chart data: actual weeks + projected future weeks
  const barData = weeks.map((w: WeekData) => {
    if (w.isFuture) {
      // Project: spend at the same rate as elapsed days
      const projectedWeekSpending = weeklyBudget * 0.85; // conservative estimate
      const projectedPct = weeklyBudget > 0 ? projectedWeekSpending / weeklyBudget : 0;
      return {
        label: w.label,
        pct: Math.min(projectedPct, 1),
        color: C.purple,
        opacity: 0.35,
      };
    }
    return {
      label: w.label,
      pct: w.pct,
      color: w.isOverBudget ? C.warm : C.purple,
      opacity: 1,
    };
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 3 }}>
        <Text style={styles.mono}>Ta fin de mois</Text>
        <Text style={styles.title}>Si tu continues comme ça…</Text>
      </View>

      <Card variant="hero" style={{ gap: 2 }}>
        <Text style={styles.heroMono}>{paydayLabel.charAt(0).toUpperCase() + paydayLabel.slice(1)}, il te restera</Text>
        <Text style={[styles.heroAmount, !hasData && { color: C.dark, opacity: 0.4 }]}>{heroAmount}</Text>
        <Text style={styles.heroSub}>{heroSub}</Text>
      </Card>

      {hasData && (
        <Card style={{ gap: 12 }}>
          <View style={styles.legendRow}>
            <Text style={styles.mono}>Reste à vivre par semaine</Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: C.purple }]} />
                <Text style={styles.legendText}>Réel</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: C.warm }]} />
                <Text style={styles.legendText}>Dépassé</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: C.purple, opacity: 0.35 }]} />
                <Text style={styles.legendText}>Projeté</Text>
              </View>
            </View>
          </View>
          <BarChart bars={barData} />
          <Text style={[styles.chartSub]}>
            Budget semaine : {Math.round(weeklyBudget).toLocaleString('fr-FR')} €
          </Text>
        </Card>
      )}

      <Card
        style={{
          backgroundColor: isKarlWarn
            ? 'rgba(255,122,77,0.10)'
            : 'rgba(167,139,250,0.07)',
          borderColor: isKarlWarn
            ? 'rgba(255,122,77,0.28)'
            : 'rgba(167,139,250,0.22)',
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <KarlMascot size={34} color={isKarlWarn ? C.warm : C.purple} />
        <Text style={styles.karlText}>{karlText}</Text>
      </Card>

      {savingsGoal > 0 && (
        <View style={styles.field}>
          <View>
            <Text style={styles.fieldVal}>Objectif d'épargne</Text>
            <Text style={styles.fieldSub}>{savingsGoalLabel}</Text>
          </View>
          <Text style={[styles.fieldAmount, { color: C.purple }]}>
            {savingsGoal.toLocaleString('fr-FR')} €<Text style={styles.fieldAmountUnit}>/mois</Text>
          </Text>
        </View>
      )}

      {exceptionnellesCount > 0 && (
        <View style={styles.exceptNote}>
          <Text style={styles.exceptNoteText}>
            ⚡ {exceptionnellesCount === 1 ? '1 dépense exceptionnelle' : `${exceptionnellesCount} dépenses exceptionnelles`} ({Math.round(exceptionnellesTotal).toLocaleString('fr-FR')} €) exclue{exceptionnellesCount > 1 ? 's' : ''} du calcul de rythme
          </Text>
        </View>
      )}

      <Text style={styles.legal}>Projection linéaire sur {daysElapsed} jour{daysElapsed > 1 ? 's' : ''} · pas une boule de cristal 🔮</Text>
    </ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ProjectionScreen() {
  const { profile } = useApp();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile === 'perso' ? <PersoProjection /> : <FreelanceProjection />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },

  mono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 23,
    color: C.text,
    letterSpacing: -0.8,
  },

  heroMono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: 'rgba(20,18,16,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  heroAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 44,
    color: C.dark,
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  heroSub: { fontFamily: 'Sora_400Regular', fontSize: 12, color: 'rgba(20,18,16,0.7)' },

  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontFamily: 'Sora_400Regular', fontSize: 10, color: C.text },
  chartSub: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  chartRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-end' },
  chartCol: { flex: 1, gap: 6, alignItems: 'center', height: '100%' },
  chartLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
  },

  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
  },

  field: {
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldVal: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: C.text },
  fieldSub: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },
  fieldAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  fieldAmountUnit: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted },

  exceptNote: {
    backgroundColor: 'rgba(255,122,77,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,77,0.22)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exceptNoteText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: C.warm,
    lineHeight: 17,
  },
  legal: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
  },
});
