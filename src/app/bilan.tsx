import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { KarlMascot } from '@/components/ui/KarlMascot';
import { ProgressRing, RingLabel } from '@/components/ui/ProgressRing';
import { Tag } from '@/components/ui/Tag';
import { C } from '@/constants/colors';
import { getCatEmoji, getCatLabel } from '@/constants/categories';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useBilanMois, type BilanData } from '@/hooks/useBilanMois';

type CardType = 'spending' | 'category' | 'savings' | 'funstat';

function buildCards(data: BilanData): CardType[] {
  const cards: CardType[] = ['spending'];
  if (data.topCategorie) cards.push('category');
  if (data.savingsGoal) cards.push('savings');
  cards.push('funstat');
  return cards;
}

// ─── Glow orb ─────────────────────────────────────────────────────────────────
function Glow({
  color,
  size = 350,
  opacity = 0.18,
  top,
  bottom,
  left,
  right,
}: {
  color: string;
  size?: number;
  opacity?: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        top,
        bottom,
        left,
        right,
      }}
    />
  );
}

// ─── Card 1: Spending ─────────────────────────────────────────────────────────
function SpendingCard({
  data,
  accent,
  isFreelance,
}: {
  data: BilanData;
  accent: string;
  isFreelance: boolean;
}) {
  const delta = data.deltaPct;
  const isDown = delta !== null && delta <= 0;
  const absDelta = delta !== null ? Math.abs(Math.round(delta)) : null;
  const amount = isFreelance ? data.totalRevenus : data.totalDepenses;
  const verb = isFreelance ? "j'ai encaissé" : "j'ai dépensé";

  return (
    <View style={[cS.root, { backgroundColor: '#100D0B' }]}>
      <Glow color={accent} size={420} opacity={0.22} top={-120} right={-100} />
      <Glow color={accent} size={280} opacity={0.07} bottom={-100} left={-80} />

      <View style={cS.inner}>
        <Text style={cS.mono}>MON BILAN · {data.moisLabel.toUpperCase()}</Text>

        <View style={{ flex: 1, justifyContent: 'flex-end', gap: 10 }}>
          <Text style={cS.label}>{verb}</Text>
          <Text style={[cS.bigNum, { color: accent }]}>
            {amount.toLocaleString('fr-FR')} €
          </Text>
          <Text style={cS.label}>ce mois-ci</Text>

          {absDelta !== null && (
            <View style={[cS.badge, { borderColor: isDown ? accent : C.warm }]}>
              <Text style={[cS.badgeTxt, { color: isDown ? accent : C.warm }]}>
                {isDown ? '↓' : '↑'} {absDelta} % vs {data.prevMoisLabel}
              </Text>
            </View>
          )}
        </View>

        <Text style={[cS.footer, { color: accent }]}>bilan.app</Text>
      </View>
    </View>
  );
}

// ─── Card 2: Category ────────────────────────────────────────────────────────
function CategoryCard({ data, accent }: { data: BilanData; accent: string }) {
  return (
    <View style={[cS.root, { backgroundColor: '#0B1009' }]}>
      <Glow color={accent} size={360} opacity={0.20} top={-80} left={-80} />
      <Glow color={C.warm} size={260} opacity={0.08} bottom={-60} right={-60} />

      <View style={cS.inner}>
        <Text style={cS.mono}>MA CATÉGORIE #1</Text>

        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 72 }}>{getCatEmoji(data.topCategorie!)}</Text>
          <Text style={[cS.catName, { color: accent }]}>
            {getCatLabel(data.topCategorie!)}
          </Text>
          <Text style={cS.bigNum}>
            {data.topCategorieTotal.toLocaleString('fr-FR')} €
          </Text>
          <Text style={[cS.label, { textAlign: 'center' }]}>
            soit {data.topCategoriePct} % de mes dépenses
          </Text>
        </View>

        <Text style={[cS.footer, { color: accent }]}>bilan.app</Text>
      </View>
    </View>
  );
}

