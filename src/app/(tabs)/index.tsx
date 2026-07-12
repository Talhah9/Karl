import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useComparaisonMois, type ComparaisonMois } from '@/hooks/useComparaisonMois';
import { useTrend30j, type TrendDay } from '@/hooks/useTrend30j';
import { useObjectifEpargne, type ObjectifEpargne } from '@/hooks/useObjectifEpargne';
import { useChargesFixes } from '@/hooks/useChargesFixes';
import { useCategoriesMois } from '@/hooks/useCategoriesMois';
import { useRecentTransactions } from '@/hooks/useRecentTransactions';
import { useTransactionsMois } from '@/hooks/useTransactionsMois';
import { SpendingChart } from '@/components/ui/SpendingChart';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing, RingLabel } from '@/components/ui/ProgressRing';
import { Tag } from '@/components/ui/Tag';
import { C, getChargeRate } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { getCatEmoji, getCatLabel } from '@/constants/categories';
import { useApp } from '@/context/AppContext';
import { getBudgetCycle } from '@/utils/budgetCycle';
import type { Transaction } from '@/hooks/useRecentTransactions';

// ─── Mock data (freelance only — real data pending bank connect) ──────────────
const MOCK_FREELANCE = {
  balance: 8240,
  provisioned: 2411,
  urssafDue: 2411,
  daysLeft: 18,
  dueDate: '31 juil.',
  tvaWarning: { threshold: 36800, used: 34700 },
};

