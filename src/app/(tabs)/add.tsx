import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { Tag } from '@/components/ui/Tag';
import { C, getChargeRate } from '@/constants/colors';
import {
  PERSO_CATEGORIES,
  FREELANCE_INCOME_CATEGORIES,
  type Categorie,
} from '@/constants/categories';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

type EntryType = 'income' | 'expense';

const PERSO_INCOME_CATS: Categorie[] = [
  { value: 'salaire', label: 'Salaire', emoji: '💰' },
  { value: 'remboursement', label: 'Remboursement', emoji: '🔄' },
  { value: 'divers', label: 'Divers', emoji: '✨' },
];

function getCatList(isFreelance: boolean, type: EntryType): Categorie[] {
  if (isFreelance) return type === 'income' ? FREELANCE_INCOME_CATEGORIES : PERSO_CATEGORIES;
  return type === 'income' ? PERSO_INCOME_CATS : PERSO_CATEGORIES;
}

function defaultCat(isFreelance: boolean, type: EntryType): string {
  if (isFreelance) return type === 'income' ? 'prestation' : 'divers';
  return type === 'income' ? 'salaire' : 'divers';
}

export default function AddScreen() {
  const { profile, freelanceSetup, setHasData } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;
  const isFreelance = profile === 'freelance';

  const initialType: EntryType = isFreelance ? 'income' : 'expense';
  const [type, setType] = useState<EntryType>(initialType);
  const [amount, setAmount] = useState('');
  const [field1, setField1] = useState('');
  const [category, setCategory] = useState(defaultCat(isFreelance, initialType));
  const [toggle, setToggle] = useState(false);
  const [isExceptionnelle, setIsExceptionnelle] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsed = parseFloat(amount.replace(',', '.')) || 0;
  const rate = getChargeRate(
    freelanceSetup.status,
    freelanceSetup.versementLiberatoire,
    freelanceSetup.acre
  );
  const charges = Math.round(parsed * rate);
  const dispo = parsed - charges;

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const todayStr = new Date().toISOString().split('T')[0];

  const catList = getCatList(isFreelance, type);
  const currentCat = catList.find((c) => c.value === category);

  function handleTypeChange(t: EntryType) {
    setType(t);
    setCategory(defaultCat(isFreelance, t));
    if (t === 'income') setIsExceptionnelle(false);
  }

  async function handleSave() {
    if (parsed <= 0 || saving) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      await supabase.from('transactions').insert({
        user_id: userId,
        montant: parsed,
        categorie: category,
        type: type === 'income' ? 'revenu' : 'depense',
        description: field1.trim() || null,
        date: todayStr,
        exceptionnelle: type === 'expense' ? isExceptionnelle : false,
      });

      setHasData(true);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navClose}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Ajouter</Text>
        <Text style={[styles.navOk, { color: accent, opacity: parsed > 0 ? 1 : 0.4 }]}>OK</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Segment */}
        <View style={styles.seg}>
          {(isFreelance
            ? ([['income', 'Revenu'], ['expense', 'Dépense']] as const)
            : ([['income', 'Entrée'], ['expense', 'Dépense']] as const)
          ).map(([id, label]) => (
            <Text
              key={id}
              onPress={() => handleTypeChange(id)}
              style={[
                styles.segItem,
                type === id && [styles.segItemActive, { backgroundColor: accent }],
              ]}
            >
              {label}
            </Text>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>
            {type === 'income' ? 'Montant encaissé' : 'Montant dépensé'}
          </Text>
          <View style={styles.amountRow}>
            <TextInput
              style={[styles.amountInput, { color: accent }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.muted}
              selectionColor={accent}
            />
            <Text style={[styles.amountCurrency, { color: accent }]}>€</Text>
          </View>
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.fieldLab}>{isFreelance ? 'Client / source' : 'Marchand'}</Text>
            <TextInput
              style={styles.fieldVal}
              value={field1}
              onChangeText={setField1}
              selectionColor={accent}
              placeholderTextColor={C.muted}
              placeholder={isFreelance ? 'Ex : Studio Mörk' : 'Ex : Carrefour'}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLab}>Catégorie</Text>
            <Text style={styles.fieldVal}>
              {currentCat ? `${currentCat.emoji} ${currentCat.label}` : category}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLab}>Date</Text>
            <Text style={styles.fieldVal}>{today}</Text>
          </View>

          <View style={styles.field}>
            <View>
              <Text style={styles.fieldVal}>
                {isFreelance ? 'Facturé avec TVA' : 'Dépense récurrente'}
              </Text>
              <Text style={styles.fieldLab}>
                {isFreelance ? 'Franchise en base' : 'Tous les mois'}
              </Text>
            </View>
            <Switch
              value={toggle}
              onValueChange={setToggle}
              trackColor={{ true: accent, false: C.surf3 }}
              thumbColor="#fff"
            />
          </View>

          {type === 'expense' && (
            <View style={styles.field}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.fieldVal}>Dépense exceptionnelle</Text>
                <Text style={styles.fieldLab}>Achat ponctuel, non représentatif du quotidien</Text>
              </View>
              <Switch
                value={isExceptionnelle}
                onValueChange={setIsExceptionnelle}
                trackColor={{ true: C.warm, false: C.surf3 }}
                thumbColor="#fff"
              />
            </View>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {catList.map((cat) => {
            const active = cat.value === category;
            return (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                style={[
                  styles.chip,
                  active && { backgroundColor: accent, borderColor: accent },
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.emoji} {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Karl preview */}
        {parsed > 0 && (
          <Card
            style={{
              backgroundColor: isFreelance
                ? 'rgba(196,245,66,0.06)'
                : 'rgba(167,139,250,0.08)',
              borderColor: isFreelance
                ? 'rgba(196,245,66,0.22)'
                : 'rgba(167,139,250,0.25)',
            }}
          >
            <View style={styles.karlRow}>
              <KarlMascot size={36} color={accent} />
              <Text style={styles.karlText}>
                {isFreelance && type === 'income' ? (
                  <>
                    Sur ces{' '}
                    <Text style={[styles.bold, { color: accent }]}>
                      {parsed.toLocaleString('fr-FR')} €
                    </Text>
                    , je bloque{' '}
                    <Text style={[styles.bold, { color: accent }]}>{charges} €</Text> (
                    {Math.round(rate * 100)} %) pour l'URSSAF. Dispo pour toi :{' '}
                    <Text style={[styles.bold, { color: accent }]}>{dispo} €</Text>. 🤝
                  </>
                ) : (
                  <>
                    Dépense de{' '}
                    <Text style={[styles.bold, { color: accent }]}>
                      {parsed.toLocaleString('fr-FR')} €
                    </Text>{' '}
                    en {currentCat?.label ?? category} — budget mis à jour.
                  </>
                )}
              </Text>
            </View>
          </Card>
        )}

        {/* Bank connect */}
        <Card style={styles.bankCard}>
          <View style={styles.bankLeft}>
            <View style={styles.bankIcon}>
              <Text style={{ fontSize: 17 }}>🏦</Text>
            </View>
            <View>
              <Text style={styles.bankTitle}>Connecter mon compte</Text>
              <Text style={styles.bankSub}>
                {isFreelance ? 'Fini la saisie manuelle' : 'Catégorisation auto'}
              </Text>
            </View>
          </View>
          <Tag variant="purple">Bientôt</Tag>
        </Card>

        <Button
          accentColor={accent}
          disabled={parsed <= 0}
          loading={saving}
          onPress={handleSave}
        >
          Enregistrer
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  navClose: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },
  navTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.text },
  navOk: { fontFamily: 'Sora_600SemiBold', fontSize: 13 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },

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
  segItemActive: { color: C.dark },

  amountBlock: { alignItems: 'center', gap: 4, marginVertical: 10 },
  amountLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  amountInput: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 42,
    letterSpacing: -1.5,
    minWidth: 80,
    textAlign: 'right',
  },
  amountCurrency: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 28,
  },

  fields: { gap: 9 },
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
  fieldLab: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },
  fieldVal: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: C.text },

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surf,
  },
  chipText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: C.muted },
  chipTextActive: { color: C.dark },

  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: C.text,
    flex: 1,
  },
  bold: { fontFamily: 'Sora_700Bold' },

  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  bankLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  bankIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.surf3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankTitle: { fontFamily: 'Sora_700Bold', fontSize: 13, color: C.text },
  bankSub: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted },
});