// ─── Card 3: Savings (with Karl) ─────────────────────────────────────────────
function SavingsCard({
  data,
  accent,
}: {
  data: BilanData;
  accent: string;
}) {
  const goal = data.savingsGoal!;
  const pct = Math.min(1, goal.montant_actuel / goal.montant_cible);

  return (
    <View style={[cS.root, { backgroundColor: '#090C10' }]}>
      <Glow color={accent} size={380} opacity={0.18} bottom={-80} right={-80} />
      <Glow color={accent} size={220} opacity={0.08} top={-60} left={-40} />

      <View style={cS.inner}>
        <Text style={cS.mono}>MON OBJECTIF D'ÉPARGNE</Text>

        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
          <KarlMascot size={68} color={accent} smug={pct >= 0.5} />
          <Text style={cS.catName}>{goal.label}</Text>
          <ProgressRing progress={pct} size={128} color={accent}>
            <RingLabel value={`${Math.round(pct * 100)}`} unit="%" color={accent} />
          </ProgressRing>
          <Text style={cS.label}>
            {goal.montant_actuel.toLocaleString('fr-FR')} € / {goal.montant_cible.toLocaleString('fr-FR')} €
          </Text>
        </View>

        <Text style={[cS.footer, { color: accent }]}>bilan.app</Text>
      </View>
    </View>
  );
}

// ─── Card 4: Fun stat ─────────────────────────────────────────────────────────
function FunstatCard({ data, accent }: { data: BilanData; accent: string }) {
  if (data.isBestMonthRecent) {
    return (
      <View style={[cS.root, { backgroundColor: '#0C0A10' }]}>
        <Glow color={accent} size={380} opacity={0.20} top={-80} right={-80} />
        <Glow color={C.warm} size={260} opacity={0.07} bottom={-60} left={-60} />

        <View style={cS.inner}>
          <Text style={cS.mono}>LA STAT DU MOIS</Text>
          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 80 }}>🏆</Text>
            <Text style={[cS.catName, { color: accent, textAlign: 'center' }]}>
              Meilleur mois !
            </Text>
            <Text style={[cS.label, { textAlign: 'center' }]}>
              {data.moisLabel} est mon mois le plus économe{'\n'}des 3 derniers
            </Text>
          </View>
          <Text style={[cS.footer, { color: accent }]}>bilan.app</Text>
        </View>
      </View>
    );
  }

  const useJours = data.joursSansDepense >= 5;
  const statNum = useJours ? data.joursSansDepense : data.nbTransactions;
  const statLabel = useJours
    ? `jour${statNum > 1 ? 's' : ''} sans dépense`
    : `transaction${statNum > 1 ? 's' : ''}`;
  const statSub = useJours
    ? `sur ${data.joursEcoules} jours écoulés ce mois`
    : 'enregistrées ce mois dans bilan';
  const emoji = useJours ? '✨' : '📊';

  return (
    <View style={[cS.root, { backgroundColor: '#0C0A10' }]}>
      <Glow color={accent} size={380} opacity={0.18} top={-80} right={-80} />
      <Glow color={C.warm} size={260} opacity={0.07} bottom={-60} left={-60} />

      <View style={cS.inner}>
        <Text style={cS.mono}>LA STAT DU MOIS</Text>
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 52 }}>{emoji}</Text>
          <Text style={[cS.bigNum, { color: accent }]}>{statNum}</Text>
          <Text style={[cS.catName, { textAlign: 'center' }]}>{statLabel}</Text>
          <Text style={[cS.label, { textAlign: 'center' }]}>{statSub}</Text>
        </View>
        <Text style={[cS.footer, { color: accent }]}>bilan.app</Text>
      </View>
    </View>
  );
}

