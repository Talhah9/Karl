import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export interface TrendDay {
  date: string;
  total: number;
}

export function useTrend30j() {
  const { authReady } = useApp();
  const [data, setData] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;

    const from = new Date();
    from.setDate(from.getDate() - 29);
    const fromStr = from.toISOString().split('T')[0];

    const { data: txs } = await supabase
      .from('transactions')
      .select('montant, date')
      .eq('type', 'depense')
      .gte('date', fromStr);

    const map = new Map<string, number>();
    for (const tx of txs ?? []) {
      map.set(tx.date, (map.get(tx.date) ?? 0) + Number(tx.montant));
    }
    const result: TrendDay[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, total: map.get(key) ?? 0 });
    }
    setData(result);
    setLoading(false);
  }, [authReady]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
