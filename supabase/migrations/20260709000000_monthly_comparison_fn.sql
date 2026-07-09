-- Fonction RPC appelée depuis le client mobile (SECURITY INVOKER → RLS actif)
create or replace function public.get_comparaison_mois()
returns json
language sql
stable
security invoker
as $$
  select json_build_object(
    'mois_actuel', coalesce(
      sum(montant) filter (
        where date >= date_trunc('month', current_date)
          and date <  date_trunc('month', current_date) + interval '1 month'
          and type = 'depense'
      ), 0
    ),
    'mois_precedent', coalesce(
      sum(montant) filter (
        where date >= date_trunc('month', current_date) - interval '1 month'
          and date <  date_trunc('month', current_date)
          and type = 'depense'
      ), 0
    ),
    'mois_precedent_label', to_char(
      date_trunc('month', current_date) - interval '1 month',
      'TMMonth'
    )
  )
  from public.transactions;
$$;

grant execute on function public.get_comparaison_mois() to anon, authenticated;
