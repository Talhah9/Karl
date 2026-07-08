-- ============================================================
-- 1. PROFILES
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  profil_type  text not null check (profil_type in ('entrepreneur', 'particulier')),
  revenu_moyen_mensuel numeric(12, 2),
  statut_juridique     text,               -- nullable, entrepreneurs only
  date_creation        timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: own rows only"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 2. TRANSACTIONS
-- ============================================================
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  montant     numeric(12, 2) not null,
  categorie   text not null,
  type        text not null check (type in ('depense', 'revenu')),
  description text,
  date        date not null,
  created_at  timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "transactions: own rows only"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. CONVERSATIONS
-- ============================================================
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  contenu    text not null,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations: own rows only"
  on public.conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 4. USAGE_MENSUEL
-- ============================================================
create table public.usage_mensuel (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  mois                    date not null,           -- first day of the month, e.g. 2026-07-01
  nombre_messages_utilises integer not null default 0,
  unique (user_id, mois)
);

alter table public.usage_mensuel enable row level security;

create policy "usage_mensuel: own rows only"
  on public.usage_mensuel
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES (perf)
-- ============================================================
create index on public.transactions (user_id, date desc);
create index on public.conversations (user_id, created_at desc);
create index on public.usage_mensuel (user_id, mois desc);
