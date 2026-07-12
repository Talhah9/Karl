import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { C } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const OPTIONS = [
  { id: 'urgence', emoji: '🚨', label: 'Fonds d\'urgence' },
  { id: 'vacances', emoji: '✈️', label: 'Vacances' },
  { id: 'voiture', emoji: '🚗', label: 'Nouvelle voiture' },
  { id: 'immo', emoji: '🏠', label: 'Nouvelle maison / projet immobilier' },
  { id: 'mariage', emoji: '💍', label: 'Mariage ou grand événement' },
  { id: 'retraite', emoji: '🌴', label: 'Retraite / long terme' },
  { id: 'autre', emoji: '🎯', label: 'Autre chose' },
];

export default function SavingsReasonsScreen() {
  const { goals } = useLocalSearchParams<{ goals: string }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleContinue() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        const parsedGoals: string[] = goals ? JSON.parse(goals) : [];
        await supabase
          .from('objectifs_utilisateur')
          .upsert(
            { user_id: userId, objectifs_generaux: parsedGoals, raisons_epargne: selected },
            { onConflict: 'user_id' }
          );
      }
    } catch {
      // Non-blocking — onboarding continues regardless
    }
    setSaving(false);
    router.push('/onboarding/name');
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
            <Text style={styles.title}>Pour quoi tu{'\n'}souhaites épargner ?</Text>
            <Text style={styles.sub}>Plusieurs réponses possibles — Karl s'en souviendra.</Text>
          </View>

          <View style={styles.options}>
            {OPTIONS.map((opt) => {
              const active = selected.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggle(opt.id)}
                  style={[styles.optCard, active && styles.optCardActive]}
                >
                  <Text style={styles.optEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optLabel, active && styles.optLabelActive]}>
                    {opt.label}
                  </Text>
                  <View style={[styles.check, active && styles.checkActive]}>
                    {active && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button onPress={handleContinue} disabled={saving}>
            {selected.length === 0 ? 'Passer' : 'Continuer'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  scroll: { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 12 },

  header: { gap: 8 },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 26,
    color: C.text,
    letterSpacing: -1,
    lineHeight: 30,
  },
  sub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },

  options: { gap: 10 },
  optCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optCardActive: {
    borderColor: C.lime,
    backgroundColor: 'rgba(196,245,66,0.07)',
  },
  optEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  optLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13.5,
    color: C.text,
    flex: 1,
    lineHeight: 19,
  },
  optLabelActive: { fontFamily: 'Sora_600SemiBold' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkActive: {
    borderColor: C.lime,
    backgroundColor: C.lime,
  },
  checkMark: { fontFamily: 'Sora_700Bold', fontSize: 11, color: C.dark },

  footer: {},
});
