import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { Tag } from '@/components/ui/Tag';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const FEATURES = [
  { label: 'Coach Karl illimité', free: '5/sem', pro: '∞' },
  { label: 'Projections avancées', free: '–', pro: '✓' },
  { label: 'Bilan mensuel partageable', free: '–', pro: '✓' },
  { label: 'Export CSV / PDF', free: '–', pro: '✓' },
  { label: 'Alertes intelligentes (URSSAF, budgets)', free: '–', pro: '✓' },
];

export default function PaywallScreen() {
  const { isAnonymous } = useApp();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    if (isAnonymous === true) {
      router.replace('/auth/save?return=paywall');
    }
  }, [isAnonymous]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Close */}
      <View style={styles.nav}>
        <View />
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeBtn}>✕</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <KarlMascot size={66} smug />
          <View style={styles.heroText}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>Karl</Text>
              <Tag variant="lime">PRO</Tag>
            </View>
            <Text style={styles.heroBody}>
              Tu m'as posé <Text style={{ fontFamily: 'Sora_700Bold' }}>5 questions</Text> cette semaine.
              Il t'en reste{' '}
              <Text style={styles.warm}>0</Text>. Freelance ou salarié, l'illimité c'est mieux. 😏
            </Text>
          </View>
        </View>

        {/* Features */}
        <Card style={{ gap: 11, padding: 16 }}>
          <View style={styles.featHeader}>
            <Text style={styles.mono}>Ce que tu débloques</Text>
            <View style={styles.featLabels}>
              <Text style={styles.mono}>Free</Text>
              <Text style={[styles.mono, { color: C.lime }]}>Pro</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featRow}>
              <Text style={styles.featLabel}>{f.label}</Text>
              <View style={styles.featValues}>
                <Text style={styles.featFree}>{f.free}</Text>
                <Text style={styles.featPro}>{f.pro}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Pricing */}
        <View style={styles.pricingRow}>
          <Pressable
            style={[
              styles.priceCard,
              plan === 'monthly' && styles.priceCardActive,
            ]}
            onPress={() => setPlan('monthly')}
          >
            <Text style={styles.priceMono}>Mensuel</Text>
            <Text style={styles.priceAmount}>5,99 €</Text>
            <Text style={styles.priceSub}>/ mois</Text>
          </Pressable>

          <Pressable
            style={[
              styles.priceCard,
              plan === 'yearly' && styles.priceCardActive,
            ]}
            onPress={() => setPlan('yearly')}
          >
            <View style={styles.badgeWrap}>
              <Tag variant="lime">1 MOIS OFFERT</Tag>
            </View>
            <Text style={[styles.priceMono, { color: C.lime }]}>Annuel</Text>
            <Text style={styles.priceAmount}>3,99 €</Text>
            <Text style={styles.priceSub}>/ mois · 47,90 €/an</Text>
          </Pressable>
        </View>

        <Button>Essayer 7 jours gratuits</Button>
        <Text style={styles.noCommit}>Sans engagement. Annule quand tu veux.</Text>
        <Text style={styles.legal}>
          Karl n'est pas un conseiller financier réglementé · les estimations sont indicatives
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  closeBtn: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },

  hero: { alignItems: 'center', gap: 12, textAlign: 'center', marginTop: 2 },
  heroText: { alignItems: 'center', gap: 5 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  heroTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 28,
    color: C.text,
    letterSpacing: -1,
  },
  heroBody: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: C.text,
    textAlign: 'center',
    maxWidth: 230,
  },
  warm: { fontFamily: 'Sora_700Bold', color: C.warm },

  mono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  featHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featLabels: { flexDirection: 'row', gap: 16 },
  divider: { height: 1, backgroundColor: C.line },
  featRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featLabel: { fontFamily: 'Sora_400Regular', fontSize: 12.5, color: C.text, flex: 1 },
  featValues: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  featFree: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted, width: 28, textAlign: 'center' },
  featPro: { fontFamily: 'Sora_700Bold', fontSize: 13, color: C.lime, width: 16, textAlign: 'center' },

  pricingRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  priceCard: {
    flex: 1,
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 2,
  },
  priceCardActive: {
    borderColor: C.lime,
    backgroundColor: 'rgba(196,245,66,0.08)',
  },
  badgeWrap: {
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  priceMono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  priceAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.5,
  },
  priceSub: { fontFamily: 'Sora_400Regular', fontSize: 10, color: C.muted },

  noCommit: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted, textAlign: 'center' },
  legal: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 13,
  },
});
