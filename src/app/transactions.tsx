import { useFocusEffect, router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { getCatEmoji, getCatLabel } from '@/constants/categories';
import { useApp } from '@/context/AppContext';
import { useRecentTransactions } from '@/hooks/useRecentTransactions';

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export default function TransactionsScreen() {
  const { profile } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;
  const { data, loading, refresh } = useRecentTransactions(200);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Group transactions by date
  const grouped: Record<string, typeof data> = {};
  for (const tx of data) {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navClose}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Toutes les transactions</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={accent} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.loader}>
          <Text style={styles.empty}>Aucune transaction ce cycle</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {sortedDates.map((dateStr) => (
            <View key={dateStr} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{fmtDate(dateStr)}</Text>
              <View style={styles.group}>
                {grouped[dateStr].map((tx, i) => (
                  <Pressable
                    key={tx.id}
                    style={[
                      styles.row,
                      i < grouped[dateStr].length - 1 && styles.rowBorder,
                    ]}
                    onPress={() => router.push(`/transaction/${tx.id}`)}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowEmoji}>{getCatEmoji(tx.categorie)}</Text>
                      <View>
                        <Text style={styles.rowLabel}>
                          {getCatLabel(tx.categorie)}
                          {tx.exceptionnelle ? ' ⚡' : ''}
                        </Text>
                        {tx.description ? (
                          <Text style={styles.rowDesc} numberOfLines={1}>{tx.description}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.rowAmount,
                        { color: tx.type === 'depense' ? C.text : accent },
                      ]}
                    >
                      {tx.type === 'depense' ? '−' : '+'}{' '}
                      {tx.montant.toLocaleString('fr-FR')} €
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: 'Sora_400Regular', fontSize: 14, color: C.muted },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },

  dateGroup: { gap: 8 },
  dateHeader: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  group: {
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowEmoji: { fontSize: 20 },
  rowLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: C.text },
  rowDesc: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted, marginTop: 1 },
  rowAmount: { fontFamily: 'Sora_700Bold', fontSize: 14 },
});
