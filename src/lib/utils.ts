import type { AppData, Client, Payment, Routine } from '../types'

export const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

export const TODAY = iso(new Date())

export const parseDate = (s: string): Date => new Date(`${s}T12:00:00`)

export const addDays = (s: string, n: number): string => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export const month = (s: string): string => s.slice(0, 7)

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const COLORS = ['lime', 'blue', 'pink', 'purple'] as const

export const initials = (n: string | undefined | null): string =>
  String(n ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase()

export const clientPhotos: Record<string, string> = {
  c1: 'assets/client-valentina.png',
  c3: 'assets/client-sofia.png',
  c5: 'assets/client-daniela.png',
}

export const money = (currency: string, n: number | string): string =>
  new Intl.NumberFormat('es', {
    style: 'currency',
    currency: ['USD', 'EUR', 'VES'].includes(currency) ? currency : 'USD',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

export const longDate = (
  s: string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' },
): string => parseDate(s).toLocaleDateString('es', opts)

export const shortWeekday = (s: string): string =>
  parseDate(s).toLocaleDateString('es', { weekday: 'short' }).slice(0, 3)

export const paidStatus = (p: Payment): 'Pagado' | 'Vencido' | 'Pendiente' =>
  p.paid ? 'Pagado' : p.due < TODAY ? 'Vencido' : 'Pendiente'

export const findClient = (data: AppData, id: string): Client =>
  data.clients.find((c) => c.id === id) ?? {
    id,
    name: 'Cliente archivado',
    email: '',
    phone: '',
    birth: '',
    goal: '',
    plan: '',
    fee: 0,
    weight: null,
    height: null,
    routine: '',
    notes: '',
    tone: 0,
    archived: false,
    joined: '',
  }

export const findRoutine = (
  data: AppData,
  id: string | undefined,
): Routine | undefined => data.routines.find((r) => r.id === id)

export const progressFor = (data: AppData, id: string): number => {
  const sess = data.sessions.filter(
    (s) => s.client === id && s.date <= TODAY && s.status !== 'Cancelada',
  )
  return sess.length
    ? Math.round(
        (sess.filter((s) => s.status === 'Completada').length / sess.length) *
          100,
      )
    : 0
}

export interface Stats {
  active: number
  monthIncome: number
  pending: number
  todaySessions: AppData['sessions']
  late: number
}

export const computeStats = (data: AppData): Stats => ({
  active: data.clients.filter((c) => !c.archived).length,
  monthIncome: data.payments
    .filter((p) => p.paid && month(p.paidDate || p.due) === month(TODAY))
    .reduce((n, p) => n + Number(p.amount), 0),
  pending: data.payments
    .filter((p) => !p.paid)
    .reduce((n, p) => n + Number(p.amount), 0),
  todaySessions: data.sessions.filter(
    (s) => s.date === TODAY && s.status !== 'Cancelada',
  ),
  late: data.payments.filter((p) => !p.paid && p.due < TODAY).length,
})

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
