import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { getBudgetCycle } from '@/utils/budgetCycle';
import type { ObjectifEpargne } from '@/hooks/useObjectifEpargne';

export interface BilanData {
  moisLabel: string;
  totalDepenses: number;
  totalRevenus: number;
  deltaPct: number | null;
  prevMoisLabel: string;
  topCategorie: string | null;
  topCategorieTotal: number;
  topCategoriePct: number;
  savingsGoal: ObjectifEpargne | null;
  joursSansDepense: number;
  joursEcoules: number;
  isBestMonthRecent: boolean;
  nbTransactions: number;
}

export function useBilanMois() {
  const { authReady, profile, persoSetup } = useApp();
  const payday = profile === 'perso' ? persoSetup.payday : 1;
  const [data, setData] = useState<BilanData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);

    const now = new Date();
    const cycle = getBudgetCycle(payday, now);
    const { cycleStart, cycleEnd, prevCycleStart, daysElapsed } = cycle;

    // Pour "meilleur cycle sur 3" : cycle d'il y a 2 cycles
    const dayBeforePrev = new Date(new Date(prevCycleStart).getTime() - 86400000);
    const twoCyclesAgo = getBudgetCycle(payday, dayBeforePrev);

    const [txsResult, prevResult, goalResult, prevPrevResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('montant, categorie, type, date')
        .gte('date', cycleStart)
        .lte('date', cycleEnd),
      supabase
        .from('transactions')
        .select('montant')
        .eq('type', 'depense')
        .gte('date', prevCycleStart)
        .lt('date', cycleStart),
      supabase
        .from('objectifs_epargne')
        .select('id, label, montant_cible, montant_actuel, echeance')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('transactions')
        .select('montant')
        .eq('type', 'depense')
        .gte('date', twoCyclesAgo.cycleStart)
        .lt('date', prevCycleStart),
    ]);

    const txs = txsResult.data ?? [];
    const prevTxs = prevResult.data ?? [];
    const goal = goalResult.data as ObjectifEpargne | null;
    const prevPrevTxs = prevPrevResult.data ?? [];

    let totalDepenses = 0;
    let totalRevenus = 0;
    const catMap = new Map<string, number>();
    const depDates = new Set<string>();

    for (const tx of txs) {
      const m = Number(tx.montant);
      if (tx.type === 'depense') {
        totalDepenses += m;
        catMap.set(tx.categorie as string, (catMap.get(tx.categorie as string) ?? 0) + m);
        depDates.add(tx.date as string);
      } else {
        totalRevenus += m;
      }
    }

    let topCategorie: string | null = null;
    let topCategorieTotal = 0;
    for (const [cat, total] of catMap.entries()) {
      if (total > topCategorieTotal) { topCategorieTotal = total; topCategorie = cat; }
    }
    const topCategoriePct =
      totalDepenses > 0 ? Math.round((topCategorieTotal / totalDepenses) * 100) : 0;

    const prevTotal = prevTxs.reduce((s, tx) => s + Number(tx.montant), 0);
    const deltaPct = prevTotal > 0 ? ((totalDepenses - prevTotal) / prevTotal) * 100 : null;
    const prevMoisLabel = new Date(prevCycleStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    // Jours sans dépense : itérer chaque jour du cycle jusqu'à aujourd'hui
    const today = now.toISOString().split('T')[0];
    const cycleStartDate = new Date(cycleStart);
    const daysSet = new Set<string>();
    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(cycleStartDate.getTime() + i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr <= today) daysSet.add(dateStr);
    }
    const joursSansDepense = [...daysSet].filter((d) => !depDates.has(d)).length;

    const prevPrevTotal = prevPrevTxs.reduce((s, tx) => s + Number(tx.montant), 0);
    const prevTotals = [prevTotal, prevPrevTotal].filter((t) => t > 0);
    const isBestMonthRecent =
      totalDepenses > 0 && prevTotals.length > 0 && prevTotals.every((t) => totalDepenses <= t);

    setData({
      moisLabel: cycle.cycleLabel,
      totalDepenses,
      totalRevenus,
      deltaPct,
      prevMoisLabel,
      topCategorie,
      topCategorieTotal,
      topCategoriePct,
      savingsGoal: goal,
      joursSansDepense,
      joursEcoules: daysElapsed,
      isBestMonthRecent,
      nbTransactions: txs.length,
    });
    setLoading(false);
  }, [authReady, payday]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
