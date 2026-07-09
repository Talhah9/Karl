create table public.objectifs_epargne (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  label          text not null default 'Mon objectif',
  montant_cible  numeric(12, 2) not null,
  montant_actuel numeric(12, 2) not null default 0,
  echeance       date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.objectifs_epargne enable row level security;

create policy "objectifs_epargne: own rows only"
  on public.objectifs_epargne
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.objectifs_epargne (user_id);
