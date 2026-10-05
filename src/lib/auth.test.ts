import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

async function fresh() {
  return await import('./auth')
}

const valid = {
  name: 'Juan Pérez',
  email: 'juan@example.com',
  password: '12345678',
  confirm: '12345678',
  phone: '+58 412 000 0000',
  idNumber: 'V-12345678',
  gym: 'Smart Fit',
  instagram: '@juan',
  captchaOk: true,
}

describe('auth · registro y acceso', () => {
  it('el primer usuario se crea como admin aprobado', async () => {
    const auth = await fresh()
    const r = auth.signup(valid)
    expect(r.ok).toBe(true)
    expect(r.account?.role).toBe('admin')
    expect(r.account?.status).toBe('approved')
  })

  it('el segundo usuario queda pendiente de verificación', async () => {
    const auth = await fresh()
    auth.signup(valid)
    const r = auth.signup({ ...valid, email: 'ana@example.com' })
    expect(r.ok).toBe(true)
    expect(r.account?.role).toBe('trainer')
    expect(r.account?.status).toBe('pending')
  })

  it('rechaza datos inválidos', async () => {
    const auth = await fresh()
    expect(auth.signup({ ...valid, email: 'mal' }).ok).toBe(false)
    expect(auth.signup({ ...valid, password: '123', confirm: '123' }).ok).toBe(false)
    expect(auth.signup({ ...valid, confirm: 'otraclave' }).ok).toBe(false)
    expect(auth.signup({ ...valid, captchaOk: false }).ok).toBe(false)
    expect(auth.signup({ ...valid, phone: 'x' }).ok).toBe(false)
    expect(auth.signup({ ...valid, idNumber: '12' }).ok).toBe(false)
  })

  it('no permite correos duplicados (case-insensitive)', async () => {
    const auth = await fresh()
    auth.signup(valid)
    expect(auth.signup({ ...valid, email: 'JUAN@example.com' }).ok).toBe(false)
  })

  it('login valida credenciales correctamente', async () => {
    const auth = await fresh()
    auth.signup(valid)
    expect(auth.login('juan@example.com', 'mala').ok).toBe(false)
    const ok = auth.login('juan@example.com', '12345678')
    expect(ok.ok).toBe(true)
    expect(ok.account?.email).toBe('juan@example.com')
  })

  it('no deja iniciar sesión a una cuenta denegada', async () => {
    const auth = await fresh()
    const r = auth.signup({ ...valid, email: 'ana@example.com' })
    auth.setAccountStatus(r.account!.id, 'rejected')
    expect(auth.login('ana@example.com', '12345678').ok).toBe(false)
  })
})
