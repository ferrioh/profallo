import type { AppData, Trainer } from '../types'
import { demoData } from './demo'
import { TODAY } from './utils'

export const KEY = 'protrainer.local.v1'

function normalize(d: AppData): AppData {
  d.profile = {
    ...d.profile,
    role: d.profile.role ?? 'admin',
    membership: d.profile.membership ?? 'free',
    email: d.profile.email === 'admin@protrainer.app' ? 'admin@profallo.app' : d.profile.email ?? 'admin@profallo.app',
    trialStart: d.profile.trialStart ?? TODAY,
  }
  d.profile.verified = d.profile.verified ?? d.profile.membership === 'premium'
  if (!Array.isArray(d.trainers) || d.trainers.length === 0) {
    d.trainers = demoData().trainers ?? []
  }
  d.trainers = d.trainers.map((t) => ({
    ...t,
    trialStart: t.trialStart ?? TODAY,
    email: t.email === 'admin@protrainer.app' ? 'admin@profallo.app' : t.email,
  }))
  const email = d.profile.email
  const hasMe = d.trainers.some((t) => t.email && t.email === email)
  if (!hasMe) {
    const me: Trainer = {
      id: 'me',
      name: d.profile.name,
      email: email ?? '',
      specialty: d.profile.specialty,
      membership: d.profile.membership ?? 'free',
      verified: !!d.profile.verified,
      role: d.profile.role ?? 'admin',
      activeClients: d.clients.filter((c) => !c.archived).length,
      joined: TODAY,
      trialStart: d.profile.trialStart ?? TODAY,
    }
    d.trainers = [me, ...d.trainers]
  }
  return d
}

export function validData(x: unknown): x is AppData {
  const d = x as AppData
  return (
    !!d &&
    d.version === 1 &&
    d.profile &&
    typeof d.profile.name === 'string' &&
    ['clients', 'routines', 'payments', 'sessions', 'measurements'].every(
      (k) =>
        Array.isArray((d as unknown as Record<string, unknown>)[k]) &&
        ((d as unknown as Record<string, unknown>)[k] as unknown[]).length <
          10000,
    ) &&
    d.clients.every(
      (c) => typeof c.id === 'string' && typeof c.name === 'string',
    ) &&
    d.routines.every(
      (r) => typeof r.name === 'string' && Array.isArray(r.exercises),
    ) &&
    d.payments.every(
      (p) => typeof p.id === 'string' && Number.isFinite(Number(p.amount)),
    ) &&
    d.sessions.every((s) => typeof s.date === 'string') &&
    d.measurements.every((m) => Number.isFinite(Number(m.weight)))
  )
}

export interface LoadResult {
  data: AppData
  storageAvailable: boolean
}

export function loadData(): LoadResult {
  try {
    const stored = localStorage.getItem(KEY)
    const data: AppData = stored ? normalize(JSON.parse(stored)) : demoData()
    if (!validData(data)) throw new Error('Respaldo inválido')
    return { data, storageAvailable: true }
  } catch {
    return { data: demoData(), storageAvailable: false }
  }
}

export function persist(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clone(data: AppData): AppData {
  return structuredClone(data)
}
