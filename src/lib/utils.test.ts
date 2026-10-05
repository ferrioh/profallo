import { describe, it, expect } from 'vitest'
import { addDays, computeStats, month, paidStatus, parseDate, iso, TODAY } from './utils'
import type { AppData, Payment } from '../types'

function baseData(over: Partial<AppData> = {}): AppData {
  return {
    version: 1,
    profile: { name: 'Test', currency: 'USD', specialty: 'Coach' },
    clients: [],
    routines: [],
    payments: [],
    sessions: [],
    measurements: [],
    demo: false,
    ...over,
  }
}

describe('utils', () => {
  it('addDays cruza fin de mes correctamente', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
  })

  it('month y roundtrip de fechas', () => {
    expect(month('2024-03-15')).toBe('2024-03')
    expect(iso(parseDate('2024-03-15'))).toBe('2024-03-15')
  })

  it('paidStatus clasifica pagado, vencido y pendiente', () => {
    const p = (over: Partial<Payment>): Payment => ({
      id: 'p', client: 'c', amount: 10, due: TODAY, paid: false, paidDate: '', method: 'Transferencia', note: '', ...over,
    })
    expect(paidStatus(p({ paid: true }))).toBe('Pagado')
    expect(paidStatus(p({ due: addDays(TODAY, -1) }))).toBe('Vencido')
    expect(paidStatus(p({ due: addDays(TODAY, 2) }))).toBe('Pendiente')
  })

  it('computeStats suma ingresos y pendientes', () => {
    const data = baseData({
      clients: [
        { id: 'c1', name: 'A', email: '', phone: '', birth: '', goal: '', plan: 'Personal', fee: 50, weight: null, height: null, routine: '', notes: '', tone: 0, archived: false, joined: TODAY },
        { id: 'c2', name: 'B', email: '', phone: '', birth: '', goal: '', plan: 'Personal', fee: 50, weight: null, height: null, routine: '', notes: '', tone: 0, archived: true, joined: TODAY },
      ],
      payments: [
        { id: 'p1', client: 'c1', amount: 50, due: TODAY, paid: true, paidDate: TODAY, method: 'x', note: '' },
        { id: 'p2', client: 'c1', amount: 30, due: addDays(TODAY, -3), paid: false, paidDate: '', method: 'x', note: '' },
      ],
    })
    const stats = computeStats(data)
    expect(stats.active).toBe(1)
    expect(stats.monthIncome).toBe(50)
    expect(stats.pending).toBe(30)
    expect(stats.late).toBe(1)
  })
})
