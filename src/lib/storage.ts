import type { AppData } from '../types'
import { demoData } from './demo'

export const KEY = 'protrainer.local.v1'

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
    const data: AppData = stored ? JSON.parse(stored) : demoData()
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
