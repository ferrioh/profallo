import { supabase } from './supabase'
import type {
  AppData,
  Client,
  Measurement,
  Payment,
  Profile,
  Routine,
  Session,
} from '../types'
import type { BodyZone } from '../types'
import { TODAY, uid } from './utils'

type Row = Record<string, unknown>

const nz = (v: string | null | undefined): string | null => (v ? v : null)
const or = (v: unknown): string => (v == null ? '' : String(v))
const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v))

/* ----------------------------- Mapeos ----------------------------- */

export function rowToClient(r: Row): Client {
  return {
    id: or(r.id),
    name: or(r.name),
    email: or(r.email),
    phone: or(r.phone),
    idNumber: or(r.id_number),
    photo: or(r.photo),
    birth: or(r.birth),
    goal: or(r.goal),
    plan: or(r.plan) || 'Personal',
    fee: Number(r.fee ?? 0),
    weight: num(r.weight),
    height: num(r.height),
    routine: or(r.routine_id),
    notes: or(r.notes),
    gym: or(r.gym),
    gender: r.gender === 'hombre' ? 'hombre' : 'mujer',
    tone: Number(r.tone ?? 0),
    archived: Boolean(r.archived),
    joined: or(r.joined),
    frequency: r.frequency === 'quincenal' ? 'quincenal' : 'mensual',
  }
}

export function clientToRow(c: Client, trainerId: string): Row {
  return {
    id: c.id,
    trainer_id: trainerId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    id_number: c.idNumber ?? '',
    gym: c.gym ?? '',
    photo: c.photo ?? null,
    birth: nz(c.birth),
    goal: c.goal,
    plan: c.plan,
    fee: c.fee,
    frequency: c.frequency ?? 'mensual',
    weight: c.weight,
    height: c.height,
    routine_id: c.routine,
    notes: c.notes,
    gender: c.gender ?? 'mujer',
    tone: c.tone,
    archived: c.archived,
    joined: nz(c.joined),
  }
}

export function rowToRoutine(r: Row): Routine {
  return {
    id: or(r.id),
    name: or(r.name),
    category: or(r.category),
    level: or(r.level),
    duration: Number(r.duration ?? 50),
    notes: or(r.notes),
    exercises: Array.isArray(r.exercises) ? (r.exercises as Routine['exercises']) : [],
    focusZones: Array.isArray(r.focus_zones) ? (r.focus_zones as BodyZone[]) : [],
  }
}

export function routineToRow(rt: Routine, trainerId: string): Row {
  return {
    id: rt.id,
    trainer_id: trainerId,
    name: rt.name,
    category: rt.category,
    level: rt.level,
    duration: rt.duration,
    notes: rt.notes,
    exercises: rt.exercises,
    focus_zones: rt.focusZones ?? [],
  }
}

export function rowToSession(r: Row): Session {
  return {
    id: or(r.id),
    client: or(r.client_id),
    title: or(r.title),
    date: or(r.date),
    time: or(r.time),
    duration: Number(r.duration ?? 60),
    status: (r.status as Session['status']) ?? 'Programada',
    routine: or(r.routine_id),
    notes: or(r.notes),
  }
}

export function sessionToRow(s: Session, trainerId: string): Row {
  return {
    id: s.id,
    trainer_id: trainerId,
    client_id: s.client,
    title: s.title,
    date: nz(s.date),
    time: s.time,
    duration: s.duration,
    status: s.status,
    routine_id: s.routine,
    notes: s.notes,
  }
}

export function rowToMeasurement(r: Row): Measurement {
  return {
    id: or(r.id),
    client: or(r.client_id),
    date: or(r.date),
    weight: Number(r.weight ?? 0),
    waist: num(r.waist),
    fat: num(r.fat),
    note: or(r.note),
  }
}

export function measurementToRow(m: Measurement, trainerId: string): Row {
  return {
    id: m.id,
    trainer_id: trainerId,
    client_id: m.client,
    date: nz(m.date),
    weight: m.weight,
    waist: m.waist,
    fat: m.fat,
    note: m.note,
  }
}

