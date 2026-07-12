import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KarlMascot } from '@/components/ui/KarlMascot';
import { C } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const FEATURES_PERSO = [
  {
    emoji: '💰',
    title: 'Calcule ton solde disponible',
    desc: "Je prends en compte ton salaire, tes charges fixes, tes dépenses et ton objectif d'épargne pour te dire ce qu'il te reste vraiment.",
  },
  {
    emoji: '➕',
    title: 'Ajoute des transactions',
    desc: "Dis-moi 'J'ai payé 40€ au resto' — j'enregistre tout automatiquement dans la bonne catégorie.",
  },
  {
    emoji: '✏️',
    title: 'Modifie ou supprime',
    desc: "Tu t'es trompé de montant ou de catégorie ? Demande-moi et je corrige ou j'efface.",
  },
  {
    emoji: '📊',
    title: 'Analyse tes dépenses',
    desc: 'Je te montre où part ton argent, par catégorie et sur la durée, dans l\'onglet Analyse.',
  },
  {
    emoji: '🎯',
    title: 'Suit tes objectifs d\'épargne',
    desc: "Je t'aide à mettre de côté chaque mois et je te préviens si tu risques de ne pas atteindre ton objectif.",
  },
  {
    emoji: '💡',
    title: 'Donne des conseils',
    desc: "Je te préviens si tu risques de finir dans le rouge ou si tu as une marge pour épargner davantage.",
  },
];

const FEATURES_FREELANCE = [
  {
    emoji: '🧮',
    title: 'Calcule ton URSSAF',
    desc: "Dès que tu encaisses une prestation, je bloque automatiquement la provision pour tes cotisations sociales.",
  },
  {
    emoji: '💳',
    title: 'Te dit combien te verser',
    desc: "Je calcule ce que tu peux vraiment te payer ce mois sans risquer ton fond de roulement ou tes provisions fiscales.",
  },
  {
    emoji: '➕',
    title: 'Ajoute factures et dépenses',
    desc: "Un message suffit : 'J'ai facturé 2000€ à Studio Mörk' — je catégorise et enregistre.",
  },
  {
    emoji: '✏️',
    title: 'Modifie ou supprime',
    desc: "Erreur de saisie ? Demande-moi et je corrige ou j'efface la transaction.",
  },
  {
    emoji: '📊',
    title: 'Analyse ta trésorerie',
    desc: "Entrées, sorties, récurrentes : tu vois tout d'un coup d'œil dans l'onglet Analyse.",
  },
  {
    emoji: '⚠️',
    title: 'Prévient les risques fiscaux',
    desc: "Versement libératoire, ACRE, trimestres URSSAF — je te rappelle les éléments importants pour éviter les mauvaises surprises.",
  },
];

export default function KarlFeaturesScreen() {
  const { profile } = useApp();
  const accent = profile === 'perso' ? C.purple : C.lime;
  const features = profile === 'perso' ? FEATURES_PERSO : FEATURES_FREELANCE;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.navBack}>✕</Text>
        </Pressable>
        <Text style={styles.navTitle}>Ce que fait Karl</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <KarlMascot size={56} color={accent} />
          <Text style={styles.heroTitle}>Karl en un coup d'œil</Text>
          <Text style={styles.heroSub}>
            {profile === 'perso'
              ? 'Ton coach financier pour salariés et particuliers'
              : 'Ton co-pilote comptable pour freelances et entrepreneurs'}
          </Text>
        </View>

        <View style={styles.featureList}>
          {features.map((f, i) => (
            <View key={i} style={[styles.featureCard, { borderLeftColor: accent }]}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Karl n'est pas un conseiller financier réglementé · Estimations indicatives
        </Text>
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
    paddingBottom: 14,
  },
  navBack: { fontFamily: 'Sora_400Regular', fontSize: 20, color: C.muted },
  navTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: C.text },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 22 },

  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  heroTitle: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 20,
    color: C.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  featureList: { gap: 10 },
  featureCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: C.surf,
    borderWidth: 1,
    borderColor: C.line,
    borderLeftWidth: 3,
    borderRadius: 14,
    padding: 14,
  },
  featureEmoji: { fontSize: 20, lineHeight: 26 },
  featureTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13.5,
    color: C.text,
  },
  featureDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: C.muted,
    lineHeight: 17,
  },

  footer: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 14,
  },
});