// ─── Pro teaser ───────────────────────────────────────────────────────────────
function ProTeaser({ accent }: { accent: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#100D0B', overflow: 'hidden' }}>
      <Glow color={accent} size={420} opacity={0.18} top={-120} right={-100} />
      <Glow color={accent} size={280} opacity={0.07} bottom={-60} left={-80} />
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>✕</Text>
      </Pressable>
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 36, justifyContent: 'center', gap: 28, zIndex: 1 }}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <KarlMascot size={72} smug color={accent} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 28, color: '#fff', letterSpacing: -1 }}>Bilan du mois</Text>
            <Tag variant="lime">PRO</Tag>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 24, textAlign: 'center' }}>
            Tes stats mensuelles mises en scène en cartes partageables — dépenses, catégorie du mois, objectif d'épargne.
          </Text>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 24, textAlign: 'center' }}>
            Un vrai bilan à partager sur Insta ou avec ton comptable.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/paywall')}
          style={{ height: 54, borderRadius: 27, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 16, color: '#141210' }}>Découvrir Karl Pro</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function BilanScreen() {
  const { profile } = useApp();
  const isFreelance = profile === 'freelance';
  const accent = profile === 'perso' ? C.purple : C.lime;
  const { data, loading } = useBilanMois();
  const insets = useSafeAreaInsets();

  const [cardIdx, setCardIdx] = useState(0);
  const [sharing, setSharing] = useState(false);
  const shotRef = useRef<ViewShot>(null);
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

  if (loading || !data || isPro === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0808', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={accent} size="large" />
      </View>
    );
  }

  if (!isPro) {
    return <ProTeaser accent={accent} />;
  }

  const cards = buildCards(data);
  const total = cards.length;
  const current = cards[cardIdx];

  function goNext() {
    if (cardIdx < total - 1) setCardIdx((i) => i + 1);
    else router.back();
  }

  function goBack() {
    if (cardIdx > 0) setCardIdx((i) => i - 1);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) return;
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager mon bilan',
        UTI: 'public.png',
      });
    } finally {
      setSharing(false);
    }
  }

  function renderCard() {
    switch (current) {
      case 'spending':
        return <SpendingCard data={data!} accent={accent} isFreelance={isFreelance} />;
      case 'category':
        return <CategoryCard data={data!} accent={accent} />;
      case 'savings':
        return <SavingsCard data={data!} accent={accent} />;
      case 'funstat':
        return <FunstatCard data={data!} accent={accent} />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Card — captured by ViewShot */}
      <ViewShot ref={shotRef} style={{ flex: 1 }} options={{ format: 'png', quality: 1 }}>
        {renderCard()}
      </ViewShot>

      {/* Progress dots — not captured, directly on root */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 14,
          left: 16,
          right: 58,
          flexDirection: 'row',
          gap: 5,
        }}
      >
        {cards.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= cardIdx ? accent : 'rgba(255,255,255,0.28)',
            }}
          />
        ))}
      </View>

      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={oS.closeTxt}>✕</Text>
      </Pressable>

      {/* Tap areas — left go back, right go next */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 60,
          bottom: insets.bottom + 100,
          left: 0,
          right: 0,
          flexDirection: 'row',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={goBack} />
        <Pressable style={{ flex: 1 }} onPress={goNext} />
      </View>

      {/* Share button */}
      <Pressable
        onPress={handleShare}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: insets.bottom + 28,
          height: 52,
          borderRadius: 26,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={oS.shareTxt}>{sharing ? '…' : '↗  Partager ce bilan'}</Text>
      </Pressable>
    </View>
  );
}

// ─── Card styles ──────────────────────────────────────────────────────────────
const cS = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 96,
    paddingBottom: 44,
    justifyContent: 'space-between',
    zIndex: 1, // always above glow circles (position: absolute) on iOS
  },
  mono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.38)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  label: {
    fontFamily: 'Sora_400Regular',
    fontSize: 17,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 24,
  },
  bigNum: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 72,
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 78,
  },
  catName: {
    fontFamily: 'Sora_700Bold',
    fontSize: 30,
    color: '#fff',
    letterSpacing: -0.5,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  badgeTxt: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
  },
  footer: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    opacity: 0.45,
  },
});

// ─── Shared overlay text styles ───────────────────────────────────────────────
const oS = StyleSheet.create({
  closeTxt: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  shareTxt: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: '#141210',
  },
});
