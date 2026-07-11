import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const DAYS = [25, 26, 27, 28, 29, 30, 1, 2, 3, 4, 5];

export default function EditPaydayScreen() {
  const { persoSetup, setPersoSetup } = useApp();
  const [day, setDay] = useState(persoSetup.payday);

  function handleSave() {
    setPersoSetup({ payday: day });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.nav}>
          <Text style={styles.navBack} onPress={() => router.back()}>← Réglages</Text>
          <Text style={styles.navTitle}>Date de versement</Text>
          <View style={{ width: 80 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Ton salaire tombe quand ?</Text>
            <Text style={styles.sub}>
              Modifie ta date pour recalibrer le cycle de budget.
            </Text>
          </View>

          <View style={styles.pickerBlock}>
            <Text style={styles.bigDay}>Le {day}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRow}
            >
              {DAYS.map((d) => {
                const active = d === day;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDay(d)}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                  >
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Card style={styles.karlCard}>
            <View style={styles.karlRow}>
              <KarlMascot size={34} color={C.purple} />
              <Text style={styles.karlText}>
                Ton mois « argent » ira du{' '}
                <Text style={styles.purp}>{day} au {day - 1 < 1 ? 31 + day - 1 : day - 1}</Text>.
                Toutes les projections et le dashboard se recalculent immédiatement.
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button onPress={handleSave} accentColor={C.purple}>
            Enregistrer
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
  navBack: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  navTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.text },
  scroll: { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 16 },
  header: { gap: 8 },
  title: { fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: C.text, letterSpacing: -0.8 },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },
  pickerBlock: { alignItems: 'center', gap: 14, marginTop: 4 },
  bigDay: { fontFamily: 'Sora_800ExtraBold', fontSize: 44, color: C.purple, letterSpacing: -1.5, lineHeight: 50 },
  dayRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 4 },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.purple, borderColor: 'transparent' },
  dayText: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: C.muted },
  dayTextActive: { fontFamily: 'Sora_700Bold', fontSize: 17, color: C.dark },
  karlCard: { backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.25)' },
  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: { fontFamily: 'Sora_400Regular', fontSize: 12.5, lineHeight: 18, color: C.text, flex: 1 },
  purp: { fontFamily: 'Sora_700Bold', color: C.purple },
  footer: { gap: 18 },
});
