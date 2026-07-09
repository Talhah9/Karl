import { router } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { Tag } from '@/components/ui/Tag';
import { C, getChargeRate } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function FieldRow({
  label,
  sub,
  right,
}: {
  label: string;
  sub?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View>
        <Text style={styles.fieldLabel}>{label}</Text>
        {sub && <Text style={styles.fieldSub}>{sub}</Text>}
      </View>
      {right}
    </View>
  );
}

export default function ChargesScreen() {
  const { freelanceSetup, setFreelanceSetup, completeOnboarding } = useApp();

  const rate = getChargeRate(
    freelanceSetup.status,
    freelanceSetup.versementLiberatoire,
    freelanceSetup.acre
  );
  const baseRate = (rate - (freelanceSetup.versementLiberatoire ? 0.022 : 0)).toFixed(1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Ton régime de charges</Text>
            <Text style={styles.sub}>
              Pour coller au plus juste à ce que tu paieras vraiment.
            </Text>
          </View>

          <View style={styles.fields}>
            {/* Périodicité */}
            <Text style={styles.fieldGroup}>Périodicité URSSAF</Text>
            <View style={styles.seg}>
              {(['Mensuelle', 'Trimestrielle'] as const).map((label) => {
                const active =
                  label === 'Mensuelle'
                    ? !freelanceSetup.quarterly
                    : freelanceSetup.quarterly;
                return (
                  <Text
                    key={label}
                    onPress={() =>
                      setFreelanceSetup({ quarterly: label === 'Trimestrielle' })
                    }
                    style={[styles.segItem, active && styles.segItemActive]}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>

            <FieldRow
              label="Versement libératoire"
              sub="Impôt payé avec les cotis'"
              right={
                <View style={styles.rowRight}>
                  {freelanceSetup.versementLiberatoire && (
                    <Tag variant="lime">+2,2 %</Tag>
                  )}
                  <Switch
                    value={freelanceSetup.versementLiberatoire}
                    onValueChange={(v) => setFreelanceSetup({ versementLiberatoire: v })}
                    trackColor={{ true: C.lime, false: C.surf3 }}
                    thumbColor="#fff"
                  />
                </View>
              }
            />

            <FieldRow
              label="ACRE — 1ʳᵉ année"
              sub="Cotisations réduites"
              right={
                <Switch
                  value={freelanceSetup.acre}
                  onValueChange={(v) => setFreelanceSetup({ acre: v })}
                  trackColor={{ true: C.lime, false: C.surf3 }}
                  thumbColor="#fff"
                />
              }
            />
          </View>

          <Card style={styles.karlCard}>
            <View style={styles.karlRow}>
              <KarlMascot size={34} />
              <Text style={styles.karlText}>
                Au total je bloque{' '}
                <Text style={styles.lime}>{(rate * 100).toFixed(1)} %</Text>{' '}
                sur chaque rentrée : {baseRate} % de cotis'
                {freelanceSetup.versementLiberatoire ? " + 2,2 % d'impôt" : ''}. Réglé. 🤝
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={3} current={2} />
          <Button
            onPress={() => {
              completeOnboarding();
              router.replace('/(tabs)');
            }}
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
  fields: { gap: 11 },
  fieldGroup: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    padding: 4,
    gap: 4,
  },
  segItem: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    color: C.muted,
  },
  segItemActive: {
    backgroundColor: C.lime,
    color: C.dark,
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
  fieldLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: C.text },
  fieldSub: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  karlCard: {
    backgroundColor: 'rgba(196,245,66,0.06)',
    borderColor: 'rgba(196,245,66,0.2)',
  },
  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
  },
  lime: { fontFamily: 'Sora_700Bold', color: C.lime },
  footer: { gap: 18 },
});
