import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/hooks/useRecentTransactions';

interface TransactionsMois {
  revenus: Transaction[];
  depenses: Transaction[];
  totalRevenus: number;
  totalDepenses: number;
  loading: boolean;
  refresh: () => void;
}

export function useTransactionsMois(): TransactionsMois {
  const { authReady } = useApp();
  const [revenus, setRevenus] = useState<Transaction[]>([]);
  const [depenses, setDepenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const { data } = await supabase
      .from('transactions')
      .select('id, type, montant, categorie, date, description, exceptionnelle')
      .gte('date', startOfMonth)
      .order('date', { ascending: false });

    const txs = (data ?? []) as Transaction[];
    setRevenus(txs.filter((t) => t.type === 'revenu'));
    setDepenses(txs.filter((t) => t.type === 'depense'));
    setLoading(false);
  }, [authReady]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalRevenus = revenus.reduce((s, t) => s + t.montant, 0);
  const totalDepenses = depenses.reduce((s, t) => s + t.montant, 0);

  return { revenus, depenses, totalRevenus, totalDepenses, loading, refresh };
}
