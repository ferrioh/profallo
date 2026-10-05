# Configurar Supabase (Profallo) — pasos y SQL

## 1) Ejecutar el SQL
Abre el **SQL Editor** de tu proyecto y pega/ejecuta TODO el bloque de abajo:

👉 https://supabase.com/dashboard/project/nnywqyvykmpvtfclsvec/sql/new

Debe decir al final: **Success. No rows returned**.

> También puedes aplicarlo con la CLI: `supabase login`, `supabase init`,
> `supabase link --project-ref nnywqyvykmpvtfclsvec` y `supabase db push`
> (el esquema ya está en `supabase/migrations/`).

## 1.b) Dejar TU cuenta como admin (ejecuta después del esquema)
En el mismo SQL Editor, pega y ejecuta esto (confirma tu correo y crea tu
perfil como admin aprobado con Premium). Cambia el correo si hace falta:

```sql
-- 1) Confirmar el correo (para poder iniciar sesión sin el enlace)
update auth.users
set email_confirmed_at = now()
where email = 'ferofficial@gmail.com';

-- 2) Crear/asegurar tu perfil como ADMIN aprobado con Premium
insert into public.profiles (id, email, name, role, status, membership, trial_start)
select id::text, email, coalesce(split_part(email,'@',1),'Admin'), 'admin', 'approved', 'premium', current_date
from auth.users
where email = 'ferofficial@gmail.com'
on conflict (id) do update
  set role = 'admin', status = 'approved', membership = 'premium';
```

## 2) Ajuste de Auth (recomendado)
En **Authentication → Providers → Email**, desactiva **"Confirm email"** para que el registro entre directo.

## 3) Variables de entorno en Vercel
En **Vercel → Project → Settings → Environment Variables**, agrega y luego **Redeploy**:

```
VITE_SUPABASE_URL = https://nnywqyvykmpvtfclsvec.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_rEsYKiN-YR2GBBrVdijGNA_U7wzELwE
```

---

## SQL para pegar

```sql
-- ============================================================
-- Profallo · Esquema para Supabase (Postgres)
-- Ejecuta TODO este script en: Supabase > SQL Editor > New query
-- Es idempotente y transaccional (si algo falla, no cambia nada).
-- ============================================================

create extension if not exists "pgcrypto";

begin;

-- ------------------------------------------------------------
-- ENTRENADORES (perfil) + rol + membresía + aprobación
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            text primary key,
  email         text unique,
  name          text not null default 'Entrenador',
  phone         text,
  id_number     text,
  instagram     text,
  gym           text,
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
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists instagram text;
alter table public.profiles add column if not exists gym text;

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
  tone        int default 0,
  archived    boolean not null default false,
  joined      date default current_date,
  created_at  timestamptz default now()
);
alter table public.clients add column if not exists id_number text;
alter table public.clients add column if not exists gym text;
alter table public.clients add column if not exists gender text default 'mujer';

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

-- ------------------------------------------------------------
-- HELPERS
-- ------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()::text and p.role = 'admin'
  );
$$;

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()::text and p.status = 'approved'
  );
$$;

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
    case when v_first then 'approved' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
alter table public.profiles            enable row level security;
alter table public.routines            enable row level security;
alter table public.clients             enable row level security;
alter table public.sessions            enable row level security;
alter table public.measurements        enable row level security;
alter table public.payments            enable row level security;
alter table public.membership_payments enable row level security;

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

drop policy if exists membership_admin on public.membership_payments;
create policy membership_admin on public.membership_payments
  for all using (public.is_admin()) with check (public.is_admin());

commit;
```