export function rowToPayment(r: Row): Payment {
  return {
    id: or(r.id),
    client: or(r.client_id),
    amount: Number(r.amount ?? 0),
    due: or(r.due),
    paid: Boolean(r.paid),
    paidDate: or(r.paid_date),
    method: or(r.method) || 'Transferencia',
    note: or(r.note),
  }
}

export function paymentToRow(p: Payment, trainerId: string): Row {
  return {
    id: p.id,
    trainer_id: trainerId,
    client_id: p.client,
    amount: p.amount,
    due: nz(p.due),
    paid: p.paid,
    paid_date: nz(p.paidDate),
    method: p.method,
    note: p.note,
  }
}

export function rowToProfile(r: Row, base: Profile): Profile {
  return {
    ...base,
    name: or(r.name) || base.name,
    specialty: or(r.specialty),
    currency: or(r.currency) || 'USD',
    photo: or(r.photo_url) || base.photo,
    email: or(r.email),
    role: r.role === 'admin' ? 'admin' : 'trainer',
    membership: r.membership === 'premium' ? 'premium' : 'free',
    verified: Boolean(r.verified),
    trialStart: or(r.trial_start) || base.trialStart,
    username: or(r.username) || base.username,
    phone: or(r.phone) || base.phone,
    idNumber: or(r.id_number) || base.idNumber,
    instagram: or(r.instagram) || base.instagram,
    tiktok: or(r.tiktok) || base.tiktok,
    accent: r.accent === 'cyan' || r.accent === 'amber' || r.accent === 'lime' ? r.accent : (base.accent ?? 'lime'),
    reviews: Array.isArray(r.reviews) ? (r.reviews as Profile['reviews']) : base.reviews,
    bio: or(r.bio) || base.bio,
  }
}

export function profileToRow(p: Profile, id: string): Row {
  return {
    id,
    email: p.email ?? null,
    name: p.name,
    specialty: p.specialty,
    currency: p.currency,
    phone: p.phone ?? null,
    id_number: p.idNumber ?? null,
    instagram: p.instagram ?? null,
    tiktok: p.tiktok ?? null,
    accent: p.accent ?? 'lime',
    reviews: p.reviews ?? [],
    membership: p.membership ?? 'free',
    verified: Boolean(p.verified),
    role: p.role ?? 'trainer',
    trial_start: nz(p.trialStart),
    photo_url: p.photo ?? null,
    username: p.username ?? null,
    bio: p.bio ?? null,
  }
}

/* ----------------------------- Auth ----------------------------- */

export interface CloudProfileRow {
  id: string
  email: string | null
  name: string
  specialty: string | null
  membership: 'free' | 'premium'
  verified: boolean
  role: 'admin' | 'trainer'
  status: 'pending' | 'approved' | 'rejected'
  trial_start: string | null
  created_at?: string
}

export async function cloudSignUp(email: string, password: string, meta: Record<string, string>) {
  if (!supabase) return { ok: false as const, error: 'Supabase no está configurado.' }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  })
  if (error) return { ok: false as const, error: error.message }
  // needsConfirmation = no session returned (email confirmation enabled)
  return { ok: true as const, session: data.session, needsConfirmation: !data.session }
}

export async function cloudSignIn(email: string, password: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase no está configurado.' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, session: data.session }
}

export async function cloudSignOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function cloudGetSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export function cloudOnAuth(cb: (userId: string | null, event: string) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(session?.user.id ?? null, event))
  return () => data.subscription.unsubscribe()
}

export async function cloudGetProfile(userId: string): Promise<CloudProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return data as CloudProfileRow
}

