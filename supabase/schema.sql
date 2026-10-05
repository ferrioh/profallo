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
  specialty     text default 'Entrenamiento personal',
  currency      text not null default 'USD',
  photo_url     text,
  membership    text not null default 'free' check (membership in ('free', 'premium')),
  verified      boolean not null default false,
  role          text not null default 'trainer' check (role in ('trainer', 'admin')),
  trial_start   date not null default current_date,
  created_at    timestamptz not null default now()
);

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
  created_at  timestamptz default now()
);

create table if not exists public.clients (
  id          text primary key,
  trainer_id  text not null references public.profiles(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  birth       date,
  goal        text,
  plan        text default 'Personal',
  fee         numeric(10,2) default 0,
  frequency   text not null default 'mensual' check (frequency in ('mensual', 'quincenal')),
  weight      numeric(6,2),
  height      numeric(6,2),
  routine_id  text,
  notes       text,
  tone        int default 0,
  archived    boolean not null default false,
  joined      date default current_date,
  created_at  timestamptz default now()
);

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
  period      text,                                   -- "YYYY-MM"
  paid        boolean not null default true,
  paid_date   date default current_date,
  method      text default 'Manual',
  note        text,
  created_at  timestamptz default now()
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

-- Crea el perfil automáticamente al registrarse con Supabase Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
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
      'create policy %I_owner on public.%I for all using (trainer_id = auth.uid()::text or public.is_admin()) with check (trainer_id = auth.uid()::text or public.is_admin())',
      t, t
    );
  end loop;
end $$;

-- cobros de membresía: solo admin
drop policy if exists membership_admin on public.membership_payments;
create policy membership_admin on public.membership_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Listo. Después: Authentication > Users para crear tu cuenta y,
-- luego, en Table editor > profiles, pon tu fila con role = 'admin'.
-- ------------------------------------------------------------

commit;
