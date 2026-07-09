create table public.categories_apprises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mot_cle    text not null,
  categorie  text not null,
  created_at timestamptz not null default now(),
  unique (user_id, mot_cle)
);

alter table public.categories_apprises enable row level security;

create policy "categories_apprises: own rows only"
  on public.categories_apprises
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on public.categories_apprises (user_id);
