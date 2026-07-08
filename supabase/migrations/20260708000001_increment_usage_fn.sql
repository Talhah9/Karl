create or replace function increment_usage(p_user_id uuid, p_mois date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into usage_mensuel (user_id, mois, nombre_messages_utilises)
  values (p_user_id, p_mois, 1)
  on conflict (user_id, mois)
  do update set nombre_messages_utilises = usage_mensuel.nombre_messages_utilises + 1;
$$;
