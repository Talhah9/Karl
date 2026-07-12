import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface CustomCategory {
  id: string;
  nom: string;
  emoji: string;
  budget_mensuel: number;
}

export function useCustomCategories(authReady: boolean) {
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('categories_personnalisees')
        .select('id, nom, emoji, budget_mensuel')
        .order('created_at', { ascending: true });
      setCategories((data ?? []) as CustomCategory[]);
    } finally {
      setLoading(false);
    }
  }, [authReady]);

  useEffect(() => { refetch(); }, [refetch]);

  return { categories, loading, refetch };
}
