import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export interface ChargeFix {
  id: string;
  nom: string;
  montant: number;
  frequence: string;
}

export function useChargesFixes() {
  const { authReady } = useApp();
  const [charges, setCharges] = useState<ChargeFix[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    const { data } = await supabase
      .from('charges_fixes')
      .select('id, nom, montant, frequence')
      .order('created_at', { ascending: true });
    setCharges(
      (data ?? []).map((d) => ({
        id: d.id as string,
        nom: d.nom as string,
        montant: Number(d.montant),
        frequence: d.frequence as string,
      }))
    );
    setLoading(false);
  }, [authReady]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const total = charges.reduce((s, c) => s + c.montant, 0);

  return { charges, total, loading, refresh };
}
