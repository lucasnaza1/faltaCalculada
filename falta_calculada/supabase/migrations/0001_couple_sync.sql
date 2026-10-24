-- faltaCalculada — sync do casal
-- Documento JSONB por usuário (app_data) + vínculo do casal (couples/pair_invites).
-- Segurança 100% no Postgres via RLS; cliente usa apenas a publishable key.

-- =====================================================================
-- 1. Dados do app: 1 linha por usuário, documento AppData completo
-- =====================================================================
create table if not exists public.app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 2. Vínculo do casal: uma linha por par (ordenada, sem duplicar a-b/b-a)
-- =====================================================================
create table if not exists public.couples (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint couples_pk primary key (user_a, user_b),
  constraint couples_no_self check (user_a <> user_b),
  constraint couples_ordered check (user_a < user_b)
);

create or replace function public.is_partner(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couples c
    where (c.user_a = target and c.user_b = auth.uid())
       or (c.user_b = target and c.user_a = auth.uid())
  );
$$;

-- =====================================================================
-- 3. Convites: código de 6 caracteres, expira em 24h
-- =====================================================================
create table if not exists public.pair_invites (
  code text primary key,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  accepted_by uuid references auth.users (id) on delete set null,
  used boolean not null default false
);

-- Aceita um convite: valida código, expiração, não-aceito, não-criador,
-- cria o vínculo e invalida o código. Tudo atomicamente.
create or replace function public.accept_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite pair_invites;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_invite
  from public.pair_invites
  where code = upper(trim(p_code))
  for update;

  if not found
     or v_invite.used
     or v_invite.accepted_by is not null
     or v_invite.expires_at < now()
     or v_invite.created_by = auth.uid() then
    return false;
  end if;

  insert into public.couples (user_a, user_b)
  values (least(v_invite.created_by, auth.uid()), greatest(v_invite.created_by, auth.uid()))
  on conflict (user_a, user_b) do nothing;

  update public.pair_invites
  set used = true, accepted_by = auth.uid()
  where code = v_invite.code;

  return true;
end;
$$;

-- =====================================================================
-- 4. RLS
-- =====================================================================
alter table public.app_data enable row level security;
alter table public.couples enable row level security;
alter table public.pair_invites enable row level security;

-- app_data: dono lê e escreve; parceiro só lê
drop policy if exists "app_data_owner_all" on public.app_data;
create policy "app_data_owner_all" on public.app_data
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "app_data_partner_read" on public.app_data;
create policy "app_data_partner_read" on public.app_data
  for select to authenticated
  using (public.is_partner(user_id));

-- couples: ambos do par leem; ninguém edita via API (só via RPC)
drop policy if exists "couples_read" on public.couples;
create policy "couples_read" on public.couples
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

-- pair_invites: criador vê os próprios convites
drop policy if exists "invites_owner_read" on public.pair_invites;
create policy "invites_owner_read" on public.pair_invites
  for select to authenticated
  using (created_by = auth.uid());

-- =====================================================================
-- 5. Trigger: updated_at automático
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_touch on public.app_data;
create trigger app_data_touch
  before update on public.app_data
  for each row execute function public.touch_updated_at();
