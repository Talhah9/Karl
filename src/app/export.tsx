import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { Tag } from '@/components/ui/Tag';
import { C } from '@/constants/colors';
import { getCatLabel } from '@/constants/categories';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

type Period = 'current' | 'previous' | 'custom';

interface Transaction {
  date: string;
  categorie: string;
  description: string | null;
  montant: number;
  type: string;
}

function getMonthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1).toISOString().split('T')[0];
  const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

function formatDateFR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateCSV(transactions: Transaction[]): string {
  const header = 'Date;Catégorie;Description;Montant;Type\n';
  const rows = transactions.map((tx) => {
    const montant = (tx.type === 'depense' ? -tx.montant : tx.montant)
      .toString()
      .replace('.', ',');
    const description = (tx.description ?? '').replace(/"/g, '""');
    const categorie = getCatLabel(tx.categorie);
    const type = tx.type === 'depense' ? 'Dépense' : 'Revenu';
    return `${formatDateFR(tx.date)};${categorie};"${description}";${montant};${type}`;
  });
  return '﻿' + header + rows.join('\n');
}

function generatePDFHtml(
  transactions: Transaction[],
  userName: string,
  isFreelance: boolean,
  startDate: string,
  endDate: string,
): string {
  const totalDepenses = transactions
    .filter((tx) => tx.type === 'depense')
    .reduce((s, tx) => s + tx.montant, 0);
  const totalRevenus = transactions
    .filter((tx) => tx.type === 'revenu')
    .reduce((s, tx) => s + tx.montant, 0);
  const solde = totalRevenus - totalDepenses;
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rows = transactions
    .map((tx) => {
      const isDepense = tx.type === 'depense';
      const amountStr = isDepense
        ? `-${tx.montant.toLocaleString('fr-FR')} &euro;`
        : `+${tx.montant.toLocaleString('fr-FR')} &euro;`;
      const color = isDepense ? '#c0392b' : '#27ae60';
      const type = isDepense ? 'D&eacute;pense' : 'Revenu';
      const cat = escapeHtml(getCatLabel(tx.categorie));
      const desc = escapeHtml(tx.description ?? '—');
      return `<tr>
        <td>${formatDateFR(tx.date)}</td>
        <td>${cat}</td>
        <td>${desc}</td>
        <td style="color:${color};font-weight:600;text-align:right;">${amountStr}</td>
        <td>${type}</td>
      </tr>`;
    })
    .join('');

  const emptyRow =
    transactions.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#999;padding:24px 0;">Aucune transaction sur cette période</td></tr>`
      : '';

  const soldeColor = solde >= 0 ? '#27ae60' : '#c0392b';
  const soldeStr = (solde >= 0 ? '+' : '') + solde.toLocaleString('fr-FR') + ' €';

  const noteHtml = isFreelance
    ? `<div style="background:#f0f0f0;border-left:3px solid #555;padding:10px 14px;margin-top:24px;font-size:11px;color:#444;border-radius:0 4px 4px 0;">
        &#128203; Ce document peut servir de support pour votre comptable ou pour votre d&eacute;claration d&apos;activit&eacute;.
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#2c2c2c;padding:40px;}
h1{font-size:22px;font-weight:700;color:#111;margin-bottom:6px;}
.meta{color:#666;font-size:11px;margin-bottom:28px;line-height:18px;}
hr{border:none;border-top:2px solid #111;margin-bottom:18px;}
.count{font-size:10px;color:#999;margin-bottom:10px;}
table{width:100%;border-collapse:collapse;margin-bottom:28px;}
thead th{background:#f2f2f2;text-align:left;padding:8px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#555;border-bottom:2px solid #ddd;}
td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top;}
tr:last-child td{border-bottom:none;}
.summary{background:#f8f8f8;border-radius:6px;padding:16px 20px;}
.sr{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;}
.sr.total{border-top:1.5px solid #ccc;margin-top:6px;padding-top:10px;font-size:13px;font-weight:700;}
.lbl{color:#555;}
footer{margin-top:40px;font-size:9px;color:#aaa;text-align:center;}
</style>
</head>
<body>
<h1>Rapport de transactions</h1>
<p class="meta">
  ${escapeHtml(userName)}&nbsp;&middot;&nbsp;Du ${formatDateFR(startDate)} au ${formatDateFR(endDate)}<br>
  G&eacute;n&eacute;r&eacute; le ${today}
</p>
<hr>
<p class="count">${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}</p>
<table>
  <thead>
    <tr>
      <th>Date</th><th>Cat&eacute;gorie</th><th>Description</th>
      <th style="text-align:right;">Montant</th><th>Type</th>
    </tr>
  </thead>
  <tbody>${emptyRow || rows}</tbody>
</table>
<div class="summary">
  <div class="sr">
    <span class="lbl">Total d&eacute;penses</span>
    <span style="color:#c0392b;font-weight:600;">-${totalDepenses.toLocaleString('fr-FR')} &euro;</span>
  </div>
  <div class="sr">
    <span class="lbl">Total revenus</span>
    <span style="color:#27ae60;font-weight:600;">+${totalRevenus.toLocaleString('fr-FR')} &euro;</span>
  </div>
  <div class="sr total">
    <span>Solde net</span>
    <span style="color:${soldeColor};">${soldeStr}</span>
  </div>
</div>
${noteHtml}
<p class="footer">Bilan &middot; Document g&eacute;n&eacute;r&eacute; automatiquement &middot; Usage personnel ou professionnel</p>
</body>
</html>`;
}

function ProTeaser({ accent }: { accent: string }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navClose}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Exporter mes données</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <KarlMascot size={66} smug color={accent} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: C.text, letterSpacing: -0.8 }}>Export CSV / PDF</Text>
            <Tag variant="lime">PRO</Tag>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 14, color: C.muted, lineHeight: 22, textAlign: 'center' }}>
            Exporte toutes tes transactions en CSV pour Excel ou en PDF mis en page pour ton comptable.
          </Text>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 14, color: C.muted, lineHeight: 22, textAlign: 'center' }}>
            Choisis ta période, télécharge en un tap.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={{ height: 52, borderRadius: 26, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: '#141210' }}>Découvrir Karl Pro</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function ExportScreen() {
  const { userName, profile } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;
  const isFreelance = profile === 'freelance';

  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userId = session?.user?.id;
      if (!userId) { setIsPro(false); return; }
      const { data: credits } = await supabase
        .from('credits_utilisateur')
        .select('abonne')
        .eq('user_id', userId)
        .maybeSingle();
      setIsPro(Boolean(credits?.abonne));
    });
  }, []);

  if (isPro === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isPro) {
    return <ProTeaser accent={accent} />;
  }

  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();
  const prevY = curM === 0 ? curY - 1 : curY;
  const prevM = curM === 0 ? 11 : curM - 1;

  const currentBounds = { start: getMonthBounds(curY, curM).start, end: now.toISOString().split('T')[0] };
  const prevBounds = getMonthBounds(prevY, prevM);

  const currentLabel = new Date(curY, curM, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const prevLabel = new Date(prevY, prevM, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const [period, setPeriod] = useState<Period>('current');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState<'csv' | 'pdf' | null>(null);

  function getDateRange(): { start: string; end: string } | null {
    if (period === 'current') return currentBounds;
    if (period === 'previous') return prevBounds;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(customStart) || !dateRe.test(customEnd)) return null;
    if (customStart > customEnd) return null;
    return { start: customStart, end: customEnd };
  }

  async function fetchTransactions(): Promise<Transaction[] | null> {
    const range = getDateRange();
    if (!range) {
      Alert.alert(
        'Dates invalides',
        'Vérifie le format (AAAA-MM-JJ) et que le début précède la fin.',
      );
      return null;
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('date, categorie, description, montant, type')
      .gte('date', range.start)
      .lte('date', range.end)
      .order('date', { ascending: false });

    if (error) {
      Alert.alert('Erreur', 'Impossible de récupérer les transactions.');
      return null;
    }
    return (data ?? []).map((tx) => ({
      date: tx.date as string,
      categorie: tx.categorie as string,
      description: tx.description as string | null,
      montant: Number(tx.montant),
      type: tx.type as string,
    }));
  }

  async function handleCSV() {
    setLoading('csv');
    try {
      const transactions = await fetchTransactions();
      if (!transactions) return;

      const range = getDateRange()!;
      const csv = generateCSV(transactions);
      const filename = `bilan_${range.start}_${range.end}.csv`;

      const file = new File(Paths.cache, filename);
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exporter les transactions CSV',
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert('Erreur', "L'export CSV a échoué. Réessaie.");
    } finally {
      setLoading(null);
    }
  }

  async function handlePDF() {
    setLoading('pdf');
    try {
      const transactions = await fetchTransactions();
      if (!transactions) return;

      const range = getDateRange()!;
      const html = generatePDFHtml(transactions, userName, isFreelance, range.start, range.end);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exporter le rapport PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', "L'export PDF a échoué. Réessaie.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navClose}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Exporter mes données</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Période</Text>

        {/* Period selection card */}
        <Card style={styles.periodCard}>
          <Pressable style={styles.optionRow} onPress={() => setPeriod('current')}>
            <View style={[styles.radio, period === 'current' && { borderColor: accent }]}>
              {period === 'current' && (
                <View style={[styles.radioDot, { backgroundColor: accent }]} />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Mois en cours</Text>
              <Text style={styles.optionSub}>
                {currentLabel} · du 1 au {now.getDate()}
              </Text>
            </View>
          </Pressable>

          <View style={styles.sep} />

          <Pressable style={styles.optionRow} onPress={() => setPeriod('previous')}>
            <View style={[styles.radio, period === 'previous' && { borderColor: accent }]}>
              {period === 'previous' && (
                <View style={[styles.radioDot, { backgroundColor: accent }]} />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Mois précédent</Text>
              <Text style={styles.optionSub}>{prevLabel} — mois complet</Text>
            </View>
          </Pressable>

          <View style={styles.sep} />

          <Pressable style={styles.optionRow} onPress={() => setPeriod('custom')}>
            <View style={[styles.radio, period === 'custom' && { borderColor: accent }]}>
              {period === 'custom' && (
                <View style={[styles.radioDot, { backgroundColor: accent }]} />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Plage personnalisée</Text>
              <Text style={styles.optionSub}>Choisir les dates manuellement</Text>
            </View>
          </Pressable>

          {period === 'custom' && (
            <View style={styles.customBlock}>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Début</Text>
                <TextInput
                  style={[styles.dateInput, { borderColor: accent }]}
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  selectionColor={accent}
                />
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Fin</Text>
                <TextInput
                  style={[styles.dateInput, { borderColor: accent }]}
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  selectionColor={accent}
                />
              </View>
            </View>
          )}
        </Card>

        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Format</Text>

        {/* CSV */}
        <Pressable
          style={[styles.exportBtn, { borderColor: accent, opacity: loading ? 0.65 : 1 }]}
          onPress={handleCSV}
          disabled={!!loading}
        >
          <Text style={styles.exportIcon}>📊</Text>
          <View style={styles.exportText}>
            <Text style={[styles.exportTitle, { color: accent }]}>
              {loading === 'csv' ? 'Génération en cours…' : 'Export CSV'}
            </Text>
            <Text style={styles.exportSub}>Excel · Numbers · Google Sheets</Text>
          </View>
        </Pressable>

        {/* PDF */}
        <Pressable
          style={[styles.exportBtn, { borderColor: accent, opacity: loading ? 0.65 : 1 }]}
          onPress={handlePDF}
          disabled={!!loading}
        >
          <Text style={styles.exportIcon}>📄</Text>
          <View style={styles.exportText}>
            <Text style={[styles.exportTitle, { color: accent }]}>
              {loading === 'pdf' ? 'Génération en cours…' : 'Export PDF'}
            </Text>
            <Text style={styles.exportSub}>
              {isFreelance
                ? 'Rapport comptable · à partager avec ton comptable'
                : 'Rapport personnel · à conserver dans tes archives'}
            </Text>
          </View>
        </Pressable>

        {/* Karl note */}
        <Card
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: C.line,
            marginTop: 4,
          }}
        >
          <View style={styles.karlRow}>
            <KarlMascot size={30} color={accent} />
            <Text style={styles.karlText}>
              L'export contient toutes les transactions saisies sur la période — via le formulaire
              ou le chat.
              {isFreelance
                ? ' Le PDF inclut une mention comptable utile pour ton déclarant.'
                : ''}
            </Text>
          </View>
        </Card>
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

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 10 },

  sectionLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 2,
  },

  periodCard: { padding: 0, gap: 0 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  optionText: { flex: 1, gap: 3 },
  optionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: C.text },
  optionSub: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted },
  sep: { height: 1, backgroundColor: C.line, marginHorizontal: 16 },

  customBlock: { gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateLabel: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted, width: 34 },
  dateInput: {
    flex: 1,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: C.text,
    backgroundColor: C.surf2,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
  },
  exportIcon: { fontSize: 28 },
  exportText: { flex: 1, gap: 4 },
  exportTitle: { fontFamily: 'Sora_700Bold', fontSize: 15 },
  exportSub: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.muted },

  karlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  karlText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: C.muted,
    flex: 1,
  },
});
