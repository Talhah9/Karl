import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { C } from '@/constants/colors';
import { useApp, type UserProfile } from '@/context/AppContext';

const options: Array<{
  id: UserProfile;
  label: string;
  desc: string;
  karlColor: string;
}> = [
  {
    id: 'freelance',
    label: 'Entrepreneur / freelance',
    desc: 'Je provisionne ton URSSAF, je calcule ce que tu peux te verser et je te préviens avant chaque échéance.',
    karlColor: C.lime,
  },
  {
    id: 'perso',
    label: 'Salarié / particulier',
    desc: "Je suis ton salaire, tes dépenses et tes objectifs. Je te dis ce qu'il te reste vraiment jusqu'à la fin du mois.",
    karlColor: C.purple,
  },
];

export default function ProfileScreen() {
  const { setProfile, profile } = useApp();
  const [selected, setSelected] = useState<UserProfile>(profile ?? null);

  function handleSelect(id: UserProfile) {
    setSelected(id);
    setProfile(id!);
  }

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
            <Text style={styles.title}>Karl bosse pour qui ?</Text>
            <Text style={styles.sub}>
              Je m'adapte à ta situation. Tu pourras changer d'avis plus tard.
            </Text>
          </View>
          <View style={styles.options}>
            {options.map((opt) => {
              const active = selected === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => handleSelect(opt.id)}
                  style={[
                    styles.optCard,
                    active && {
                      borderColor: opt.karlColor,
                      backgroundColor: opt.id === 'perso'
                        ? 'rgba(167,139,250,0.07)'
                        : 'rgba(196,245,66,0.07)',
                    },
                  ]}
                >
                  <View style={styles.optRow}>
                    <View style={styles.optLeft}>
                      <KarlMascot size={38} color={opt.karlColor} />
                      <Text style={styles.optLabel}>{opt.label}</Text>
                    </View>
                    <View style={[styles.radio, active && { borderColor: opt.karlColor }]}>
                      {active && <View style={[styles.radioDot, { backgroundColor: opt.karlColor }]} />}
                    </View>
                  </View>
                  <Text style={styles.optDesc}>{opt.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={3} current={0} />
          <Button
            onPress={() => router.push('/onboarding/welcome')}
            disabled={!selected}
            accentColor={selected === 'perso' ? C.purple : C.lime}
          >
            Continuer
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
    paddingBottom: 28,
  },
  scroll: { flex: 1 },
  scrollContent: {
    gap: 24,
    paddingBottom: 16,
  },
  footer: {
    gap: 18,
  },
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
  options: { gap: 12 },
  optCard: {
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 16,
    padding: 16,
    gap: 9,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  optLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  optLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14.5,
    color: C.text,
    flexShrink: 1,
  },
  optDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    color: C.muted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.lime,
  },
});
