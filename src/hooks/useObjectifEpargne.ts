import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export interface ObjectifEpargne {
  id: string;
  label: string;
  montant_cible: number;
  montant_actuel: number;
  echeance: string | null;
}

export function useObjectifEpargne() {
  const { authReady } = useApp();
  const [goal, setGoal] = useState<ObjectifEpargne | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    const { data } = await supabase
      .from('objectifs_epargne')
      .select('id, label, montant_cible, montant_actuel, echeance')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setGoal(data as ObjectifEpargne | null);
    setLoading(false);
  }, [authReady]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(
    async (values: Pick<ObjectifEpargne, 'label' | 'montant_cible' | 'montant_actuel'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      if (goal) {
        await supabase
          .from('objectifs_epargne')
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq('id', goal.id);
      } else {
        await supabase
          .from('objectifs_epargne')
          .insert({ ...values, user_id: userId });
      }
      await refresh();
    },
    [goal, refresh]
  );

  return { goal, loading, refresh, save };
}
