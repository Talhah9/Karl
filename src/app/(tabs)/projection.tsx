import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { getCatEmoji, getCatLabel } from '@/constants/categories';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = '1m' | '3m' | '6m';
type AnalyseTab = 'sorties' | 'entrees' | 'recurrences';

interface CatGroup {
  categorie: string;
  total: number;
}

const SEGMENT_COLORS = [C.purple, C.lime, C.warm, '#60a5fa', '#34d399', '#f59e0b'];

// ─── Date helpers ──────────────────────────────────────────────────────────────
function getDateRange(period: Period, monthOffset: number): { start: string; end: string; label: string } {
  const now = new Date();
  if (period === '1m') {
    const y = now.getFullYear();
    const m = now.getMonth() - monthOffset;
    const d = new Date(y, m, 1);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
  }
  const months = period === '3m' ? 3 : 6;
  const startD = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const start = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-01`;
  const end = now.toISOString().split('T')[0];
  const label = `${months} derniers mois`;
  return { start, end, label };
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({
  data,
  total,
  size = 180,
}: {
  data: { pct: number; color: string }[];
  total: number;
  size?: number;
}) {
  const strokeWidth = 26;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  let cumLen = 0;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.line} strokeWidth={strokeWidth} />
        {data.length > 0 ? (
          data.map((s, i) => {
            const segLen = s.pct * circ;
            const offset = circ - cumLen;
            cumLen += segLen;
            return (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segLen} ${circ}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.donutAmount}>{total.toLocaleString('fr-FR')}</Text>
        <Text style={styles.donutUnit}>€</Text>
      </View>
    </View>
  );
}

// ─── Category list ────────────────────────────────────────────────────────────
function CatList({
  groups,
  total,
  accent,
  empty,
}: {
  groups: CatGroup[];
  total: number;
  accent: string;
  empty: string;
}) {
  if (groups.length === 0) {
    return (
      <Card>
        <Text style={styles.emptyText}>{empty}</Text>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }}>
      {groups.map((g, i) => {
        const pct = total > 0 ? g.total / total : 0;
        const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        return (
          <View
            key={g.categorie}
            style={[styles.catRow, i < groups.length - 1 && styles.catRowBorder]}
          >
            <View style={[styles.catDot, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.catLabel}>
                {getCatEmoji(g.categorie)} {getCatLabel(g.categorie)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 1 }}>
              <Text style={[styles.catAmount, { color }]}>
                {g.total.toLocaleString('fr-FR')} €
              </Text>
              <Text style={styles.catPct}>{Math.round(pct * 100)} %</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

// ─── Analyse screen ───────────────────────────────────────────────────────────
function AnalysePerso() {
  const { authReady } = useApp();
  const accent = C.purple;

  const [period, setPeriod] = useState<Period>('1m');
  const [tab, setTab] = useState<AnalyseTab>('sorties');
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [depenses, setDepenses] = useState<CatGroup[]>([]);
  const [revenus, setRevenus] = useState<CatGroup[]>([]);
  const [recurrentes, setRecurrentes] = useState<CatGroup[]>([]);

  const { start, end, label } = getDateRange(period, monthOffset);

  const fetchData = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('transactions')
        .select('type, montant, categorie, exceptionnelle')
        .gte('date', start)
        .lte('date', end);

      const txs = (data ?? []) as { type: string; montant: number; categorie: string; exceptionnelle: boolean }[];

      const groupBy = (items: typeof txs): CatGroup[] => {
        const map = new Map<string, number>();
        for (const t of items) {
          map.set(t.categorie, (map.get(t.categorie) ?? 0) + Number(t.montant));
        }
        return [...map.entries()]
          .map(([categorie, total]) => ({ categorie, total }))
          .sort((a, b) => b.total - a.total);
      };

      setDepenses(groupBy(txs.filter((t) => t.type === 'depense')));
      setRevenus(groupBy(txs.filter((t) => t.type === 'revenu')));
      setRecurrentes(groupBy(txs.filter((t) => t.type === 'depense' && !t.exceptionnelle)));
    } finally {
      setLoading(false);
    }
  }, [authReady, start, end]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  useEffect(() => { fetchData(); }, [fetchData]);

  const activeGroups = tab === 'sorties' ? depenses : tab === 'entrees' ? revenus : recurrentes;
  const totalActive = activeGroups.reduce((s, g) => s + g.total, 0);

  const donutData = activeGroups.slice(0, 6).map((g, i) => ({
    pct: totalActive > 0 ? g.total / totalActive : 0,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['1m', '3m', '6m'] as Period[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => { setPeriod(p); setMonthOffset(0); }}
            style={[styles.periodBtn, period === p && { backgroundColor: accent + '22', borderColor: accent }]}
          >
            <Text style={[styles.periodLabel, period === p && { color: accent }]}>
              {p === '1m' ? '1 mois' : p === '3m' ? '3 mois' : '6 mois'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Month nav (1m only) */}
      {period === '1m' && (
        <View style={styles.monthNav}>
          <Pressable onPress={() => setMonthOffset((o) => o + 1)} style={styles.navArrow}>
            <Text style={styles.navArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{label}</Text>
          <Pressable
            onPress={() => setMonthOffset((o) => Math.max(0, o - 1))}
            style={[styles.navArrow, monthOffset === 0 && { opacity: 0.3 }]}
            disabled={monthOffset === 0}
          >
            <Text style={styles.navArrowText}>›</Text>
          </Pressable>
        </View>
      )}

      {period !== '1m' && (
        <Text style={styles.periodRangeLabel}>{label}</Text>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([['sorties', 'Sorties'], ['entrees', 'Entrées'], ['recurrences', 'Récurrences']] as const).map(([id, lbl]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tabBtn, tab === id && { borderBottomWidth: 2, borderBottomColor: accent }]}
          >
            <Text style={[styles.tabBtnText, tab === id && { color: accent }]}>{lbl}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={accent} />
        </View>
      ) : (
        <>
          {/* Donut */}
          <View style={styles.donutWrap}>
            <DonutChart data={donutData} total={totalActive} />
          </View>

          {/* Legend */}
          {activeGroups.length > 0 && (
            <View style={styles.legendWrap}>
              {activeGroups.slice(0, 6).map((g, i) => (
                <View key={g.categorie} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }]} />
                  <Text style={styles.legendText} numberOfLines={1}>
                    {getCatEmoji(g.categorie)} {getCatLabel(g.categorie)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Category list */}
          <CatList
            groups={activeGroups}
            total={totalActive}
            accent={accent}
            empty={
              tab === 'sorties'
                ? 'Aucune dépense sur cette période.'
                : tab === 'entrees'
                ? 'Aucun revenu sur cette période.'
                : 'Aucune dépense récurrente sur cette période.'
            }
          />
        </>
      )}
    </ScrollView>
  );
}

function AnalyseFreelance() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 3 }}>
        <Text style={styles.mono}>Analyse</Text>
        <Text style={styles.title}>Bientôt disponible</Text>
      </View>

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
          L'analyse freelance arrive avec la connexion bancaire.{' '}
          <Text style={{ fontFamily: 'Sora_700Bold', color: C.lime }}>Bientôt disponible.</Text>
        </Text>
      </Card>
    </ScrollView>
  );
}

export default function ProjectionScreen() {
  const { profile } = useApp();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analyse</Text>
      </View>
      {profile === 'perso' ? <AnalysePerso /> : <AnalyseFreelance />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.6,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },

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

  // Period selector
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surf,
  },
  periodLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: C.muted,
  },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 22,
    color: C.text,
  },
  monthLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: C.text,
    letterSpacing: -0.3,
  },
  periodRangeLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tabBtn: {
    flex: 1,
    paddingBottom: 10,
    alignItems: 'center',
  },
  tabBtnText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12.5,
    color: C.muted,
  },

  // Donut
  donutWrap: { alignItems: 'center', paddingVertical: 8 },
  donutAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 24,
    color: C.text,
    letterSpacing: -0.8,
  },
  donutUnit: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.muted,
  },

  // Legend
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: C.text,
    maxWidth: 100,
  },

  // Category rows
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  catLabel: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.text },
  catAmount: { fontFamily: 'Sora_700Bold', fontSize: 13 },
  catPct: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
  },

  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },

  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
  },
});
