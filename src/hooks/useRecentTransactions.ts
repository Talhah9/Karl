import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { getBudgetCycle } from '@/utils/budgetCycle';

export interface Transaction {
  id: string;
  date: string;
  type: 'revenu' | 'depense';
  montant: number;
  categorie: string;
  description: string | null;
  exceptionnelle: boolean;
}

export function useRecentTransactions(limit = 20) {
  const { authReady, persoSetup } = useApp();
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    const { cycleStart, cycleEnd } = getBudgetCycle(persoSetup.payday);
    const { data: rows } = await supabase
      .from('transactions')
      .select('id, date, type, montant, categorie, description, exceptionnelle')
      .gte('date', cycleStart)
      .lte('date', cycleEnd)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    setData(
      (rows ?? []).map((r) => ({
        id: r.id as string,
        date: r.date as string,
        type: r.type as 'revenu' | 'depense',
        montant: Number(r.montant),
        categorie: r.categorie as string,
        description: r.description as string | null,
        exceptionnelle: Boolean(r.exceptionnelle),
      }))
    );
    setLoading(false);
  }, [authReady, persoSetup.payday, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
