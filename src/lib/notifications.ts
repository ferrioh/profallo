import type { AppData } from '../types'
import { money, parseDate, TODAY } from './utils'

export type NotifColor = 'lime' | 'amber' | 'red' | 'slate'
export type NotifIcon = 'wallet' | 'calendar' | 'star' | 'bell'

export interface AppNotification {
  id: string
  kind: 'pago' | 'sesion' | 'premium' | 'sistema'
  title: string
  body: string
  color: NotifColor
  icon: NotifIcon
  time: string
  muted?: boolean
  target?: { kind: 'payment' | 'session' | 'premium'; id?: string; date?: string }
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const past = diff >= 0
  const abs = Math.abs(diff)
  const min = Math.round(abs / 60000)
  let value: string
  if (min < 1) return 'ahora'
  else if (min < 60) value = `${min} min`
  else {
    const h = Math.round(min / 60)
    if (h < 24) value = `${h} h`
    else {
      const d = Math.round(h / 24)
      if (d === 1) value = '1 día'
      else if (d < 30) value = `${d} días`
      else return parseDate(iso.slice(0, 10)).toLocaleDateString('es', { day: 'numeric', month: 'short' })
    }
  }
  return past ? `hace ${value}` : `en ${value}`
}

export function buildNotifications(data: AppData): AppNotification[] {
  const ns = data.notificationState ?? { deleted: [], muted: [], read: [] }
  const currency = data.profile.currency
  const nameOf = (id: string) => data.clients.find((c) => c.id === id)?.name ?? 'Cliente'
  const out: AppNotification[] = []

  data.payments
    .filter((p) => !p.paid)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6)
    .forEach((p) => {
      const overdue = p.due < TODAY
      const dueToday = p.due === TODAY
      out.push({
        id: `pay:${p.id}`,
        kind: 'pago',
        title: dueToday ? 'Pago vence hoy' : overdue ? 'Pago vencido' : 'Pago próximo',
        body: `${nameOf(p.client)} · ${money(currency, p.amount)}${p.note ? ` · ${p.note}` : ''}`,
        color: overdue ? 'red' : dueToday ? 'amber' : 'lime',
        icon: 'wallet',
        time: new Date(`${p.due}T09:00:00`).toISOString(),
        target: { kind: 'payment', id: p.id },
      })
    })

  data.sessions
    .filter((s) => s.date === TODAY && s.status !== 'Cancelada')
    .forEach((s) => {
      out.push({
        id: `ses:${s.id}`,
        kind: 'sesion',
        title: 'Sesión programada',
        body: `${nameOf(s.client)} · ${s.time} (${s.duration} min)`,
        color: 'lime',
        icon: 'calendar',
        time: new Date(`${s.date}T${s.time}:00`).toISOString(),
        target: { kind: 'session', id: s.id, date: s.date },
      })
    })

  if (data.profile.membership === 'premium') {
    out.push({
      id: 'premium:renew',
      kind: 'premium',
      title: 'Tu Premium se renueva pronto',
      body: 'Membresía Premium · 3 USD/mes. Verifica tu pago para conservar el verificado.',
      color: 'amber',
      icon: 'star',
      time: new Date().toISOString(),
      target: { kind: 'premium' },
    })
  }

  return out
    .filter((n) => !ns.deleted.includes(n.id))
    .map((n) => ({ ...n, muted: ns.muted.includes(n.id) }))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}
