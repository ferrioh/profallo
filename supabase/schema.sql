-- ============================================================
-- ProTrainer · Esquema para Supabase (Postgres)
-- Ejecuta este archivo completo en: Supabase > SQL Editor > New query
-- Los IDs son TEXT para aceptar tanto UUID como los ids locales ("c1", "r1").
-- ============================================================

create extension if not exists "pgcrypto";

-- Toda la migración corre en una transacción: si algo falla, se revierte
-- por completo y la base queda intacta (rollback automático).
begin;

-- ------------------------------------------------------------
-- ENTRENADORES (perfil) + rol + membresía
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            text primary key,                     -- = auth.users.id
  email         text unique,
  name          text not null default 'Entrenador',
  phone         text,
  id_number     text,
  instagram     text,
  gym           text,
  username      text unique,
  bio           text,
  specialty     text default 'Entrenamiento personal',
  currency      text not null default 'USD',
  photo_url     text,
  membership    text not null default 'free' check (membership in ('free', 'premium')),
  verified      boolean not null default false,
  role          text not null default 'trainer' check (role in ('trainer', 'admin')),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  trial_start   date not null default current_date,
  created_at    timestamptz not null default now()
);

-- Compatibilidad si la tabla ya existía sin la columna status
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists instagram text;
alter table public.profiles add column if not exists gym text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
create unique index if not exists profiles_username_idx on public.profiles (lower(username));

-- ------------------------------------------------------------
-- DATOS DE CADA ENTRENADOR
-- ------------------------------------------------------------
create table if not exists public.routines (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  name        text not null,
  category    text,
  level       text,
  duration    int  default 50,
  notes       text,
  exercises   jsonb not null default '[]'::jsonb,
  focus_zones jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now()
);
alter table public.routines add column if not exists focus_zones jsonb not null default '[]'::jsonb;

create table if not exists public.clients (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  id_number   text,
  gym         text,
  birth       date,
  goal        text,
  plan        text default 'Personal',
  fee         numeric(10,2) default 0,
  frequency   text not null default 'mensual' check (frequency in ('mensual', 'quincenal')),
  weight      numeric(6,2),
  height      numeric(6,2),
  routine_id  text,
  notes       text,
  gender      text default 'mujer' check (gender in ('mujer', 'hombre')),
  photo       text,
  tone        int default 0,
  archived    boolean not null default false,
  joined      date default current_date,
  created_at  timestamptz default now()
);
alter table public.clients add column if not exists id_number text;
alter table public.clients add column if not exists gym text;
alter table public.clients add column if not exists gender text default 'mujer';
alter table public.clients add column if not exists photo text;

create table if not exists public.sessions (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  client_id   text references public.clients(id) on delete cascade,
  title       text,
  date        date,
  time        text,
  duration    int default 60,
  status      text not null default 'Programada' check (status in ('Programada', 'Completada', 'Cancelada')),
  routine_id  text,
  notes       text,
  created_at  timestamptz default now()
);

create table if not exists public.measurements (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  client_id   text references public.clients(id) on delete cascade,
  date        date default current_date,
  weight      numeric(6,2) not null,
  waist       numeric(6,2),
  fat         numeric(6,2),
  note        text,
  created_at  timestamptz default now()
);

create table if not exists public.payments (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  client_id   text references public.clients(id) on delete cascade,
  amount      numeric(10,2) not null default 0,
  due         date,
  paid        boolean not null default false,
  paid_date   date,
  method      text default 'Transferencia',
  note        text,
  created_at  timestamptz default now()
);

-- Cobros de la membresía premium (3 USD/mes) que registra el admin
create table if not exists public.membership_payments (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  amount      numeric(10,2) not null default 3,
  period      text,
  paid        boolean not null default true,
  paid_date   date default current_date,
  method      text default 'Manual',
  note        text,
  created_at  timestamptz default now()
);

-- Datos de pago que muestra el admin (una sola fila)
create table if not exists public.app_settings (
  id            text primary key default 'global',
  pay_pagomovil text,
  pay_binance   text,
  pay_zelle     text,
  updated_at    timestamptz default now()
);
insert into public.app_settings (id) values ('global') on conflict (id) do nothing;

-- Solicitudes de pago Premium (el usuario sube su comprobante; el admin aprueba)
create table if not exists public.premium_requests (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  id_number   text,
  method      text not null check (method in ('pagomovil', 'binance', 'zelle')),
  reference   text,
  amount      numeric(10,2) not null default 3,
  capture     text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz default now(),
  reviewed_at timestamptz
);

-- ------------------------------------------------------------
-- HELPERS
-- ------------------------------------------------------------
-- ¿El usuario autenticado es admin?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()::text and p.role = 'admin'
  );
$$;

-- ¿El usuario autenticado tiene el acceso aprobado por el admin?
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()::text and p.status = 'approved'
  );
$$;

