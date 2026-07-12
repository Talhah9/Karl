import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCatEmoji, getCatLabel } from '@/constants/categories';

export interface FrequentExpense {
  categorie: string;
  emoji: string;
  label: string;
  montant: number;
}

export function useFrequentExpenses(authReady: boolean) {
  const [expenses, setExpenses] = useState<FrequentExpense[]>([]);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    const since = new Date();
    since.setDate(since.getDate() - 60);

    const { data } = await supabase
      .from('transactions')
      .select('categorie, montant')
      .eq('type', 'depense')
      .gte('date', since.toISOString().split('T')[0]);

    if (!data || data.length < 5) return;

    const map = new Map<string, { count: number; total: number }>();
    data.forEach(({ categorie, montant }) => {
      const prev = map.get(categorie as string) ?? { count: 0, total: 0 };
      map.set(categorie as string, { count: prev.count + 1, total: prev.total + Number(montant) });
    });

    const top = [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2)
      .map(([categorie, { count, total }]) => ({
        categorie,
        emoji: getCatEmoji(categorie),
        label: getCatLabel(categorie),
        // Round to nearest 5 for a cleaner display
        montant: Math.max(1, Math.round(total / count / 5) * 5),
      }));

    setExpenses(top);
  }, [authReady]);

  useEffect(() => { refresh(); }, [refresh]);

  return { expenses, refresh };
}
