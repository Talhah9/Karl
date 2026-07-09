import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export interface ComparaisonMois {
  mois_actuel: number;
  mois_precedent: number;
  mois_precedent_label: string;
  delta_pct: number | null;
}

export function useComparaisonMois() {
  const { authReady } = useApp();
  const [data, setData] = useState<ComparaisonMois | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!authReady) return;
    const { data: d } = await supabase.rpc('get_comparaison_mois');
    if (d) {
      const ma = Number((d as any).mois_actuel ?? 0);
      const mp = Number((d as any).mois_precedent ?? 0);
      setData({
        mois_actuel: ma,
        mois_precedent: mp,
        mois_precedent_label: (d as any).mois_precedent_label ?? '',
        delta_pct: mp > 0 ? ((ma - mp) / mp) * 100 : null,
      });
    }
    setLoading(false);
  }, [authReady]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refresh: fetch };
}