/** Devuelve el perfil; si no existe (p. ej. el trigger no corrió), lo crea. */
export async function cloudEnsureProfile(userId: string): Promise<CloudProfileRow | null> {
  if (!supabase) return null
  const existing = await cloudGetProfile(userId)
  if (existing) return existing
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as Record<string, string>
  const email = user.email ?? null
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  const isFirst = (count ?? 0) === 0
  await supabase.from('profiles').upsert({
    id: userId,
    email,
    name: meta.name || email?.split('@')[0] || 'Entrenador',
    phone: meta.phone ?? null,
    id_number: meta.idNumber ?? null,
    instagram: meta.instagram ?? null,
    gym: meta.gym ?? null,
    role: isFirst ? 'admin' : 'trainer',
    status: 'approved',
  })
  return cloudGetProfile(userId)
}

export async function cloudListProfiles(): Promise<CloudProfileRow[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
  if (error || !data) return null
  return data as CloudProfileRow[]
}

export async function cloudSetProfileStatus(id: string, status: CloudProfileRow['status']) {
  if (!supabase) return false
  const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
  return !error
}

export async function cloudSetProfileRole(id: string, role: CloudProfileRow['role']) {
  if (!supabase) return false
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  return !error
}

/** Guarda las reseñas del entrenador directamente en su perfil (garantiza persistencia). */
export async function cloudSaveReviews(userId: string, reviews: unknown): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('profiles').update({ reviews: reviews ?? [] }).eq('id', userId)
  return !error
}

/** Elimina un cliente (y en cascada sus sesiones, mediciones y pagos). */
export async function cloudDeleteClient(clientId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  return !error
}

/** Cambia la contraseña verificando primero la actual. */
export async function cloudChangePassword(
  email: string,
  current: string,
  next: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' }
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: current })
  if (signErr) return { ok: false, error: 'La contraseña actual no es correcta.' }
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Elimina una cuenta (solo admin). */
export async function cloudDeleteAccount(id: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('admin_delete_account', { p_id: id })
  if (error) return false
  return Boolean(data)
}

/* ----------------------------- Datos ----------------------------- */

export async function loadCloudData(userId: string, base: Profile): Promise<AppData | null> {
  if (!supabase) return null
  const [prof, clients, routines, sessions, measurements, payments] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('clients').select('*').eq('trainer_id', userId),
    supabase.from('routines').select('*').eq('trainer_id', userId),
    supabase.from('sessions').select('*').eq('trainer_id', userId),
    supabase.from('measurements').select('*').eq('trainer_id', userId),
    supabase.from('payments').select('*').eq('trainer_id', userId),
  ])
  if (clients.error || routines.error || sessions.error || measurements.error || payments.error) return null
  const rawNs = (prof.data as Row | null)?.notification_state as
    | Partial<NonNullable<AppData['notificationState']>>
    | undefined
  const notificationState: AppData['notificationState'] =
    rawNs && typeof rawNs === 'object'
      ? {
          deleted: Array.isArray(rawNs.deleted) ? rawNs.deleted : [],
          muted: Array.isArray(rawNs.muted) ? rawNs.muted : [],
          read: Array.isArray(rawNs.read) ? rawNs.read : [],
        }
      : undefined
  return {
    version: 1,
    profile: prof.data ? rowToProfile(prof.data as Row, base) : base,
    clients: (clients.data ?? []).map(rowToClient),
    routines: (routines.data ?? []).map(rowToRoutine),
    sessions: (sessions.data ?? []).map(rowToSession),
    measurements: (measurements.data ?? []).map(rowToMeasurement),
    payments: (payments.data ?? []).map(rowToPayment),
    notificationState,
    demo: false,
  }
}

async function syncTable(table: string, _trainerId: string, rows: Row[]): Promise<boolean> {
  if (!supabase) return false
  // Upsert únicamente: NUNCA borramos datos de la nube automáticamente
  // (evita perder clientes/rutinas si el estado local llega incompleto).
  if (!rows.length) return true
  const { error } = await supabase.from(table).upsert(rows)
  if (error) console.error(`[profallo] fallo al guardar ${table}:`, error.message)
  return !error
}

