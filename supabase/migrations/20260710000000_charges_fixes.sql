create table public.charges_fixes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nom         text not null,
  montant     numeric(12,2) not null,
  frequence   text not null default 'mensuelle',
  created_at  timestamptz not null default now()
);

alter table public.charges_fixes enable row level security;

create policy "charges_fixes: own rows only"
  on public.charges_fixes
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.charges_fixes (user_id);
