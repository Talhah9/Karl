import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { getBudgetCycle } from '@/utils/budgetCycle';

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
  budgetEnvelope: number;   // salary − charges − savings
  totalDepenses: number;
  paydayLabel: string;
  projectedMonthSpending: number;
  projectedRemaining: number; // budgetEnvelope − projectedMonthSpending
  weeklyBudget: number;
  weeks: WeekData[];
  daysElapsed: number;
  daysInMonth: number;      // daysInCycle (kept for compat)
}

export function useProjectionPerso() {
  const { authReady, persoSetup } = useApp();
  const [data, setData] = useState<ProjectionPerso | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);

    const now = new Date();
    const cycle = getBudgetCycle(persoSetup.payday, now);
    const { cycleStart, cycleEnd, daysElapsed, daysInCycle } = cycle;
    const cycleStartDate = new Date(cycleStart);
    const cycleEndDate = new Date(cycleEnd);

    const [txsResult, chargesResult, goalResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('montant, date')
        .eq('type', 'depense')
        .gte('date', cycleStart)
        .lte('date', cycleEnd),
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
    const projectedMonthSpending = dailyRate * daysInCycle;
    const projectedRemaining = budgetEnvelope - projectedMonthSpending;
    const weeklyBudget = budgetEnvelope / (daysInCycle / 7);

    // Barres hebdomadaires — semaines relatives au début du cycle
    const todayISO = now.toISOString().split('T')[0];
    const MS = 86400000;

    const weekRanges = [0, 1, 2, 3].map((w) => {
      const wStart = new Date(cycleStartDate.getTime() + w * 7 * MS);
      const wEnd = w === 3 ? cycleEndDate : new Date(cycleStartDate.getTime() + (w + 1) * 7 * MS - MS);
      return {
        label: `S${w + 1}`,
        start: wStart.toISOString().split('T')[0],
        end: wEnd.toISOString().split('T')[0],
      };
    });

    const weeks: WeekData[] = weekRanges.map(({ label, start, end }) => {
      const weekTxs = txs.filter((t) => (t.date as string) >= start && (t.date as string) <= end);
      const spending = weekTxs.reduce((s, t) => s + Number(t.montant), 0);
      const isFuture = start > todayISO;
      const pct = weeklyBudget > 0 ? spending / weeklyBudget : 0;
      return { label, spending, pct: Math.min(pct, 1), isFuture, isOverBudget: spending > weeklyBudget };
    });

    const paydayLabel = `le ${cycleEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;

    console.log('[Budget Cycle Debug]', {
      payday: persoSetup.payday,
      cycleStart,
      cycleEnd,
      daysElapsed,
      daysInCycle,
      salary,
      chargesTotal,
      savingsGoal,
      totalDepenses,
      budgetEnvelope,
      projectedMonthSpending: Math.round(projectedMonthSpending),
      projectedRemaining: Math.round(projectedRemaining),
    });

    setData({
      salary,
      chargesTotal,
      savingsGoal,
      savingsGoalLabel: goal?.label ?? "ton objectif d'épargne",
      budgetEnvelope,
      totalDepenses,
      paydayLabel,
      projectedMonthSpending,
      projectedRemaining,
      weeklyBudget,
      weeks,
      daysElapsed,
      daysInMonth: daysInCycle,
    });
    setLoading(false);
  }, [authReady, persoSetup]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
