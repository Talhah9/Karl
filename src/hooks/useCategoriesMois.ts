import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { getBudgetCycle } from '@/utils/budgetCycle';

export interface CategorieMois {
  categorie: string;
  total: number;
}

export function useCategoriesMois() {
  const { authReady, profile, persoSetup } = useApp();
  const payday = profile === 'perso' ? persoSetup.payday : 1;
  const [data, setData] = useState<CategorieMois[]>([]);
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    const { cycleStart } = getBudgetCycle(payday);

    const { data: txs } = await supabase
      .from('transactions')
      .select('montant, categorie')
      .eq('type', 'depense')
      .gte('date', cycleStart);

    const map = new Map<string, number>();
    let tot = 0;
    for (const tx of txs ?? []) {
      const m = Number(tx.montant);
      map.set(tx.categorie as string, (map.get(tx.categorie as string) ?? 0) + m);
      tot += m;
    }

    setData(
      Array.from(map.entries())
        .map(([categorie, total]) => ({ categorie, total }))
        .sort((a, b) => b.total - a.total)
    );
    setTotalDepenses(tot);
    setLoading(false);
  }, [authReady, payday]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, totalDepenses, loading, refresh };
}
