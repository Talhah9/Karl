import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

// ─── Simple bar chart ─────────────────────────────────────────────────────────
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
                height: `${b.pct * 100}%`,
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

// ─── Freelance ────────────────────────────────────────────────────────────────
function FreelanceProjection() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 3 }}>
        <Text style={styles.mono}>Ta trajectoire</Text>
        <Text style={styles.title}>Si tu continues comme ça…</Text>
      </View>

      <Card variant="hero" style={{ gap: 2 }}>
        <Text style={styles.heroMono}>Dans 3 mois, de côté</Text>
        <Text style={styles.heroAmount}>4 260 €</Text>
        <Text style={styles.heroSub}>de quoi encaisser T3 les doigts dans le nez</Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={styles.legendRow}>
          <Text style={styles.mono}>Épargne cumulée</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.lime }]} />
              <Text style={styles.legendText}>Actuel</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.warm }]} />
              <Text style={styles.legendText}>Mois creux</Text>
            </View>
          </View>
        </View>
        <BarChart
          bars={[
            { label: 'Août', pct: 0.38, color: C.lime },
            { label: 'Sept', pct: 0.64, color: C.lime },
            { label: 'Oct', pct: 0.92, color: C.lime },
          ]}
        />
      </Card>

      <Card
        style={{
          backgroundColor: 'rgba(255,122,77,0.10)',
          borderColor: 'rgba(255,122,77,0.28)',
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <KarlMascot size={34} color={C.warm} />
        <Text style={styles.karlText}>
          Si tu passes un mois creux (−30 %), il te{' '}
          <Text style={styles.warm}>manquera 480 €</Text> pour l'URSSAF de T3. On anticipe maintenant ?
        </Text>
      </Card>

      <View style={styles.field}>
        <View>
          <Text style={styles.fieldVal}>Objectif conseillé</Text>
          <Text style={styles.fieldSub}>pour finir l'année serein</Text>
        </View>
        <Text style={styles.fieldAmount}>
          850 €<Text style={styles.fieldAmountUnit}>/mois</Text>
        </Text>
      </View>

      <Text style={styles.legal}>Estimation basée sur tes 3 derniers mois · pas une boule de cristal 🔮</Text>
      <Button variant="ghost">Ajuster mon objectif</Button>
    </ScrollView>
  );
}

// ─── Perso ────────────────────────────────────────────────────────────────────
function PersoProjection() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 3 }}>
        <Text style={styles.mono}>Ta fin de mois</Text>
        <Text style={styles.title}>Si tu continues comme ça…</Text>
      </View>

      <Card variant="hero" style={{ gap: 2 }}>
        <Text style={styles.heroMono}>Le 26, il te restera</Text>
        <Text style={styles.heroAmount}>210 €</Text>
        <Text style={styles.heroSub}>de quoi finir le mois tranquille 🙌</Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={styles.legendRow}>
          <Text style={styles.mono}>Reste à vivre par semaine</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.purple }]} />
              <Text style={styles.legendText}>Prévu</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.warm }]} />
              <Text style={styles.legendText}>Réel</Text>
            </View>
          </View>
        </View>
        <BarChart
          bars={[
            { label: 'S1', pct: 0.7, color: C.purple },
            { label: 'S2', pct: 0.92, color: C.warm },
            { label: 'S3', pct: 0.55, color: C.purple, opacity: 0.5 },
            { label: 'S4', pct: 0.4, color: C.purple, opacity: 0.5 },
          ]}
        />
      </Card>

      <Card
        style={{
          backgroundColor: 'rgba(255,122,77,0.10)',
          borderColor: 'rgba(255,122,77,0.28)',
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <KarlMascot size={34} color={C.warm} />
        <Text style={styles.karlText}>
          Au rythme de la semaine 2, tu finis{' '}
          <Text style={styles.warm}>−120 €</Text> dans le rouge. Cale 30 €/semaine sur les sorties et c'est bon.
        </Text>
      </Card>

      <View style={styles.field}>
        <View>
          <Text style={styles.fieldVal}>Épargne conseillée</Text>
          <Text style={styles.fieldSub}>pour ton objectif vacances</Text>
        </View>
        <Text style={[styles.fieldAmount, { color: C.purple }]}>
          200 €<Text style={styles.fieldAmountUnit}>/mois</Text>
        </Text>
      </View>

      <Text style={styles.legal}>Estimation basée sur tes 3 derniers mois · pas une boule de cristal 🔮</Text>
      <Button variant="ghost">Ajuster mon budget</Button>
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
  legend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontFamily: 'Sora_400Regular', fontSize: 10, color: C.text },

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
  warm: { fontFamily: 'Sora_700Bold', color: C.warm },

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
    color: C.lime,
    letterSpacing: -0.5,
  },
  fieldAmountUnit: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted },

  legal: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
  },
});
