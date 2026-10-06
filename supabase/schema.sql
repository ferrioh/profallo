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
  tiktok        text,
  gym           text,
  username      text unique,
  bio           text,
  accent        text default 'lime',
  reviews       jsonb not null default '[]'::jsonb,
  notification_state jsonb not null default '{}'::jsonb,
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
alter table public.profiles add column if not exists tiktok text;
alter table public.profiles add column if not exists gym text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists accent text default 'lime';
alter table public.profiles add column if not exists reviews jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists notification_state jsonb not null default '{}'::jsonb;
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

-- Sin verificación por estado: todo usuario autenticado tiene acceso (ya no hay gate).
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null;
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

-- Límite de clientes eliminado: cualquier plan puede crear clientes ilimitados.
drop trigger if exists clients_limit on public.clients;
drop function if exists public.enforce_client_limit();

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
  v_json jsonb;
  v_clients int;
  v_routines int;
  v_sessions int;
  v_photos jsonb;
  v_reviews jsonb;
begin
  select * into v from public.profiles where lower(username) = lower(p_username) limit 1;
  if not found then return null; end if;
  v_json := to_jsonb(v);
  select count(*) into v_clients from public.clients where trainer_id = v.id and archived = false;
  select count(*) into v_routines from public.routines where trainer_id = v.id;
  select count(*) into v_sessions from public.sessions
    where trainer_id = v.id and date >= date_trunc('month', current_date);
  select coalesce(jsonb_agg(photo), '[]'::jsonb) into v_photos from (
    select photo from public.clients
     where trainer_id = v.id and photo is not null and photo <> '' limit 6
  ) s;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', rv->>'id',
      'rating', coalesce((rv->>'rating')::numeric, 0),
      'text', coalesce(rv->>'text', ''),
      'date', coalesce(rv->>'date', ''),
      'clientName', c.name,
      'clientPhoto', c.photo
    ) order by rv->>'date' desc), '[]'::jsonb)
  into v_reviews
  from jsonb_array_elements(coalesce(v_json->'reviews', '[]'::jsonb)) rv
  left join public.clients c on c.id = rv->>'client';
  return jsonb_build_object(
    'name', v.name, 'specialty', v.specialty, 'photo', v.photo_url,
    'phone', v.phone, 'email', v.email,
    'instagram', v_json->>'instagram', 'tiktok', v_json->>'tiktok',
    'username', v_json->>'username', 'gym', v_json->>'gym', 'bio', v_json->>'bio',
    'accent', coalesce(v_json->>'accent', 'lime'),
    'verified', v.verified,
    'clients', v_clients, 'routines', v_routines, 'sessionsMonth', v_sessions,
    'photos', v_photos,
    'reviews', v_reviews
  );
end; $$;

