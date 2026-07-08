import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KarlMascot } from '@/components/ui/KarlMascot';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing, RingLabel } from '@/components/ui/ProgressRing';
import { Tag } from '@/components/ui/Tag';
import { C, getChargeRate } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_FREELANCE = {
  balance: 8240,
  provisioned: 2411,
  urssafDue: 2411,
  daysLeft: 18,
  dueDate: '31 juil.',
  tvaWarning: { threshold: 36800, used: 34700 },
};
const MOCK_PERSO = {
  remaining: 640,
  spent: 345,
  reserved: 1115,
  daysLeft: 15,
  dueDate: '27 juil.',
  savingsGoal: { label: 'Vacances 🏝️', amount: 496, target: 800 },
  fixedDue: 915,
  categories: [
    { label: '🛒 Courses', amount: 180, pct: 0.6, color: C.purple },
    { label: '🍸 Sorties', amount: 95, pct: 0.8, color: C.warm },
    { label: '🚇 Transport', amount: 45, pct: 0.5, color: C.purple },
    { label: '✨ Divers', amount: 25, pct: 0.4, color: C.purple },
  ],
};

// ─── Freelance Dashboard ──────────────────────────────────────────────────────
function FreelanceDashboard() {
  const { userName, freelanceSetup, hasData } = useApp();
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
        <View>
          <Text style={styles.dateText}>Lundi 7 juillet</Text>
          <Text style={styles.greeting}>Salut {userName} 👋</Text>
        </View>
        <KarlMascot size={40} smug />
      </View>

      {/* Hero card */}
      <Card variant="hero" style={styles.heroCard}>
        <Text style={styles.heroLabel}>Dispo pour toi, vraiment</Text>
        <Text style={styles.heroAmount}>{available.toLocaleString('fr-FR')} €</Text>
        <Text style={styles.heroSub}>après provision de tes charges</Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Sur le compte <Text style={{ fontFamily: 'Sora_700Bold' }}>{MOCK_FREELANCE.balance.toLocaleString('fr-FR')} €</Text>
            </Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Provisionné <Text style={{ fontFamily: 'Sora_700Bold' }}>{MOCK_FREELANCE.provisioned.toLocaleString('fr-FR')} €</Text>
            </Text>
          </View>
        </View>
      </Card>

      {/* TVA warning */}
      <View style={styles.alert}>
        <Text style={styles.alertEmoji}>👀</Text>
        <Text style={styles.alertText}>
          Tu approches du <Text style={styles.warm}>seuil de TVA</Text> (36 800 €). Plus que{' '}
          <Text style={styles.boldText}>{tvaRemaining.toLocaleString('fr-FR')} €</Text> avant de devoir la facturer.
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
    </ScrollView>
  );
}

