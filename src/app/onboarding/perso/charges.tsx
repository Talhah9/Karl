import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { OnboardingDots } from '@/components/ui/OnboardingDots';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

interface LocalCharge {
  id: string;
  nom: string;
  montant: number;
}

export default function ChargesFixesScreen() {
  const { authReady } = useApp();
  const [charges, setCharges] = useState<LocalCharge[]>([]);
  const [nom, setNom] = useState('');
  const [montantText, setMontantText] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const total = charges.reduce((s, c) => s + c.montant, 0);
  const parsedMontant = parseFloat(montantText.replace(',', '.'));
  const canAdd = nom.trim().length > 0 && !isNaN(parsedMontant) && parsedMontant > 0;

  useEffect(() => {
    if (!authReady) return;
    supabase
      .from('charges_fixes')
      .select('id, nom, montant')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setCharges(
          (data ?? []).map((d) => ({
            id: d.id as string,
            nom: d.nom as string,
            montant: Number(d.montant),
          }))
        );
      });
  }, [authReady]);

  async function handleAdd() {
    const trimmed = nom.trim();
    const montant = parseFloat(montantText.replace(',', '.'));
    if (!trimmed || isNaN(montant) || montant <= 0) return;

    setAddError('');
    setAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setAddError('Session expirée — reconnecte-toi.');
        setAdding(false);
        return;
      }

      const { data, error } = await supabase
        .from('charges_fixes')
        .insert({ user_id: userId, nom: trimmed, montant })
        .select('id')
        .single();

      if (error) {
        setAddError("Erreur lors de l'ajout. Réessaie.");
      } else if (data) {
        setCharges((prev) => [...prev, { id: data.id as string, nom: trimmed, montant }]);
        setNom('');
        setMontantText('');
      }
    } catch {
      setAddError('Erreur inattendue. Réessaie.');
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('charges_fixes').delete().eq('id', id);
    setCharges((prev) => prev.filter((c) => c.id !== id));
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
            <Text style={styles.title}>Tes charges fixes</Text>
            <Text style={styles.sub}>
              Ce qui sort automatiquement chaque mois : loyer, abos, assurances, transport…
            </Text>
          </View>

          {/* Formulaire d'ajout */}
          <View style={styles.formBlock}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputNom}
                placeholder="Loyer, forfait mobile…"
                placeholderTextColor={C.muted}
                value={nom}
                onChangeText={setNom}
                returnKeyType="next"
              />
              <View style={styles.montantWrap}>
                <TextInput
                  style={styles.inputMontant}
                  placeholder="0"
                  placeholderTextColor={C.muted}
                  value={montantText}
                  onChangeText={(t) => setMontantText(t.replace(/[^0-9.,]/g, ''))}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                  maxLength={7}
                />
                <Text style={styles.euro}>€</Text>
              </View>
            </View>
            {addError ? <Text style={styles.errorText}>{addError}</Text> : null}
            <Pressable
              style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd || adding}
            >
              <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
                + Ajouter
              </Text>
            </Pressable>
          </View>

          {/* Liste des charges */}
          {charges.length > 0 && (
            <View style={styles.listBlock}>
              {charges.map((c) => (
                <View key={c.id} style={styles.chargeRow}>
                  <Text style={styles.chargeNom}>{c.nom}</Text>
                  <View style={styles.chargeRight}>
                    <Text style={styles.chargeMontant}>
                      {c.montant.toLocaleString('fr-FR')} €
                    </Text>
                    <Pressable onPress={() => handleDelete(c.id)} hitSlop={12}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total mensuel</Text>
                <Text style={styles.totalAmount}>{total.toLocaleString('fr-FR')} €</Text>
              </View>
            </View>
          )}

          <Card style={styles.karlCard}>
            <View style={styles.karlRow}>
              <KarlMascot size={34} color={C.purple} />
              <Text style={styles.karlText}>
                Tes cotisations et impôts ? Pas ici — ils sont gérés à part.{' '}
                <Text style={styles.purp}>Note juste ce qui sort de ton compte automatiquement</Text>
                {' '}chaque mois, sans que t'aies à y penser.
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots total={4} current={2} />
          <Button
            onPress={() => router.push('/onboarding/perso/savings-goal')}
            accentColor={C.purple}
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
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 22 },
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

  formBlock: { gap: 10 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inputNom: {
    flex: 1,
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: C.text,
  },
  montantWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
    minWidth: 90,
  },
  inputMontant: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: C.text,
    minWidth: 44,
    textAlign: 'right',
    padding: 0,
  },
  euro: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: C.purple },
  addBtn: {
    backgroundColor: C.purple,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: C.surf3 },
  addBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: C.dark },
  addBtnTextDisabled: { color: C.muted },
  errorText: { fontFamily: 'Sora_400Regular', fontSize: 12.5, color: C.warm, textAlign: 'center' },

  listBlock: {
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  chargeNom: { fontFamily: 'Sora_400Regular', fontSize: 14, color: C.text, flex: 1 },
  chargeRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chargeMontant: { fontFamily: 'Sora_700Bold', fontSize: 14, color: C.purple },
  deleteBtn: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: C.muted },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  totalLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    alignSelf: 'center',
  },
  totalAmount: { fontFamily: 'Sora_800ExtraBold', fontSize: 20, color: C.purple, letterSpacing: -0.5 },

  karlCard: {
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.25)',
  },
  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
  },
  purp: { fontFamily: 'Sora_700Bold', color: C.purple },

  footer: { gap: 18 },
});
