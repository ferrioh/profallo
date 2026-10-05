-- ============================================================
-- ProTrainer · ROLLBACK
-- Revierte TODO lo creado por supabase/schema.sql.
-- Úsalo solo si necesitas deshacer la migración.
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ============================================================

begin;

-- Triggers
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists clients_limit on public.clients;
drop trigger if exists profiles_verified on public.profiles;

-- Funciones (cascade elimina las políticas que dependan de ellas)
drop function if exists public.handle_new_user() cascade;
drop function if exists public.enforce_client_limit() cascade;
drop function if exists public.sync_verified() cascade;
drop function if exists public.is_approved() cascade;
drop function if exists public.is_admin() cascade;

-- Tablas (cascade elimina políticas, índices y FKs asociados)
drop table if exists public.membership_payments cascade;
drop table if exists public.payments cascade;
drop table if exists public.measurements cascade;
drop table if exists public.sessions cascade;
drop table if exists public.clients cascade;
drop table if exists public.routines cascade;
drop table if exists public.profiles cascade;

commit;
