import { describe, it, expect } from 'vitest'
import {
  TRIAL_DAYS,
  membershipLocked,
  planOf,
  reachedClientLimit,
  trainerStatus,
  trialDaysLeft,
} from './plans'
import { addDays, TODAY } from './utils'

describe('plans / prueba de 15 días', () => {
  it('devuelve los días restantes de prueba', () => {
    expect(trialDaysLeft(TODAY)).toBe(TRIAL_DAYS)
    expect(trialDaysLeft(addDays(TODAY, -1))).toBe(TRIAL_DAYS - 1)
  })

  it('no cuenta días negativos', () => {
    expect(trialDaysLeft(addDays(TODAY, -100))).toBe(0)
  })

  it('bloquea solo a los planes gratuitos vencidos', () => {
    expect(membershipLocked({ membership: 'free', trialStart: TODAY })).toBe(false)
    expect(membershipLocked({ membership: 'free', trialStart: addDays(TODAY, -TRIAL_DAYS) })).toBe(true)
    expect(membershipLocked({ membership: 'premium', trialStart: addDays(TODAY, -999) })).toBe(false)
  })

  it('clasifica el estado del entrenador', () => {
    expect(trainerStatus({ membership: 'premium', trialStart: addDays(TODAY, -99) })).toBe('premium')
    expect(trainerStatus({ membership: 'free', trialStart: TODAY })).toBe('trial')
    expect(trainerStatus({ membership: 'free', trialStart: addDays(TODAY, -TRIAL_DAYS) })).toBe('expired')
  })

  it('durante la prueba no hay límite de clientes', () => {
    expect(reachedClientLimit('free', 999)).toBe(false)
    expect(reachedClientLimit('premium', 999)).toBe(false)
    expect(planOf('premium').price).toBe(3)
  })
})
