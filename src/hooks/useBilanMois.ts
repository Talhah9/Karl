import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
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
  const { authReady } = useApp();
  const [data, setData] = useState<BilanData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const curStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    // Previous month
    const prevDate = new Date(year, month, 0);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

    // 2 months ago — for "best month in 3" comparison
    const twoMonthsAgo = new Date(year, month - 2, 1);
    const twoMonthsAgoStr = twoMonthsAgo.toISOString().split('T')[0];

    const [txsResult, prevResult, goalResult, historicResult] = await Promise.all([
      supabase.from('transactions').select('montant, categorie, type, date').gte('date', curStart),
      supabase.from('transactions').select('montant').eq('type', 'depense').gte('date', prevStart).lt('date', curStart),
      supabase.from('objectifs_epargne').select('id, label, montant_cible, montant_actuel, echeance').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('transactions').select('montant, date').eq('type', 'depense').gte('date', twoMonthsAgoStr).lt('date', curStart),
    ]);

    const txs = txsResult.data ?? [];
    const prevTxs = prevResult.data ?? [];
    const goal = goalResult.data as ObjectifEpargne | null;
    const historicTxs = historicResult.data ?? [];

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
      if (total > topCategorieTotal) {
        topCategorieTotal = total;
        topCategorie = cat;
      }
    }
    const topCategoriePct =
      totalDepenses > 0 ? Math.round((topCategorieTotal / totalDepenses) * 100) : 0;

    const prevTotal = prevTxs.reduce((s, tx) => s + Number(tx.montant), 0);
    const deltaPct = prevTotal > 0 ? ((totalDepenses - prevTotal) / prevTotal) * 100 : null;
    const prevMoisLabel = new Date(prevYear, prevMonth - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });

    const joursEcoules = now.getDate();
    const daysSet = new Set<string>();
    for (let i = 1; i <= joursEcoules; i++) {
      const d = new Date(year, month, i);
      daysSet.add(d.toISOString().split('T')[0]);
    }
    const joursSansDepense = [...daysSet].filter((d) => !depDates.has(d)).length;

    const monthMap = new Map<string, number>();
    for (const tx of historicTxs) {
      const key = (tx.date as string).substring(0, 7);
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(tx.montant));
    }
    const isBestMonthRecent =
      monthMap.size >= 1 && totalDepenses > 0
        ? [...monthMap.values()].every((t) => totalDepenses <= t)
        : false;

    setData({
      moisLabel: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      totalDepenses,
      totalRevenus,
      deltaPct,
      prevMoisLabel,
      topCategorie,
      topCategorieTotal,
      topCategoriePct,
      savingsGoal: goal,
      joursSansDepense,
      joursEcoules,
      isBestMonthRecent,
      nbTransactions: txs.length,
    });
    setLoading(false);
  }, [authReady]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
