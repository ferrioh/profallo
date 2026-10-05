import { describe, it, expect } from 'vitest'
import { buildNotifications, timeAgo } from './notifications'
import { addDays, TODAY } from './utils'
import type { AppData } from '../types'

function data(): AppData {
  return {
    version: 1,
    profile: { name: 'Coach', currency: 'USD', specialty: 'x', membership: 'premium' },
    clients: [
      { id: 'c1', name: 'Ana', email: '', phone: '', birth: '', goal: '', plan: 'Personal', fee: 50, weight: null, height: null, routine: '', notes: '', tone: 0, archived: false, joined: TODAY },
    ],
    routines: [],
    payments: [
      { id: 'p1', client: 'c1', amount: 50, due: addDays(TODAY, -1), paid: false, paidDate: '', method: 'x', note: 'Mensualidad' },
    ],
    sessions: [
      { id: 's1', client: 'c1', title: 'Fuerza', date: TODAY, time: '09:00', duration: 60, status: 'Programada', routine: '', notes: '' },
    ],
    measurements: [],
    demo: false,
  }
}

describe('notifications', () => {
  it('genera avisos de pago, sesión y premium', () => {
    const ids = buildNotifications(data()).map((n) => n.id)
    expect(ids).toContain('pay:p1')
    expect(ids).toContain('ses:s1')
    expect(ids).toContain('premium:renew')
  })

  it('la notificación de sesión apunta a su fecha para el calendario', () => {
    const ses = buildNotifications(data()).find((n) => n.id === 'ses:s1')
    expect(ses?.target).toEqual({ kind: 'session', id: 's1', date: TODAY })
  })

  it('respeta las notificaciones borradas y marca las silenciadas', () => {
    const d = data()
    d.notificationState = { deleted: ['pay:p1'], muted: ['ses:s1'], read: [] }
    const list = buildNotifications(d)
    expect(list.map((n) => n.id)).not.toContain('pay:p1')
    expect(list.find((n) => n.id === 'ses:s1')?.muted).toBe(true)
  })

  it('timeAgo devuelve "ahora" y tiempos relativos', () => {
    expect(timeAgo(new Date().toISOString())).toBe('ahora')
    expect(timeAgo(new Date(Date.now() - 2 * 3600 * 1000).toISOString())).toMatch(/hace/)
    expect(timeAgo(new Date(Date.now() + 2 * 3600 * 1000).toISOString())).toMatch(/en/)
  })
})