// ─── Perso Dashboard ──────────────────────────────────────────────────────────
function PersoDashboard() {
  const { userName, hasData } = useApp();
  const { remaining, spent, reserved, daysLeft, dueDate, savingsGoal, fixedDue, categories } =
    MOCK_PERSO;

  if (!hasData) return <PersoEmpty />;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>Lundi 12 juillet</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={styles.greeting}>Salut {userName} 👋</Text>
            <Tag variant="purple">Perso</Tag>
          </View>
        </View>
        <KarlMascot size={40} color={C.purple} smug />
      </View>

      {/* Hero */}
      <Card variant="hero" style={styles.heroCard}>
        <Text style={styles.heroLabel}>Reste à dépenser · ce mois</Text>
        <Text style={styles.heroAmount}>{remaining} €</Text>
        <Text style={styles.heroSub}>jusqu'au {dueDate} · encore {daysLeft} jours</Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Dépensé <Text style={{ fontFamily: 'Sora_700Bold' }}>{spent} €</Text>
            </Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              Réservé <Text style={{ fontFamily: 'Sora_700Bold' }}>{reserved} €</Text>
            </Text>
          </View>
        </View>
      </Card>

      {/* Alert */}
      <View style={styles.alert}>
        <Text style={styles.alertEmoji}>👀</Text>
        <Text style={styles.alertText}>
          Budget <Text style={styles.warm}>Sorties</Text> : 80 % cramé et on est le 12. On lève le pied ?
        </Text>
      </View>

      {/* Savings ring + Prélèvements */}
      <View style={styles.row2}>
        <Card style={[styles.gaugeCard, { flex: 1 }]}>
          <Text style={styles.cardMono}>Objectif · {savingsGoal.label}</Text>
          <ProgressRing
            progress={savingsGoal.amount / savingsGoal.target}
            size={112}
            color={C.purple}
          >
            <RingLabel
              value={Math.round((savingsGoal.amount / savingsGoal.target) * 100)}
              unit="%"
              color={C.purple}
            />
          </ProgressRing>
          <Text style={styles.cardSubText}>
            {savingsGoal.amount} € / {savingsGoal.target} €
          </Text>
        </Card>

        <Card style={[styles.echeanceCard, { flex: 1 }]}>
          <View style={styles.echeanceTop}>
            <Text style={styles.cardMono}>Prélèvements</Text>
            <Tag variant="purple">J-3</Tag>
          </View>
          <View>
            <Text style={styles.echeanceAmount}>{fixedDue} €</Text>
            <Text style={styles.echeanceSub}>loyer, abos, transport</Text>
          </View>
          <View style={{ gap: 5 }}>
            <ProgressBar progress={1} color={C.purple} />
            <Text style={styles.purpText}>Réservé ✅</Text>
          </View>
        </Card>
      </View>

      {/* Categories */}
      <Card style={{ gap: 12 }}>
        <Text style={styles.cardMono}>Où part ton argent · juillet</Text>
        <View style={{ gap: 11 }}>
          {categories.map((cat) => (
            <View key={cat.label} style={{ gap: 5 }}>
              <View style={styles.catRow}>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text
                  style={[
                    styles.catAmount,
                    cat.color === C.warm && { color: C.warm },
                  ]}
                >
                  {cat.amount} €
                </Text>
              </View>
              <ProgressBar progress={cat.pct} color={cat.color} height={7} />
            </View>
          ))}
        </View>
      </Card>

      {/* Quick actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={() => router.push('/(tabs)/add')}>
          <Text style={styles.purp}>+ </Text>
          <Text style={styles.actionText}>Entrée</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={() => router.push('/(tabs)/add')}>
          <Text style={styles.warm}>− </Text>
          <Text style={styles.actionText}>Dépense</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.askKarl, { borderColor: C.line }]} onPress={() => router.push('/(tabs)/chat')}>
        <KarlMascot size={30} color={C.purple} />
        <Text style={styles.askKarlText}>Demander à Karl…</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function FreelanceEmpty() {
  const { userName, setHasData } = useApp();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>Bienvenue</Text>
          <Text style={styles.greeting}>Salut {userName} 👋</Text>
        </View>
        <KarlMascot size={40} />
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
        <View>
          <Text style={styles.dateText}>Bienvenue</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={styles.greeting}>Salut {userName} 👋</Text>
            <Tag variant="purple">Perso</Tag>
          </View>
        </View>
        <KarlMascot size={40} color={C.purple} />
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

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { profile } = useApp();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {profile === 'perso' ? <PersoDashboard /> : <FreelanceDashboard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },
  greeting: { fontFamily: 'Sora_700Bold', fontSize: 19, color: C.text },

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
  heroSub: { fontFamily: 'Sora_400Regular', fontSize: 12, color: 'rgba(20,18,16,0.7)', marginTop: 2 },
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
  alertText: { fontFamily: 'Sora_400Regular', fontSize: 12, lineHeight: 17, color: C.text, flex: 1 },
  warm: { fontFamily: 'Sora_700Bold', color: C.warm },
  boldText: { fontFamily: 'Sora_700Bold', color: C.text },

  row2: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  gaugeCard: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  echeanceCard: { gap: 6, paddingVertical: 16, justifyContent: 'space-between' },
  echeanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  cardSubText: { fontFamily: 'Sora_400Regular', fontSize: 10.5, lineHeight: 14, color: C.muted, textAlign: 'center' },
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
});