export async function saveCloudData(userId: string, data: AppData): Promise<boolean> {
  if (!supabase) return false
  const row = profileToRow(data.profile, userId)
  row.notification_state = data.notificationState ?? {}
  let prof = await supabase.from('profiles').upsert(row)
  if (prof.error) {
    // Reintento sin columnas opcionales (por si la base aún no tiene tiktok/bio/accent/reviews/etc.).
    const safe = { ...row }
    delete safe.tiktok
    delete safe.bio
    delete safe.accent
    delete safe.reviews
    delete safe.notification_state
    prof = await supabase.from('profiles').upsert(safe)
  }
  if (prof.error) {
    console.error('[profallo] fallo al guardar el perfil:', prof.error.message)
    return false
  }
  // Orden seguro por claves foráneas: padres antes que hijos (upsert)
  const results = [
    await syncTable('routines', userId, data.routines.map((r) => routineToRow(r, userId))),
    await syncTable('clients', userId, data.clients.map((c) => clientToRow(c, userId))),
    await syncTable('sessions', userId, data.sessions.map((s) => sessionToRow(s, userId))),
    await syncTable('measurements', userId, data.measurements.map((m) => measurementToRow(m, userId))),
    await syncTable('payments', userId, data.payments.map((p) => paymentToRow(p, userId))),
  ]
  return results.every(Boolean)
}

export const cloudToday = TODAY

/** Combina los datos locales con los de la nube sin perder nada (unión por id; gana la nube). */
export function mergeLocalCloud(local: AppData, cloud: AppData): AppData {
  const byId = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const m = new Map<string, T>()
    a.forEach((x) => m.set(x.id, x))
    b.forEach((x) => m.set(x.id, x))
    return [...m.values()]
  }
  return {
    ...cloud,
    clients: byId(local.clients, cloud.clients),
    routines: byId(local.routines, cloud.routines),
    sessions: byId(local.sessions, cloud.sessions),
    measurements: byId(local.measurements, cloud.measurements),
    payments: byId(local.payments, cloud.payments),
    notificationState: cloud.notificationState ?? local.notificationState,
  }
}

/* ------------------- Pagos Premium (Pago Móvil / Binance / Zelle) ------------------- */

export interface AppSettings {
  pay_pagomovil: string
  pay_binance: string
  pay_zelle: string
  backup_enabled: boolean
}

export type PremiumMethod = 'pagomovil' | 'binance' | 'zelle'

export interface PremiumRequestRow {
  id: string
  trainer_id: string
  name: string | null
  email: string | null
  phone: string | null
  id_number: string | null
  method: PremiumMethod
  reference: string | null
  amount: number
  capture: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at?: string
}

export async function cloudGetAppSettings(): Promise<AppSettings | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 'global').maybeSingle()
  if (error || !data) return null
  const row = data as Row
  return {
    pay_pagomovil: or(row.pay_pagomovil),
    pay_binance: or(row.pay_binance),
    pay_zelle: or(row.pay_zelle),
    backup_enabled: row.backup_enabled !== false,
  }
}

export async function cloudSaveAppSettings(s: AppSettings): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('app_settings')
    .upsert({ id: 'global', ...s, updated_at: new Date().toISOString() })
  return !error
}

/* ------------------- Respaldos (salvavidas) ------------------- */

/** Guarda un respaldo del entrenador y conserva solo los 5 más recientes. */
export async function cloudBackupNow(userId: string, data: AppData): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('data_backups').insert({ trainer_id: userId, data })
  if (error) return false
  const { data: rows } = await supabase
    .from('data_backups')
    .select('id')
    .eq('trainer_id', userId)
    .order('created_at', { ascending: false })
    .range(5, 200)
  if (rows && rows.length) {
    await supabase.from('data_backups').delete().in('id', (rows as Row[]).map((r) => r.id as string))
  }
  return true
}

