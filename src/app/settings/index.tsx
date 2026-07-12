import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useChargesFixes } from '@/hooks/useChargesFixes';
import { useObjectifEpargne } from '@/hooks/useObjectifEpargne';

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_VERSION = '1.0.0';

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBlock}>{children}</View>
    </View>
  );
}

// ─── Row item ─────────────────────────────────────────────────────────────────
function Row({
  label,
  value,
  onPress,
  danger,
  last,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const inner = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {onPress ? <Text style={styles.rowChevron}>›</Text> : null}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{inner}</Pressable>;
  }
  return inner;
}

// ─── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteAccountModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.deleteOverlay}>
      <View style={styles.deleteCard}>
        <Text style={styles.deleteTitle}>Supprimer mon compte</Text>
        <Text style={styles.deleteSub}>
          Cette action est irréversible. Toutes tes transactions, charges et objectifs seront définitivement supprimés.
        </Text>
        <Text style={styles.deleteHint}>
          Tape <Text style={{ fontFamily: 'Sora_700Bold', color: C.warm }}>SUPPRIMER</Text> pour confirmer.
        </Text>
        <TextInput
          style={styles.deleteInput}
          value={text}
          onChangeText={setText}
          placeholder="SUPPRIMER"
          placeholderTextColor={C.muted}
          autoCapitalize="characters"
        />
        <View style={styles.deleteBtns}>
          <Pressable style={styles.deleteCancelBtn} onPress={() => { setText(''); onCancel(); }}>
            <Text style={styles.deleteCancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.deleteConfirmBtn, text !== 'SUPPRIMER' && { opacity: 0.4 }]}
            onPress={() => { if (text === 'SUPPRIMER') { setText(''); onConfirm(); } }}
            disabled={text !== 'SUPPRIMER'}
          >
            <Text style={styles.deleteConfirmText}>Supprimer</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { profile, persoSetup, reset, isAnonymous } = useApp();
  const { charges, total: chargesTotal } = useChargesFixes();
  const { goal } = useObjectifEpargne();
  const accent = profile === 'perso' ? C.purple : C.lime;

  const [email, setEmail] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ restants: number; max: number } | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userId = session?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from('credits_utilisateur')
        .select('credits_restants, credits_max, abonne')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setCredits({ restants: data.credits_restants as number, max: data.credits_max as number });
        setIsPro(Boolean(data.abonne));
      }
    });
  }, [isAnonymous]); // refresh when anonymous state changes (e.g. after account creation)

  function handleLogout() {
    Alert.alert(
      'Se déconnecter',
      'Tes données restent sauvegardées et seront restaurées à la reconnexion.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/auth/sign-in');
          },
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    setShowDeleteModal(false);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    await Promise.all([
      supabase.from('transactions').delete().eq('user_id', userId),
      supabase.from('charges_fixes').delete().eq('user_id', userId),
      supabase.from('objectifs_epargne').delete().eq('user_id', userId),
      supabase.from('credits_utilisateur').delete().eq('user_id', userId),
    ]);
    await supabase.auth.signOut();
    reset();
    router.replace('/onboarding/profile');
  }

  const creditsPct = credits ? credits.restants / credits.max : 0;
  const creditColor = creditsPct >= 0.5 ? accent : creditsPct >= 0.2 ? C.warm : '#EF4444';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navBack}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Réglages</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ── COMPTE ── */}
        {isAnonymous === null ? (
          <Section title="Compte">
            <Row label="Non connecté" last={false} />
            <Row
              label="Se connecter"
              onPress={() => router.push('/auth/sign-in')}
              last
            />
          </Section>
        ) : isAnonymous === true ? (
          <Section title="Compte">
            <Row
              label="Compte non sauvegardé"
              value="Anonyme"
              last={false}
            />
            <Row
              label="Créer un compte pour sauvegarder"
              onPress={() => router.push('/auth/save')}
              last={false}
            />
            <Row
              label="Déjà un compte ? Se connecter"
              onPress={() => router.push('/auth/sign-in')}
              last
            />
          </Section>
        ) : (
          <Section title="Compte">
            <Row
              label={email ?? 'Mon compte'}
              value={email ? undefined : 'Connecté'}
              last={false}
            />
            <Row label="Se déconnecter" onPress={handleLogout} danger last={false} />
            <Row
              label="Supprimer mon compte"
              onPress={() => setShowDeleteModal(true)}
              danger
              last
            />
          </Section>
        )}

        {/* ── ABONNEMENT ── */}
        <Section title="Abonnement">
          <Row
            label={isPro ? 'Karl Pro actif ✨' : 'Plan Gratuit'}
            value={
              credits
                ? `${credits.restants}/${credits.max} crédits`
                : undefined
            }
            last={!isPro}
          />
          {credits && (
            <View style={styles.creditsBar}>
              <View
                style={[
                  styles.creditsBarFill,
                  { width: `${Math.round(creditsPct * 100)}%` as any, backgroundColor: creditColor },
                ]}
              />
            </View>
          )}
          {!isPro && (
            <Row
              label="Découvrir Karl Pro"
              value="6,99 €/mois"
              onPress={() => router.push('/paywall')}
              last
            />
          )}
        </Section>

        {/* ── PARAMÈTRES FINANCIERS ── */}
        {profile === 'perso' && (
          <Section title="Paramètres financiers">
            <Row
              label="Salaire net mensuel"
              value={`${persoSetup.netSalary.toLocaleString('fr-FR')} €`}
              onPress={() => router.push('/settings/salary')}
              last={false}
            />
            <Row
              label="Date de versement"
              value={`Le ${persoSetup.payday}`}
              onPress={() => router.push('/settings/payday')}
              last={false}
            />
            <Row
              label="Charges fixes"
              value={`${charges.length} charge${charges.length !== 1 ? 's' : ''} · ${chargesTotal.toLocaleString('fr-FR')} €`}
              onPress={() => router.push('/settings/charges')}
              last={false}
            />
            <Row
              label="Objectif d'épargne"
              value={goal ? `${goal.montant_cible.toLocaleString('fr-FR')} €/mois` : 'Non défini'}
              onPress={() => router.push('/settings/savings-goal')}
              last
            />
          </Section>
        )}

        {/* ── DONNÉES ── */}
        <Section title="Données">
          <Row
            label="Mon bilan du mois"
            onPress={() => router.push('/bilan')}
            last={false}
          />
          <Row
            label="Exporter mes données"
            onPress={() => router.push('/export')}
            last
          />
        </Section>

        {/* ── À PROPOS ── */}
        <Section title="À propos">
          <Row label="Version" value={APP_VERSION} last={false} />
          <Row
            label="Mentions légales & CGU"
            onPress={() =>
              Alert.alert(
                'Mentions légales & CGU',
                "Karl n'est pas un conseiller financier réglementé. Les estimations fournies sont indicatives et ne constituent pas un conseil financier, fiscal ou juridique.\n\nUsage raisonnable : un usage automatisé ou excessif de l'assistant Karl (envoi massif de messages par des moyens automatisés) peut être temporairement limité pour garantir la qualité du service à l'ensemble des utilisateurs.\n\nContenu complet disponible avant publication."
              )
            }
            last
          />
        </Section>
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />

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
    paddingBottom: 14,
  },
  navBack: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },
  navTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.text },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 28 },

  section: { gap: 8 },
  sectionTitle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    paddingHorizontal: 4,
  },
  sectionBlock: {
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowLabel: { fontFamily: 'Sora_400Regular', fontSize: 14, color: C.text, flex: 1 },
  rowLabelDanger: { color: C.warm },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontFamily: 'Sora_400Regular', fontSize: 12, color: C.muted },
  rowChevron: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },

  creditsBar: {
    height: 3,
    backgroundColor: C.line,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  creditsBarFill: { height: '100%', borderRadius: 2 },

  // Delete modal overlay
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,6,4,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  deleteCard: {
    backgroundColor: C.surf,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    width: '100%',
  },
  deleteTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.4,
  },
  deleteSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
  },
  deleteHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.text,
  },
  deleteInput: {
    backgroundColor: 'rgba(255,122,77,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,122,77,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: C.warm,
    letterSpacing: 1,
  },
  deleteBtns: { flexDirection: 'row', gap: 10 },
  deleteCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: C.muted },
  deleteConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },
});
