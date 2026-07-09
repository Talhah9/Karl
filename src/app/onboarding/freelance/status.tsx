import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { Tag } from '@/components/ui/Tag';
import { C, RATES } from '@/constants/colors';
import { useApp, type FreelanceStatus } from '@/context/AppContext';

const statuses: Array<{
  id: FreelanceStatus;
  label: string;
  sub: string;
  rate: string;
}> = [
  { id: 'bnc', label: 'Micro · Prestations BNC', sub: 'Dev, design, conseil, freelance', rate: '24,6 %' },
  { id: 'bic', label: 'Micro · Prestations BIC', sub: 'Services commerciaux, artisanat', rate: '21,2 %' },
  { id: 'vente', label: 'Micro · Vente de marchandises', sub: 'Achat-revente, e-commerce', rate: '12,3 %' },
  { id: 'other', label: 'Autre / je sais pas trop', sub: "Karl t'aide à y voir clair", rate: '' },
];

export default function StatusScreen() {
  const { freelanceSetup, setFreelanceSetup } = useApp();
  const [selected, setSelected] = useState<FreelanceStatus>(freelanceSetup.status);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Tu es sous quel statut ?</Text>
            <Text style={styles.sub}>Ça me sert à calculer tes cotisations au bon taux.</Text>
          </View>
          <View style={styles.options}>
            {statuses.map((s) => {
              const active = selected === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelected(s.id)}
                  style={[styles.optCard, active && styles.optCardActive]}
                >
                  <View style={styles.optLeft}>
                    <Text style={styles.optLabel}>{s.label}</Text>
                    <Text style={styles.optSub}>{s.sub}</Text>
                  </View>
                  <View style={styles.optRight}>
                    {s.rate ? (
                      <Tag variant={active ? 'lime' : 'muted'}>{s.rate}</Tag>
                    ) : null}
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={3} current={0} />
          <Button
            onPress={() => {
              setFreelanceSetup({ status: selected });
              router.push('/onboarding/freelance/revenue');
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
  scrollContent: { gap: 18, paddingBottom: 20 },
  header: { gap: 8 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.8,
  },
  sub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.muted,
  },
  options: { gap: 8 },
  optCard: {
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  optCardActive: {
    borderColor: C.lime,
    backgroundColor: 'rgba(196,245,66,0.07)',
  },
  optLeft: { flex: 1, gap: 2 },
  optLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13.5,
    color: C.text,
  },
  optSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: C.muted,
  },
  optRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 0,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: C.lime },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.lime },
  footer: { gap: 18 },
});