/** Devuelve el respaldo más reciente del entrenador. */
export async function cloudLatestBackup(userId: string): Promise<AppData | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('data_backups')
    .select('data')
    .eq('trainer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return ((data as Row).data as AppData) ?? null
}

export interface BackupRow {
  id: string
  trainer_id: string
  created_at: string
}

/** Lista los respaldos (solo admin). */
export async function cloudListBackups(): Promise<BackupRow[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('data_backups')
    .select('id,trainer_id,created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !data) return null
  return data as BackupRow[]
}

/** Restaura un respaldo a su entrenador (solo admin). */
export async function cloudRestoreBackup(id: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('admin_restore_backup', { p_id: id })
  if (error) return false
  return Boolean(data)
}

export async function cloudCreatePremiumRequest(req: {
  trainerId: string
  name: string
  email: string
  phone: string
  idNumber: string
  method: PremiumMethod
  reference: string
  amount: number
  capture: string
}): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('premium_requests').insert({
    id: uid(),
    trainer_id: req.trainerId,
    name: req.name,
    email: req.email,
    phone: req.phone,
    id_number: req.idNumber,
    method: req.method,
    reference: req.reference,
    amount: req.amount,
    capture: req.capture,
    status: 'pending',
  })
  return !error
}

export async function cloudListPremiumRequests(): Promise<PremiumRequestRow[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('premium_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error || !data) return null
  return data as PremiumRequestRow[]
}

export async function cloudMyPremiumRequests(userId: string): Promise<PremiumRequestRow[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('premium_requests')
    .select('*')
    .eq('trainer_id', userId)
    .order('created_at', { ascending: false })
  return (data as PremiumRequestRow[]) ?? []
}

export async function cloudApprovePremium(req: PremiumRequestRow): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('premium_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', req.id)
  if (error) return false
  await supabase.from('profiles').update({ membership: 'premium' }).eq('id', req.trainer_id)
  await supabase.from('membership_payments').insert({
    id: uid(),
    trainer_id: req.trainer_id,
    amount: req.amount,
    period: TODAY.slice(0, 7),
    paid: true,
    paid_date: TODAY,
    method: req.method,
    note: 'Premium aprobado',
  })
  return true
}

export async function cloudRejectPremium(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('premium_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

/* ------------------- Ficha pública del entrenador ------------------- */

export interface PublicReview {
  id: string
  rating: number
  text: string
  date: string
  clientName: string | null
  clientPhoto: string | null
}

export interface PublicTrainer {
  name: string
  specialty: string
  photo: string
  phone: string
  instagram: string
  tiktok: string
  email: string
  bio: string
  username: string
  gym: string
  verified: boolean
  accent: string
  clients: number
  routines: number
  sessionsMonth: number
  photos: string[]
  reviews: PublicReview[]
}

export async function cloudPublicProfile(username: string): Promise<PublicTrainer | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('public_profile', { p_username: username })
  if (error || !data) return null
  return data as PublicTrainer
}

/* ------------------- Semana del cliente (link corto) ------------------- */

export interface ClientWeekExercise {
  name: string
  sets: number
  reps: string
  rest: number
}

export interface ClientWeekSession {
  date: string
  time: string
  duration: number
  title: string
  status: string
  routineName: string | null
  category: string | null
  level: string | null
  notes: string | null
  exercises: ClientWeekExercise[]
}

export interface ClientWeek {
  trainerName: string
  trainerPhone: string | null
  trainerUsername: string | null
  clientName: string
  clientPhoto: string | null
  clientGoal: string | null
  weekStart: string
  sessions: ClientWeekSession[]
}

/** Crea (o reutiliza) un código corto para la semana del cliente. */
export async function cloudCreateClientLink(clientId: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('create_client_link', { p_client_id: clientId })
  if (error || !data) return null
  return String(data)
}

/** Lee la semana del cliente a partir del código corto (público). */
export async function cloudPublicClientWeek(code: string): Promise<ClientWeek | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('public_client_week', { p_code: code })
  if (error || !data) return null
  return data as ClientWeek
}
