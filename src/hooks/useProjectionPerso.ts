import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export interface WeekData {
  label: string;
  spending: number;
  pct: number; // spending / weeklyBudget, 0–1+
  isFuture: boolean;
  isOverBudget: boolean;
}

export interface ProjectionPerso {
  salary: number;
  chargesTotal: number;
  savingsGoal: number;
  savingsGoalLabel: string;
  budgetEnvelope: number;   // salary − charges − savings (what you CAN spend)
  totalDepenses: number;
  paydayLabel: string;
  projectedMonthSpending: number;
  projectedRemaining: number; // budgetEnvelope − projectedMonthSpending
  weeklyBudget: number;
  weeks: WeekData[];
  daysElapsed: number;
  daysInMonth: number;
}

export function useProjectionPerso() {
  const { authReady, persoSetup } = useApp();
  const [data, setData] = useState<ProjectionPerso | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const [txsResult, chargesResult, goalResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('montant, date')
        .eq('type', 'depense')
        .gte('date', monthStart),
      supabase.from('charges_fixes').select('montant'),
      supabase
        .from('objectifs_epargne')
        .select('label, montant_cible')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const txs = (txsResult.data ?? []) as { montant: string | number; date: string }[];
    const chargesTotal = (chargesResult.data ?? []).reduce(
      (s: number, c: any) => s + Number(c.montant),
      0
    );
    const goal = goalResult.data as any;
    const savingsGoal = Number(goal?.montant_cible ?? 0);

    const salary = persoSetup.netSalary;
    const budgetEnvelope = salary - chargesTotal - savingsGoal;
    const totalDepenses = txs.reduce((s, t) => s + Number(t.montant), 0);

    const dailyRate = daysElapsed > 0 ? totalDepenses / daysElapsed : 0;
    const projectedMonthSpending = dailyRate * daysInMonth;
    const projectedRemaining = budgetEnvelope - projectedMonthSpending;
    const weeklyBudget = budgetEnvelope / 4.33;

    const weekRanges = [
      { label: 'S1', start: 1, end: 7 },
      { label: 'S2', start: 8, end: 14 },
      { label: 'S3', start: 15, end: 21 },
      { label: 'S4', start: 22, end: daysInMonth },
    ];

    const weeks: WeekData[] = weekRanges.map(({ label, start, end }) => {
      const weekTxs = txs.filter((t) => {
        const day = parseInt(t.date.split('-')[2], 10);
        return day >= start && day <= end;
      });
      const spending = weekTxs.reduce((s, t) => s + Number(t.montant), 0);
      const isFuture = start > daysElapsed;
      const pct = weeklyBudget > 0 ? spending / weeklyBudget : 0;
      return { label, spending, pct: Math.min(pct, 1), isFuture, isOverBudget: spending > weeklyBudget };
    });

    setData({
      salary,
      chargesTotal,
      savingsGoal,
      savingsGoalLabel: goal?.label ?? "ton objectif d'épargne",
      budgetEnvelope,
      totalDepenses,
      paydayLabel: `le ${persoSetup.payday}`,
      projectedMonthSpending,
      projectedRemaining,
      weeklyBudget,
      weeks,
      daysElapsed,
      daysInMonth,
    });
    setLoading(false);
  }, [authReady, persoSetup]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
