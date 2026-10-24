-- faltaCalculada — perfis (nome exibido) + políticas de convite

-- Nome de exibição do usuário (para o toggle "Eu | Nome dela")
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- dono lê e escreve o próprio perfil
drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- parceiro lê o nome
drop policy if exists "profiles_partner_read" on public.profiles;
create policy "profiles_partner_read" on public.profiles
  for select to authenticated
  using (public.is_partner(user_id));

-- convites: dono cria e pode excluir os próprios
drop policy if exists "invites_owner_insert" on public.pair_invites;
create policy "invites_owner_insert" on public.pair_invites
  for insert to authenticated
  with check (created_by = auth.uid() and used = false and accepted_by is null);

drop policy if exists "invites_owner_delete" on public.pair_invites;
create policy "invites_owner_delete" on public.pair_invites
  for delete to authenticated
  using (created_by = auth.uid());