-- Crea el perfil automáticamente al registrarse con Supabase Auth.
-- El primer usuario queda como admin; todos quedan APROBADOS (sin verificación).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_first boolean;
begin
  select count(*) = 0 into v_first from public.profiles;
  insert into public.profiles (id, email, name, phone, id_number, instagram, gym, role, status)
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'idNumber',
    new.raw_user_meta_data->>'instagram',
    new.raw_user_meta_data->>'gym',
    case when v_first then 'admin' else 'trainer' end,
    'approved'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bloquea más de 3 clientes activos en el plan gratuito
create or replace function public.enforce_client_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_count int;
begin
  select membership into v_plan from public.profiles where id = new.trainer_id;
  if v_plan = 'free' then
    select count(*) into v_count
    from public.clients
    where trainer_id = new.trainer_id and archived = false;
    if v_count >= 3 then
      raise exception 'El plan gratuito permite máximo 3 clientes. Activa Premium (3 USD/mes) para clientes ilimitados.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_limit on public.clients;
create trigger clients_limit
  before insert on public.clients
  for each row execute function public.enforce_client_limit();

-- Marca automáticamente verified = true cuando la membresía es premium
create or replace function public.sync_verified() returns trigger
language plpgsql as $$
begin
  new.verified := (new.membership = 'premium');
  return new;
end;
$$;

drop trigger if exists profiles_verified on public.profiles;
create trigger profiles_verified
  before insert or update of membership on public.profiles
  for each row execute function public.sync_verified();

-- ------------------------------------------------------------
-- RLS: cada entrenador ve solo lo suyo; el admin ve todo
-- ------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.routines           enable row level security;
alter table public.clients            enable row level security;
alter table public.sessions           enable row level security;
alter table public.measurements       enable row level security;
alter table public.payments           enable row level security;
alter table public.membership_payments enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid()::text or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid()::text);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()::text or public.is_admin())
  with check (id = auth.uid()::text or public.is_admin());

-- tablas de datos del entrenador (mismo patrón)
do $$
declare t text;
begin
  foreach t in array array['routines', 'clients', 'sessions', 'measurements', 'payments'] loop
    execute format('drop policy if exists %I_owner on public.%I', t, t);
    execute format(
      'create policy %I_owner on public.%I for all using (public.is_admin() or (trainer_id = auth.uid()::text and public.is_approved())) with check (public.is_admin() or (trainer_id = auth.uid()::text and public.is_approved()))',
      t, t
    );
  end loop;
end $$;

-- cobros de membresía: solo admin
drop policy if exists membership_admin on public.membership_payments;
create policy membership_admin on public.membership_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- configuración de pagos: visible para usuarios logueados, editable solo por admin
alter table public.app_settings enable row level security;
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select using (auth.uid() is not null);
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- solicitudes premium: el usuario crea y ve las suyas; el admin ve y resuelve todas
alter table public.premium_requests enable row level security;
drop policy if exists premium_requests_select on public.premium_requests;
create policy premium_requests_select on public.premium_requests
  for select using (trainer_id = auth.uid()::text or public.is_admin());
drop policy if exists premium_requests_insert on public.premium_requests;
create policy premium_requests_insert on public.premium_requests
  for insert with check (trainer_id = auth.uid()::text);
drop policy if exists premium_requests_admin on public.premium_requests;
create policy premium_requests_admin on public.premium_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Listo. Después: Authentication > Users para crear tu cuenta y,
-- luego, en Table editor > profiles, pon tu fila con role = 'admin'.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Ficha pública por usuario (para compartir: profallo.vercel.app/mi_usuario)
-- ------------------------------------------------------------
create or replace function public.public_profile(p_username text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.profiles;
  v_clients int;
  v_routines int;
  v_sessions int;
  v_photos jsonb;
begin
  select * into v from public.profiles where lower(username) = lower(p_username) limit 1;
  if not found then return null; end if;
  select count(*) into v_clients from public.clients where trainer_id = v.id and archived = false;
  select count(*) into v_routines from public.routines where trainer_id = v.id;
  select count(*) into v_sessions from public.sessions
    where trainer_id = v.id and date >= date_trunc('month', current_date);
  select coalesce(jsonb_agg(photo), '[]'::jsonb) into v_photos from (
    select photo from public.clients
     where trainer_id = v.id and photo is not null and photo <> '' limit 6
  ) s;
  return jsonb_build_object(
    'name', v.name, 'specialty', v.specialty, 'photo', v.photo_url,
    'phone', v.phone, 'instagram', v.instagram, 'email', v.email,
    'username', v.username, 'gym', v.gym, 'bio', v.bio, 'verified', v.verified,
    'clients', v_clients, 'routines', v_routines, 'sessionsMonth', v_sessions,
    'photos', v_photos
  );
end; $$;

grant execute on function public.public_profile(text) to anon, authenticated;

commit;