grant execute on function public.public_profile(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Links cortos para la semana de entrenamiento de un cliente
-- profallo.vercel.app/c/<codigo>
-- ------------------------------------------------------------
create table if not exists public.client_links (
  code       text primary key,
  trainer_id text not null references public.profiles(id) on delete cascade,
  client_id  text not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists client_links_client_idx on public.client_links (client_id);
alter table public.client_links enable row level security;
drop policy if exists client_links_owner on public.client_links;
create policy client_links_owner on public.client_links
  for select using (public.is_admin() or trainer_id = auth.uid()::text);

-- Crea (o reutiliza) un código corto para el cliente del entrenador.
create or replace function public.create_client_link(p_client_id text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_owner boolean;
begin
  if auth.uid() is null then return null; end if;
  select exists(
    select 1 from public.clients
     where id = p_client_id and trainer_id = auth.uid()::text
  ) into v_owner;
  if not v_owner then return null; end if;

  select code into v_code from public.client_links
   where client_id = p_client_id and trainer_id = auth.uid()::text limit 1;
  if v_code is not null then return v_code; end if;

  loop
    v_code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
    begin
      insert into public.client_links (code, trainer_id, client_id)
      values (v_code, auth.uid()::text, p_client_id);
      return v_code;
    exception when unique_violation then
      -- vuelve a intentar con otro código
    end;
  end loop;
end; $$;
grant execute on function public.create_client_link(text) to authenticated;

-- Devuelve la semana actual (lunes a domingo) del cliente para su link corto.
create or replace function public.public_client_week(p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link    public.client_links;
  v_client  public.clients;
  v_trainer public.profiles;
  v_monday  date;
  v_week    text;
  v_sessions jsonb;
begin
  select * into v_link from public.client_links where code = p_code limit 1;
  if not found then return null; end if;
  select * into v_client from public.clients where id = v_link.client_id limit 1;
  if not found then return null; end if;
  select * into v_trainer from public.profiles where id = v_link.trainer_id limit 1;

  v_monday := date_trunc('week', current_date)::date;
  v_week := to_char(v_monday, 'YYYY-MM-DD');

  select coalesce(jsonb_agg(x.row order by x.row_date, x.row_time), '[]'::jsonb) into v_sessions
  from (
    select s.date as row_date, s.time as row_time,
      jsonb_build_object(
        'date', s.date,
        'time', s.time,
        'duration', s.duration,
        'title', s.title,
        'status', s.status,
        'routineName', r.name,
        'category', r.category,
        'level', r.level,
        'notes', r.notes,
        'exercises', coalesce(r.exercises, '[]'::jsonb)
      ) as row
    from public.sessions s
    left join public.routines r
      on r.id = coalesce(nullif(s.routine_id, ''), v_client.routine_id)
    where s.client_id = v_client.id
      and s.status <> 'Cancelada'
      and s.date >= v_monday
      and s.date <= v_monday + 6
  ) x;

  return jsonb_build_object(
    'trainerName', v_trainer.name,
    'trainerPhone', v_trainer.phone,
    'trainerUsername', v_trainer.username,
    'clientName', v_client.name,
    'clientPhoto', v_client.photo,
    'clientGoal', v_client.goal,
    'weekStart', v_week,
    'sessions', v_sessions
  );
end; $$;
grant execute on function public.public_client_week(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Eliminar cuenta (solo admin): borra el perfil (y sus datos) y el usuario de auth.
-- ------------------------------------------------------------
create or replace function public.admin_delete_account(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin') then
    return false;
  end if;
  delete from public.profiles where id = p_id;
  delete from auth.users where id = p_id::uuid;
  return true;
exception when others then
  return false;
end; $$;
grant execute on function public.admin_delete_account(text) to authenticated;

-- ------------------------------------------------------------
-- Respaldos automáticos (salvavidas). Se conservan los 5 más recientes por entrenador.
-- ------------------------------------------------------------
create table if not exists public.data_backups (
  id         uuid primary key default gen_random_uuid(),
  trainer_id text not null references public.profiles(id) on delete cascade,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists data_backups_trainer_idx on public.data_backups (trainer_id, created_at desc);
alter table public.data_backups enable row level security;
drop policy if exists data_backups_owner on public.data_backups;
create policy data_backups_owner on public.data_backups
  for all using (public.is_admin() or trainer_id = auth.uid()::text)
  with check (public.is_admin() or trainer_id = auth.uid()::text);

alter table public.app_settings add column if not exists backup_enabled boolean not null default true;

-- Restaurar un respaldo a su entrenador (solo admin).
create or replace function public.admin_restore_backup(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare b public.data_backups; d jsonb; tid text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin') then return false; end if;
  select * into b from public.data_backups where id = p_id limit 1;
  if not found then return false; end if;
  d := b.data; tid := b.trainer_id;

  insert into public.routines (id, trainer_id, name, category, level, duration, notes, exercises, focus_zones)
  select r.id, tid, r.name, r.category, r.level, r.duration, r.notes, coalesce(r.exercises,'[]'::jsonb), coalesce(r."focusZones",'[]'::jsonb)
  from jsonb_to_recordset(coalesce(d->'routines','[]'::jsonb)) as r(id text, name text, category text, level text, duration int, notes text, exercises jsonb, "focusZones" jsonb)
  on conflict (id) do update set name=excluded.name, category=excluded.category, level=excluded.level, duration=excluded.duration, notes=excluded.notes, exercises=excluded.exercises, focus_zones=excluded.focus_zones;

  insert into public.clients (id, trainer_id, name, email, phone, id_number, gym, birth, goal, plan, fee, frequency, weight, height, routine_id, notes, gender, photo, tone, archived, joined)
  select c.id, tid, c.name, c.email, c.phone, c."idNumber", c.gym, nullif(c.birth,'')::date, c.goal, c.plan, c.fee, c.frequency, c.weight, c.height, c.routine, c.notes, c.gender, nullif(c.photo,''), c.tone, c.archived, nullif(c.joined,'')::date
  from jsonb_to_recordset(coalesce(d->'clients','[]'::jsonb)) as c(id text, name text, email text, phone text, "idNumber" text, gym text, birth text, goal text, plan text, fee numeric, frequency text, weight numeric, height numeric, routine text, notes text, gender text, photo text, tone int, archived boolean, joined text)
  on conflict (id) do update set name=excluded.name, email=excluded.email, phone=excluded.phone, id_number=excluded.id_number, gym=excluded.gym, birth=excluded.birth, goal=excluded.goal, plan=excluded.plan, fee=excluded.fee, frequency=excluded.frequency, weight=excluded.weight, height=excluded.height, routine_id=excluded.routine_id, notes=excluded.notes, gender=excluded.gender, photo=excluded.photo, tone=excluded.tone, archived=excluded.archived, joined=excluded.joined;

  insert into public.sessions (id, trainer_id, client_id, title, date, time, duration, status, routine_id, notes)
  select s.id, tid, s.client, s.title, nullif(s.date,'')::date, s.time, s.duration, s.status, s.routine, s.notes
  from jsonb_to_recordset(coalesce(d->'sessions','[]'::jsonb)) as s(id text, client text, title text, date text, time text, duration int, status text, routine text, notes text)
  on conflict (id) do update set client_id=excluded.client_id, title=excluded.title, date=excluded.date, time=excluded.time, duration=excluded.duration, status=excluded.status, routine_id=excluded.routine_id, notes=excluded.notes;

  insert into public.measurements (id, trainer_id, client_id, date, weight, waist, fat, note)
  select m.id, tid, m.client, nullif(m.date,'')::date, m.weight, m.waist, m.fat, m.note
  from jsonb_to_recordset(coalesce(d->'measurements','[]'::jsonb)) as m(id text, client text, date text, weight numeric, waist numeric, fat numeric, note text)
  on conflict (id) do update set client_id=excluded.client_id, date=excluded.date, weight=excluded.weight, waist=excluded.waist, fat=excluded.fat, note=excluded.note;

  insert into public.payments (id, trainer_id, client_id, amount, due, paid, paid_date, method, note)
  select p.id, tid, p.client, p.amount, nullif(p.due,'')::date, p.paid, nullif(p."paidDate",'')::date, p.method, p.note
  from jsonb_to_recordset(coalesce(d->'payments','[]'::jsonb)) as p(id text, client text, amount numeric, due text, paid boolean, "paidDate" text, method text, note text)
  on conflict (id) do update set client_id=excluded.client_id, amount=excluded.amount, due=excluded.due, paid=excluded.paid, paid_date=excluded.paid_date, method=excluded.method, note=excluded.note;

  return true;
end; $$;
grant execute on function public.admin_restore_backup(uuid) to authenticated;

commit;