// ─── Objectif d'épargne modal ─────────────────────────────────────────────────
function ObjectifModal({
  visible,
  initial,
  accent,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: ObjectifEpargne | null;
  accent: string;
  onSave: (v: Pick<ObjectifEpargne, 'label' | 'montant_cible' | 'montant_actuel'>) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [cible, setCible] = useState(initial ? String(initial.montant_cible) : '');
  const [actuel, setActuel] = useState(initial ? String(initial.montant_actuel) : '0');

  useEffect(() => {
    if (visible) {
      setLabel(initial?.label ?? '');
      setCible(initial ? String(initial.montant_cible) : '');
      setActuel(initial ? String(initial.montant_actuel) : '0');
    }
  }, [visible, initial]);

  function handleSave() {
    const cibleN = parseFloat(cible.replace(',', '.'));
    const actuelN = parseFloat(actuel.replace(',', '.'));
    if (!label.trim() || isNaN(cibleN) || cibleN <= 0) return;
    onSave({ label: label.trim(), montant_cible: cibleN, montant_actuel: isNaN(actuelN) ? 0 : actuelN });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={goalStyles.backdrop} onPress={onClose} />
        <View style={goalStyles.sheet}>
          <Text style={goalStyles.sheetTitle}>
            {initial ? "Modifier l'objectif" : "Nouvel objectif d'épargne"}
          </Text>

          <Text style={goalStyles.fieldLabel}>Nom de l'objectif</Text>
          <TextInput
            style={goalStyles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Ex : Vacances été 🏖"
            placeholderTextColor={C.muted}
          />

          <Text style={goalStyles.fieldLabel}>Montant cible (€)</Text>
          <TextInput
            style={goalStyles.input}
            value={cible}
            onChangeText={setCible}
            keyboardType="numeric"
            placeholder="3000"
            placeholderTextColor={C.muted}
          />

          <Text style={goalStyles.fieldLabel}>Épargné à ce jour (€)</Text>
          <TextInput
            style={goalStyles.input}
            value={actuel}
            onChangeText={setActuel}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.muted}
          />

          <View style={goalStyles.btnRow}>
            <Pressable style={goalStyles.cancelBtn} onPress={onClose}>
              <Text style={goalStyles.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[goalStyles.saveBtn, { backgroundColor: accent }]}
              onPress={handleSave}
            >
              <Text style={goalStyles.saveText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Savings goal card ────────────────────────────────────────────────────────
function SavingsGoalCard({
  accent,
  goal,
  save,
  loading,
}: {
  accent: string;
  goal: ObjectifEpargne | null;
  save: (v: Pick<ObjectifEpargne, 'label' | 'montant_cible' | 'montant_actuel'>) => Promise<void>;
  loading: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) return null;

  const pct = goal ? Math.min(1, goal.montant_actuel / goal.montant_cible) : 0;

  return (
    <>
      <Card style={[styles.gaugeCard, { flex: undefined }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardMono}>
            {goal ? `Objectif · ${goal.label}` : "Objectif d'épargne"}
          </Text>
          <Pressable onPress={() => setModalOpen(true)}>
            <Text style={[styles.cardMono, { color: accent }]}>
              {goal ? 'Modifier' : 'Définir'}
            </Text>
          </Pressable>
        </View>

        {goal ? (
          <>
            <ProgressRing progress={pct} size={112} color={accent}>
              <RingLabel value={`${Math.round(pct * 100)}`} unit="%" color={accent} />
            </ProgressRing>
            <Text style={styles.cardSubText}>
              {goal.montant_actuel.toLocaleString('fr-FR')} € / {goal.montant_cible.toLocaleString('fr-FR')} €
            </Text>
          </>
        ) : (
          <Text style={[styles.cardSubText, { paddingVertical: 16 }]}>
            Fixe un objectif pour voir ta progression ici.
          </Text>
        )}
      </Card>

      <ObjectifModal
        visible={modalOpen}
        initial={goal}
        accent={accent}
        onSave={save}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

// ─── Comparaison mensuelle ────────────────────────────────────────────────────
function ComparaisonRow({ data, loading }: { data: ComparaisonMois | null; loading: boolean }) {
  if (loading || !data) return null;
  if (data.mois_actuel === 0 && data.mois_precedent === 0) return null;

  const { delta_pct, mois_precedent_label, mois_actuel } = data;
  const isDown = delta_pct !== null && delta_pct <= 0;
  const pct = delta_pct !== null ? Math.abs(Math.round(delta_pct)) : null;

  const text =
    pct !== null
      ? isDown
        ? `📉  ${pct}% de moins qu'en ${mois_precedent_label}`
        : `📈  ${pct}% de plus qu'en ${mois_precedent_label}`
      : `🗓  ${mois_actuel.toLocaleString('fr-FR')} € dépensés · premier mois de suivi`;

  return (
    <View
      style={[
        cmpStyles.row,
        isDown || pct === null
          ? { borderColor: 'rgba(196,245,66,0.28)', backgroundColor: 'rgba(196,245,66,0.06)' }
          : { borderColor: 'rgba(255,122,77,0.28)', backgroundColor: 'rgba(255,122,77,0.06)' },
      ]}
    >
      <Text style={[cmpStyles.text, { color: isDown || pct === null ? C.lime : C.warm }]}>
        {text}
      </Text>
      {pct !== null && (
        <Text style={cmpStyles.sub}>
          vs {mois_precedent_label} ({data.mois_precedent.toLocaleString('fr-FR')} €)
        </Text>
      )}
    </View>
  );
}

// ─── Trend card ───────────────────────────────────────────────────────────────
function TrendCard({ accent, data, loading }: { accent: string; data: TrendDay[]; loading: boolean }) {
  if (loading) return null;
  const hasAny = data.some((d) => d.total > 0);
  if (!hasAny) return null;

  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.cardMono}>Dépenses · 30 derniers jours</Text>
        <Text style={[styles.cardMono, { color: accent }]}>
          {total.toLocaleString('fr-FR')} €
        </Text>
      </View>
      <SpendingChart data={data} color={accent} height={72} />
    </Card>
  );
}

// ─── Transactions récentes card ───────────────────────────────────────────────
function fmtDateShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function TransactionsCard({ txs, accent, loading }: { txs: Transaction[]; accent: string; loading: boolean }) {
  if (loading || txs.length === 0) return null;

  const preview = txs.slice(0, 7);

  return (
    <Card style={{ gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }}>
      <View style={txStyles.header}>
        <Text style={txStyles.mono}>Transactions récentes</Text>
        <Pressable onPress={() => router.push('/transactions')}>
          <Text style={[txStyles.mono, { color: accent }]}>Voir tout →</Text>
        </Pressable>
      </View>
      {preview.map((tx, i) => (
        <Pressable
          key={tx.id}
          style={[txStyles.row, i < preview.length - 1 && txStyles.rowBorder]}
          onPress={() => router.push(`/transaction/${tx.id}`)}
        >
          <View style={txStyles.rowLeft}>
            <Text style={txStyles.emoji}>{getCatEmoji(tx.categorie)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={txStyles.label} numberOfLines={1}>
                {getCatLabel(tx.categorie)}{tx.exceptionnelle ? ' ⚡' : ''}
              </Text>
              {tx.description ? (
                <Text style={txStyles.desc} numberOfLines={1}>{tx.description}</Text>
              ) : null}
            </View>
          </View>
          <View style={txStyles.rowRight}>
            <Text style={[txStyles.amount, { color: tx.type === 'depense' ? C.text : accent }]}>
              {tx.type === 'depense' ? '−' : '+'} {tx.montant.toLocaleString('fr-FR')} €
            </Text>
            <Text style={txStyles.date}>{fmtDateShort(tx.date)}</Text>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

// ─── Premium card ────────────────────────────────────────────────────────────
function PremiumCard() {
  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userId = session?.user?.id;
      if (!userId) { setIsPro(false); return; }
      const { data } = await supabase
        .from('credits_utilisateur')
        .select('abonne')
        .eq('user_id', userId)
        .maybeSingle();
      setIsPro(data ? Boolean((data as any).abonne) : false);
    });
  }, []);

  if (isPro === null || isPro === true) return null;

  const PERKS = [
    { emoji: '💬', label: 'Discussions illimitées avec Karl' },
    { emoji: '🎁', label: 'Bilan mensuel partageable' },
    { emoji: '📄', label: 'Export CSV/PDF pour ton comptable ou tes archives' },
    { emoji: '✨', label: 'Accès prioritaire aux nouvelles fonctionnalités' },
  ];

  return (
    <Card style={premStyles.card}>
      <Text style={premStyles.title}>Débloquez toutes les{'\n'}fonctionnalités premium</Text>
      <View style={premStyles.perks}>
        {PERKS.map((p) => (
          <View key={p.emoji} style={premStyles.perkRow}>
            <Text style={premStyles.perkEmoji}>{p.emoji}</Text>
            <Text style={premStyles.perkLabel}>{p.label}</Text>
          </View>
        ))}
      </View>
      <View style={premStyles.footer}>
        <Text style={premStyles.price}>6,99 € / mois</Text>
        <Pressable style={premStyles.btn} onPress={() => router.push('/paywall')}>
          <Text style={premStyles.btnText}>Découvrir Karl Pro</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Revenues / dépenses du mois ─────────────────────────────────────────────
function TxMoisSection({
  title,
  txs,
  total,
  accent,
  emptyMsg,
  loading,
}: {
  title: string;
  txs: import('@/hooks/useRecentTransactions').Transaction[];
  total: number;
  accent: string;
  emptyMsg: string;
  loading: boolean;
}) {
  if (loading) return null;

  return (
    <Card style={{ gap: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }}>
      {/* Header */}
      <View style={txMoisStyles.header}>
        <View>
          <Text style={txMoisStyles.mono}>{title}</Text>
          {total > 0 && (
            <Text style={[txMoisStyles.total, { color: accent }]}>
              {total.toLocaleString('fr-FR')} €
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/add')}
          style={[txMoisStyles.addBtn, { backgroundColor: accent + '22', borderColor: accent + '55' }]}
        >
          <Text style={[txMoisStyles.addBtnText, { color: accent }]}>+</Text>
        </Pressable>
      </View>

      {txs.length === 0 ? (
        <Pressable style={txMoisStyles.emptyRow} onPress={() => router.push('/(tabs)/add')}>
          <Text style={txMoisStyles.emptyText}>{emptyMsg}</Text>
        </Pressable>
      ) : (
        txs.slice(0, 5).map((tx, i) => (
          <Pressable
            key={tx.id}
            style={[txMoisStyles.row, i < Math.min(txs.length, 5) - 1 && txMoisStyles.rowBorder]}
            onPress={() => router.push(`/transaction/${tx.id}`)}
          >
            <View style={txMoisStyles.rowLeft}>
              <Text style={txMoisStyles.rowEmoji}>{getCatEmoji(tx.categorie)}</Text>
              <Text style={txMoisStyles.rowLabel} numberOfLines={1}>
                {tx.description || getCatLabel(tx.categorie)}
              </Text>
            </View>
            <Text style={[txMoisStyles.rowAmount, { color: accent }]}>
              {tx.type === 'depense' ? '−' : '+'} {tx.montant.toLocaleString('fr-FR')} €
            </Text>
          </Pressable>
        ))
      )}
      {txs.length > 5 && (
        <Pressable style={txMoisStyles.moreRow} onPress={() => router.push('/transactions')}>
          <Text style={[txMoisStyles.moreText, { color: accent }]}>
            Voir les {txs.length - 5} autres →
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

// ─── Freelance Dashboard ──────────────────────────────────────────────────────
function FreelanceDashboard() {
  const { userName, freelanceSetup, hasData } = useApp();
  const { goal, loading: goalLoading, save: saveGoal } = useObjectifEpargne();
  const { data: trendData, loading: trendLoading } = useTrend30j();
  const { data: cmpData, loading: cmpLoading } = useComparaisonMois();

  const rate = getChargeRate(
    freelanceSetup.status,
    freelanceSetup.versementLiberatoire,
    freelanceSetup.acre
  );
  const available = MOCK_FREELANCE.balance - MOCK_FREELANCE.provisioned;
  const tvaRemaining =
    MOCK_FREELANCE.tvaWarning.threshold - MOCK_FREELANCE.tvaWarning.used;

  if (!hasData) return <FreelanceEmpty />;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <KarlMascot size={40} smug />
        </Pressable>
        <View>
          <Text style={styles.dateText}>Lundi 7 juillet</Text>
          <Text style={styles.greeting}>Salut {userName} 👋</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero card */}
      <Card variant="hero" style={styles.heroCard}>
        <Text style={styles.heroLabel}>Dispo pour toi, vraiment</Text>
        <Text style={styles.heroAmount}>{available.toLocaleString('fr-FR')} €</Text>
        <Text style={styles.heroSub}>après provision de tes charges</Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Sur le compte{' '}
              <Text style={{ fontFamily: 'Sora_700Bold' }}>
                {MOCK_FREELANCE.balance.toLocaleString('fr-FR')} €
              </Text>
            </Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Provisionné{' '}
              <Text style={{ fontFamily: 'Sora_700Bold' }}>
                {MOCK_FREELANCE.provisioned.toLocaleString('fr-FR')} €
              </Text>
            </Text>
          </View>
        </View>
      </Card>

      <ComparaisonRow data={cmpData} loading={cmpLoading} />

      {/* TVA warning */}
      <View style={styles.alert}>
        <Text style={styles.alertEmoji}>👀</Text>
        <Text style={styles.alertText}>
          Tu approches du <Text style={styles.warm}>seuil de TVA</Text> (36 800 €). Plus que{' '}
          <Text style={styles.boldText}>{tvaRemaining.toLocaleString('fr-FR')} €</Text> avant de
          devoir la facturer.
        </Text>
      </View>

      {/* Gauge + Échéance */}
      <View style={styles.row2}>
        <Card style={[styles.gaugeCard, { flex: 1 }]}>
          <Text style={styles.cardMono}>À mettre de côté</Text>
          <ProgressRing progress={rate} size={112} color={C.lime}>
            <RingLabel value={`${Math.round(rate * 100)}`} unit="%" />
          </ProgressRing>
          <Text style={styles.cardSubText}>sur chaque rentrée</Text>
        </Card>

        <Card style={[styles.echeanceCard, { flex: 1 }]}>
          <View style={styles.echeanceTop}>
            <Text style={styles.cardMono}>URSSAF · T2</Text>
            <Tag variant="lime">J-{MOCK_FREELANCE.daysLeft}</Tag>
          </View>
          <View>
            <Text style={styles.echeanceAmount}>
              {MOCK_FREELANCE.urssafDue.toLocaleString('fr-FR')} €
            </Text>
            <Text style={styles.echeanceSub}>échéance {MOCK_FREELANCE.dueDate}</Text>
          </View>
          <View style={{ gap: 5 }}>
            <ProgressBar progress={1} color={C.lime} />
            <Text style={styles.limeText}>Provisionné à 100 % ✅</Text>
          </View>
        </Card>
      </View>

      <TrendCard accent={C.lime} data={trendData} loading={trendLoading} />
      <SavingsGoalCard accent={C.lime} goal={goal} save={saveGoal} loading={goalLoading} />

      {/* Quick actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={() => router.push('/(tabs)/add')}>
          <Text style={styles.lime}>+ </Text>
          <Text style={styles.actionText}>Revenu</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={() => router.push('/(tabs)/add')}>
          <Text style={styles.warm}>− </Text>
          <Text style={styles.actionText}>Dépense</Text>
        </Pressable>
      </View>

      <Pressable style={styles.askKarl} onPress={() => router.push('/(tabs)/chat')}>
        <KarlMascot size={30} />
        <Text style={styles.askKarlText}>Demander à Karl…</Text>
      </Pressable>

      <Pressable style={styles.bilanBtn} onPress={() => router.push('/bilan')}>
        <Text style={styles.bilanBtnTxt}>🎁  Voir mon bilan du mois</Text>
      </Pressable>

      <Pressable style={styles.exportLink} onPress={() => router.push('/export')}>
        <Text style={styles.exportLinkText}>↗ Exporter mes données (CSV / PDF)</Text>
      </Pressable>

      <PremiumCard />
    </ScrollView>
  );
}

// ─── Perso Dashboard ──────────────────────────────────────────────────────────
function PersoDashboard() {
  const { userName, persoSetup, hasData } = useApp();
  const { total: chargesTotal, charges, loading: chargesLoading, refresh: refreshCharges } = useChargesFixes();
  const { goal, loading: goalLoading, save: saveGoal, refresh: refreshGoal } = useObjectifEpargne();
  const { data: catData, totalDepenses, loading: catLoading, refresh: refreshCat } = useCategoriesMois();
  const { data: trendData, loading: trendLoading, refresh: refreshTrend } = useTrend30j();
  const { data: cmpData, loading: cmpLoading, refresh: refreshCmp } = useComparaisonMois();
  const { data: txData, loading: txLoading, refresh: refreshTx } = useRecentTransactions(7);
  const { revenus, depenses, totalRevenus, loading: txMoisLoading, refresh: refreshTxMois } = useTransactionsMois();

  useFocusEffect(
    useCallback(() => {
      refreshCharges();
      refreshGoal();
      refreshCat();
      refreshTrend();
      refreshCmp();
      refreshTx();
      refreshTxMois();
    }, [refreshCharges, refreshGoal, refreshCat, refreshTrend, refreshCmp, refreshTx, refreshTxMois])
  );

  const salary = persoSetup.netSalary;
  const savingsGoal = goal?.montant_cible ?? 0;
  // Same formula as Karl: salary − fixed charges − savings goal − variable spending
  const available = salary - chargesTotal - savingsGoal - totalDepenses;

  const budgetEnvelope = salary - chargesTotal - savingsGoal; // total variable budget (without spending)
  const budgetPct =
    budgetEnvelope > 0 && catData.length > 0
      ? Math.round((totalDepenses / budgetEnvelope) * 100)
      : 0;

  const cycle = getBudgetCycle(persoSetup.payday);
  const monthLabel = cycle.cycleLabel;

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  if (!hasData) return <PersoEmpty />;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <KarlMascot size={40} color={C.purple} smug />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={styles.greeting}>Salut {userName} 👋</Text>
            <Tag variant="purple">Perso</Tag>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero */}
      <Card variant="hero" style={styles.heroCard}>
        <Text style={styles.heroLabel}>Il te reste ce mois</Text>
        <Text style={styles.heroAmount}>
          {chargesLoading || goalLoading || catLoading ? '— ' : available.toLocaleString('fr-FR')} €
        </Text>
        <Text style={styles.heroSub}>après charges, épargne et dépenses</Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Charges{' '}
              <Text style={{ fontFamily: 'Sora_700Bold' }}>
                {chargesLoading ? '…' : chargesTotal.toLocaleString('fr-FR')} €
              </Text>
            </Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Épargne{' '}
              <Text style={{ fontFamily: 'Sora_700Bold' }}>
                {goalLoading ? '…' : savingsGoal.toLocaleString('fr-FR')} €
              </Text>
            </Text>
          </View>
        </View>
      </Card>

      <ComparaisonRow data={cmpData} loading={cmpLoading} />

      {/* Alert — computed from real spending */}
      {catData.length > 0 && available > 0 && (
        <View style={styles.alert}>
          <Text style={styles.alertEmoji}>{budgetPct >= 80 ? '⚠️' : '📊'}</Text>
          <Text style={styles.alertText}>
            <Text style={styles.warm}>{budgetPct} %</Text> du budget variable dépensé ce mois
            {budgetPct >= 80 ? ' — on lève le pied ?' : '.'}
          </Text>
        </View>
      )}

      {/* Revenus du mois */}
      <TxMoisSection
        title="Revenus · ce mois"
        txs={revenus}
        total={totalRevenus}
        accent={C.purple}
        emptyMsg="Aucun revenu enregistré ce mois-ci. Touche + pour en ajouter."
        loading={txMoisLoading}
      />

      {/* Dépenses du mois */}
      <TxMoisSection
        title="Dépenses · ce mois"
        txs={depenses}
        total={totalDepenses}
        accent={C.warm}
        emptyMsg="Aucune dépense enregistrée. Touche + pour en ajouter."
        loading={txMoisLoading}
      />

      {/* Savings goal */}
      <SavingsGoalCard accent={C.purple} goal={goal} save={saveGoal} loading={goalLoading} />

      {/* Prélèvements */}
      <Card style={styles.echeanceCard}>
        <View style={styles.echeanceTop}>
          <Text style={styles.cardMono}>Prélèvements fixes</Text>
          {charges.length > 0 && (
            <Tag variant="purple">
              {charges.length} charge{charges.length > 1 ? 's' : ''}
            </Tag>
          )}
        </View>
        <View>
          <Text style={styles.echeanceAmount}>
            {chargesLoading ? '— ' : chargesTotal.toLocaleString('fr-FR')} €
          </Text>
          <Text style={styles.echeanceSub}>
            {charges.length > 0
              ? charges.slice(0, 3).map((c) => c.nom).join(', ') +
                (charges.length > 3 ? '…' : '')
              : 'Aucune charge enregistrée'}
          </Text>
        </View>
        <View style={{ gap: 5 }}>
          <ProgressBar progress={chargesTotal > 0 ? 1 : 0} color={C.purple} />
          {chargesTotal > 0 && <Text style={styles.purpText}>Réservé ✅</Text>}
        </View>
      </Card>

      {/* Categories — real data from transactions */}
      {catData.length > 0 && (
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardMono}>Où part ton argent · {monthLabel}</Text>
          <View style={{ gap: 11 }}>
            {catData.slice(0, 5).map((cat) => {
              const pct = available > 0 ? Math.min(1, cat.total / available) : 0;
              const barColor = pct > 0.3 ? C.warm : C.purple;
              return (
                <View key={cat.categorie} style={{ gap: 5 }}>
                  <View style={styles.catRow}>
                    <Text style={styles.catLabel}>
                      {getCatEmoji(cat.categorie)} {getCatLabel(cat.categorie)}
                    </Text>
                    <Text style={[styles.catAmount, pct > 0.3 && { color: C.warm }]}>
                      {cat.total.toLocaleString('fr-FR')} €
                    </Text>
                  </View>
                  <ProgressBar progress={pct} color={barColor} height={7} />
                </View>
              );
            })}
          </View>
        </Card>
      )}

      <TransactionsCard txs={txData} accent={C.purple} loading={txLoading} />

      <TrendCard accent={C.purple} data={trendData} loading={trendLoading} />

      {/* Quick actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { flex: 1 }]}
          onPress={() => router.push('/(tabs)/add')}
        >
          <Text style={styles.purp}>+ </Text>
          <Text style={styles.actionText}>Entrée</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { flex: 1 }]}
          onPress={() => router.push('/(tabs)/add')}
        >
          <Text style={styles.warm}>− </Text>
          <Text style={styles.actionText}>Dépense</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.askKarl, { borderColor: C.line }]}
        onPress={() => router.push('/(tabs)/chat')}
      >
        <KarlMascot size={30} color={C.purple} />
        <Text style={styles.askKarlText}>Demander à Karl…</Text>
      </Pressable>

      <Pressable style={styles.bilanBtn} onPress={() => router.push('/bilan')}>
        <Text style={styles.bilanBtnTxt}>🎁  Voir mon bilan du mois</Text>
      </Pressable>

      <Pressable
        style={styles.exportLink}
        onPress={() => router.push('/export')}
      >
        <Text style={styles.exportLinkText}>↗ Exporter mes données (CSV / PDF)</Text>
      </Pressable>

      <PremiumCard />
    </ScrollView>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function FreelanceEmpty() {
  const { userName, setHasData } = useApp();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <KarlMascot size={40} smug />
        </Pressable>
        <View>
          <Text style={styles.dateText}>Bienvenue</Text>
          <Text style={styles.greeting}>Salut {userName} 👋</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Card style={styles.emptyCard}>
        <KarlMascot size={78} />
        <Text style={styles.emptyText}>
          On commence par du concret.{' '}
          <Text style={{ fontFamily: 'Sora_700Bold', color: C.text }}>
            Balance-moi ton premier encaissement
          </Text>{' '}
          et je te dis direct combien mettre de côté.
        </Text>
      </Card>

      <Card style={styles.ghostCard}>
        <Text style={styles.ghostLabel}>Dispo pour toi, vraiment</Text>
        <Text style={styles.ghostAmount}>— €</Text>
        <ProgressBar progress={0} />
      </Card>

      <Button onPress={() => setHasData(true)}>+ Ajouter mon premier revenu</Button>
      <Button variant="ghost">Importer un relevé</Button>
      <Text style={styles.legal}>Estimations indicatives · pas un conseil réglementé</Text>
    </ScrollView>
  );
}

function PersoEmpty() {
  const { userName, setHasData } = useApp();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <KarlMascot size={40} color={C.purple} smug />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.dateText}>Bienvenue</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={styles.greeting}>Salut {userName} 👋</Text>
            <Tag variant="purple">Perso</Tag>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Card
        style={{
          ...styles.emptyCard,
          backgroundColor: 'rgba(167,139,250,0.07)',
          borderColor: 'rgba(167,139,250,0.22)',
        }}
      >
        <KarlMascot size={78} color={C.purple} />
        <Text style={styles.emptyText}>
          On démarre. Dis-moi{' '}
          <Text style={{ fontFamily: 'Sora_700Bold', color: C.text }}>
            ce qui tombe et ce qui part
          </Text>
          , et je te montre ce qu'il te reste vraiment jusqu'à la fin du mois.
        </Text>
      </Card>

      <Card style={styles.ghostCard}>
        <Text style={styles.ghostLabel}>Reste à dépenser · ce mois</Text>
        <Text style={styles.ghostAmount}>— €</Text>
        <ProgressBar progress={0} />
      </Card>

      <Button accentColor={C.purple} onPress={() => setHasData(true)}>
        Ajouter mon salaire
      </Button>
      <Button variant="ghost">Ajouter une dépense</Button>
      <Text style={styles.legal}>Estimations indicatives · pas un conseil réglementé</Text>
    </ScrollView>
  );
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS: Record<string, Array<{ emoji: string; title: string; body: string }>> = {
  freelance: [
    {
      emoji: '💰',
      title: 'Ton dispo net, en temps réel',
      body: "En haut, c'est ce que tu peux vraiment dépenser — après avoir mis tes charges de côté automatiquement.",
    },
    {
      emoji: '⚡',
      title: 'Revenu ou dépense en 2 taps',
      body: "Les boutons en bas de l'écran t'y emmènent direct. Rapide, sans friction.",
    },
    {
      emoji: '🤖',
      title: 'Karl est là pour toi',
      body: "Pose-lui n'importe quelle question sur tes finances. Il répond comme un pote qui a fait de la compta.",
    },
  ],
  perso: [
    {
      emoji: '💰',
      title: "Ce qu'il te reste ce mois",
      body: "En haut, c'est ce que tu peux encore dépenser jusqu'à la fin du mois — pas juste ce qui est sur ton compte.",
    },
    {
      emoji: '⚡',
      title: 'Entrée ou dépense en 2 taps',
      body: "Les boutons en bas de l'écran t'y emmènent direct. Simple et rapide.",
    },
    {
      emoji: '🤖',
      title: 'Karl est là pour toi',
      body: "Pose-lui n'importe quelle question sur ton budget. Il répond sans jargon.",
    },
  ],
};

function DashboardTutorial({
  visible,
  profile,
  onDone,
}: {
  visible: boolean;
  profile: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const steps = TUTORIAL_STEPS[profile] ?? TUTORIAL_STEPS.freelance;
  const accent = profile === 'perso' ? C.purple : C.lime;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  function next() {
    if (isLast) onDone();
    else setStep((s) => s + 1);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={tutStyles.backdrop}>
        <View style={tutStyles.card}>
          <Text style={tutStyles.emoji}>{current.emoji}</Text>
          <View style={tutStyles.textBlock}>
            <Text style={tutStyles.tutTitle}>{current.title}</Text>
            <Text style={tutStyles.tutBody}>{current.body}</Text>
          </View>
          <View style={tutStyles.dots}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[tutStyles.dot, i === step && { backgroundColor: accent, width: 16 }]}
              />
            ))}
          </View>
          <Pressable style={[tutStyles.btn, { backgroundColor: accent }]} onPress={next}>
            <Text style={tutStyles.btnText}>{isLast ? "C'est parti !" : 'Suivant'}</Text>
          </Pressable>
          {!isLast && (
            <Pressable onPress={onDone}>
              <Text style={tutStyles.skip}>Passer</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { profile, onboardingDone, tutorialDone, setTutorialDone, isAnonymous, hasSeenAuthPrompt, setHasSeenAuthPrompt } = useApp();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    if (onboardingDone && !tutorialDone) {
      setShowTutorial(true);
    }
  }, [onboardingDone, tutorialDone]);

  useEffect(() => {
    if (onboardingDone && isAnonymous === true && !hasSeenAuthPrompt && !showTutorial) {
      const timer = setTimeout(() => setShowAuthPrompt(true), 800);
      return () => clearTimeout(timer);
    }
  }, [onboardingDone, isAnonymous, hasSeenAuthPrompt, showTutorial]);

  function handleTutorialDone() {
    setShowTutorial(false);
    setTutorialDone(true);
  }

  function dismissAuthPrompt() {
    setShowAuthPrompt(false);
    setHasSeenAuthPrompt(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile === 'perso' ? <PersoDashboard /> : <FreelanceDashboard />}
      <DashboardTutorial
        visible={showTutorial}
        profile={profile ?? 'freelance'}
        onDone={handleTutorialDone}
      />
      <Modal visible={showAuthPrompt} transparent animationType="slide" statusBarTranslucent>
        <Pressable style={styles.authPromptOverlay} onPress={dismissAuthPrompt}>
          <Pressable style={styles.authPromptCard} onPress={() => {}}>
            <KarlMascot size={44} color={C.purple} />
            <Text style={styles.authPromptTitle}>Sauvegarde tes données 💜</Text>
            <Text style={styles.authPromptSub}>
              Tu es en mode anonyme. Crée un compte gratuit pour ne jamais perdre tes transactions, charges et objectifs.
            </Text>
            <Pressable
              style={styles.authPromptBtn}
              onPress={() => { dismissAuthPrompt(); router.push('/auth/save'); }}
            >
              <Text style={styles.authPromptBtnText}>Créer un compte gratuit</Text>
            </Pressable>
            <Pressable onPress={dismissAuthPrompt} style={{ paddingTop: 4 }}>
              <Text style={styles.authPromptLater}>Plus tard →</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gearIcon: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },
  dateText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },
  greeting: { fontFamily: 'Sora_700Bold', fontSize: 19, color: C.text },

  authPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,6,4,0.65)',
    justifyContent: 'flex-end',
  },
  authPromptCard: {
    backgroundColor: C.surf,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: C.line,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    paddingBottom: 40,
  },
  authPromptTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  authPromptSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  authPromptBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  authPromptBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.dark },
  authPromptLater: { fontFamily: 'Sora_400Regular', fontSize: 13, color: C.muted },

  heroCard: { gap: 4 },
  heroLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: 'rgba(20,18,16,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  heroAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 46,
    color: C.dark,
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  heroSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: 'rgba(20,18,16,0.7)',
    marginTop: 2,
  },
  heroPills: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  heroPill: {
    backgroundColor: 'rgba(20,18,16,0.12)',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  heroPillText: { fontFamily: 'Sora_400Regular', fontSize: 11, color: C.dark },

  alert: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,122,77,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,77,0.3)',
    borderRadius: 16,
    padding: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  alertEmoji: { fontSize: 18 },
  alertText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: C.text,
    flex: 1,
  },
  warm: { fontFamily: 'Sora_700Bold', color: C.warm },
  boldText: { fontFamily: 'Sora_700Bold', color: C.text },

  row2: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  gaugeCard: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  echeanceCard: { gap: 6, paddingVertical: 16, justifyContent: 'space-between' },
  echeanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  echeanceAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 28,
    color: C.text,
    letterSpacing: -0.8,
  },
  echeanceSub: { fontFamily: 'Sora_400Regular', fontSize: 10.5, color: C.muted },
  cardMono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  cardSubText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10.5,
    lineHeight: 14,
    color: C.muted,
    textAlign: 'center',
  },
  limeText: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: C.lime },
  purpText: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: C.purple },

  catRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catLabel: { fontFamily: 'Sora_400Regular', fontSize: 12.5, color: C.text },
  catAmount: { fontFamily: 'Sora_700Bold', fontSize: 12.5, color: C.text },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    backgroundColor: C.surf2,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: C.text },
  lime: { fontFamily: 'Sora_700Bold', fontSize: 17, color: C.lime },
  purp: { fontFamily: 'Sora_700Bold', fontSize: 17, color: C.purple },

  askKarl: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 26,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
  },
  askKarlText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: C.text },

  emptyCard: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 26,
    backgroundColor: 'rgba(196,245,66,0.05)',
    borderColor: 'rgba(196,245,66,0.18)',
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: C.text,
    textAlign: 'center',
    maxWidth: 220,
  },
  ghostCard: {
    gap: 4,
    opacity: 0.5,
    backgroundColor: C.surf,
    borderColor: C.line,
  },
  ghostLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  ghostAmount: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 42,
    color: C.muted,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  legal: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  bilanBtn: {
    backgroundColor: C.surf2,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 26,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bilanBtnTxt: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: C.text,
  },
  exportLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  exportLinkText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: C.muted,
    textDecorationLine: 'underline',
  },
});

const goalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,6,4,0.55)',
  },
  sheet: {
    backgroundColor: C.surf,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.line,
  },
  sheetTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 17,
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  fieldLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 15,
    color: C.text,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
    color: C.muted,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: C.dark,
  },
});

const cmpStyles = StyleSheet.create({
  row: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  text: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
  },
  sub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: C.muted,
  },
});

const tutStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,6,4,0.75)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 44,
  },
  card: {
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 24,
    padding: 28,
    gap: 20,
    alignItems: 'center',
  },
  emoji: { fontSize: 52 },
  textBlock: { gap: 8, alignItems: 'center' },
  tutTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20,
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tutBody: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: C.muted,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.line,
  },
  btn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: C.dark,
  },
  skip: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.muted,
  },
});

const premStyles = StyleSheet.create({
  card: {
    gap: 14,
    backgroundColor: 'rgba(196,245,66,0.05)',
    borderColor: 'rgba(196,245,66,0.20)',
  },
  title: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 16,
    color: C.text,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  perks: { gap: 9 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  perkEmoji: { fontSize: 15, width: 22 },
  perkLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.text,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,245,66,0.18)',
    paddingTop: 12,
    marginTop: 2,
  },
  price: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
    color: C.muted,
  },
  btn: {
    backgroundColor: C.lime,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  btnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
    color: C.dark,
  },
});

const txMoisStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  mono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  total: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontFamily: 'Sora_700Bold', fontSize: 16 },
  emptyRow: {
    paddingHorizontal: 15,
    paddingVertical: 16,
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    color: C.muted,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowEmoji: { fontSize: 16 },
  rowLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12.5,
    color: C.text,
    flex: 1,
  },
  rowAmount: { fontFamily: 'Sora_700Bold', fontSize: 13 },
  moreRow: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  moreText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
  },
});

const txStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  mono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
  emoji: { fontSize: 18 },
  label: { fontFamily: 'Sora_600SemiBold', fontSize: 12.5, color: C.text },
  desc: { fontFamily: 'Sora_400Regular', fontSize: 10.5, color: C.muted, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  amount: { fontFamily: 'Sora_700Bold', fontSize: 13 },
  date: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8.5,
    color: C.muted,
  },
});
