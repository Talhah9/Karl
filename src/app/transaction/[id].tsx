import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { C } from '@/constants/colors';
import {
  PERSO_CATEGORIES,
  FREELANCE_INCOME_CATEGORIES,
  type Categorie,
} from '@/constants/categories';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

const PERSO_INCOME_CATS: Categorie[] = [
  { value: 'salaire', label: 'Salaire', emoji: '💰' },
  { value: 'remboursement', label: 'Remboursement', emoji: '🔄' },
  { value: 'divers', label: 'Divers', emoji: '✨' },
];

function getCatList(isFreelance: boolean, type: 'revenu' | 'depense'): Categorie[] {
  if (isFreelance) return type === 'revenu' ? FREELANCE_INCOME_CATEGORIES : PERSO_CATEGORIES;
  return type === 'revenu' ? PERSO_INCOME_CATS : PERSO_CATEGORIES;
}

function formatDateFR(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;
  const isFreelance = profile === 'freelance';

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<'revenu' | 'depense'>('depense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('divers');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [isExceptionnelle, setIsExceptionnelle] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data: tx }) => {
        if (tx) {
          setType(tx.type as 'revenu' | 'depense');
          setAmount(String(Number(tx.montant)));
          setCategory(tx.categorie as string);
          setDescription((tx.description as string | null) ?? '');
          setDate(tx.date as string);
          setIsExceptionnelle(Boolean(tx.exceptionnelle));
        }
        setFetching(false);
      });
  }, [id]);

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0 || saving) return;
    setSaving(true);
    try {
      await supabase
        .from('transactions')
        .update({
          montant: parsed,
          categorie: category,
          description: description.trim() || null,
          date,
          type,
          exceptionnelle: type === 'depense' ? isExceptionnelle : false,
        })
        .eq('id', id);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Supprimer cette transaction',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('transactions').delete().eq('id', id);
            router.back();
          },
        },
      ]
    );
  }

  function handleTypeChange(t: 'revenu' | 'depense') {
    setType(t);
    if (t === 'revenu') setIsExceptionnelle(false);
    const list = getCatList(isFreelance, t);
    setCategory(list[0]?.value ?? 'divers');
  }

  const catList = getCatList(isFreelance, type);
  const currentCat = catList.find((c) => c.value === category);
  const parsed = parseFloat(amount.replace(',', '.'));
  const canSave = !isNaN(parsed) && parsed > 0;

  if (fetching) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator color={accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navClose}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Transaction</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type toggle */}
        <View style={styles.seg}>
          {(['depense', 'revenu'] as const).map((t) => (
            <Text
              key={t}
              onPress={() => handleTypeChange(t)}
              style={[
                styles.segItem,
                type === t && [styles.segItemActive, { backgroundColor: accent }],
              ]}
            >
              {t === 'depense' ? 'Dépense' : 'Revenu'}
            </Text>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Montant</Text>
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
            <Text style={styles.fieldLab}>Description</Text>
            <TextInput
              style={[styles.fieldVal, { flex: 1, textAlign: 'right' }]}
              value={description}
              onChangeText={setDescription}
              selectionColor={accent}
              placeholderTextColor={C.muted}
              placeholder="Facultatif"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLab}>Catégorie sélectionnée</Text>
            <Text style={styles.fieldVal}>
              {currentCat ? `${currentCat.emoji} ${currentCat.label}` : category}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLab}>Date (AAAA-MM-JJ)</Text>
            <TextInput
              style={[styles.fieldVal, { textAlign: 'right' }]}
              value={date}
              onChangeText={setDate}
              selectionColor={accent}
              placeholderTextColor={C.muted}
              placeholder="2026-07-11"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {date.length === 10 && (
            <Text style={styles.dateFR}>{formatDateFR(date)}</Text>
          )}

          {type === 'depense' && (
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

        <Button
          accentColor={accent}
          disabled={!canSave}
          loading={saving}
          onPress={handleSave}
        >
          Enregistrer les modifications
        </Button>

        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Supprimer cette transaction</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  dateFR: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

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

  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,122,77,0.35)',
    borderRadius: 24,
    backgroundColor: 'rgba(255,122,77,0.07)',
  },
  deleteBtnText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: C.warm,
  },
});
