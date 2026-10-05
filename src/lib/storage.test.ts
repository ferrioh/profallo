import { describe, it, expect } from 'vitest'
import { validData } from './storage'
import { demoData } from './demo'

describe('storage · validación de respaldos', () => {
  it('acepta los datos de ejemplo', () => {
    expect(validData(demoData())).toBe(true)
  })

  it('rechaza datos corruptos o incompletos', () => {
    expect(validData(null)).toBe(false)
    expect(validData({})).toBe(false)
    expect(validData({ ...demoData(), version: 99 })).toBe(false)
    expect(validData({ ...demoData(), clients: 'no-array' })).toBe(false)
  })
})
