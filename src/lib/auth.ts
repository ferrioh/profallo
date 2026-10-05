import { useSyncExternalStore } from 'react'
import { TODAY, uid } from './utils'

export interface Account {
  id: string
  name: string
  email: string
  password: string
  phone: string
  idNumber: string
  gym: string
  instagram: string
  role: 'admin' | 'trainer'
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export const GYMS = [
  'Gym Fitness Center',
  'Iron Temple',
  'Smart Fit',
  'Body Zone',
  'PowerHouse Gym',
  'CrossBox',
  'Aqua Fitness',
  'Full Energy Gym',
  'Otro',
]

const ACC_KEY = 'protrainer.accounts.v2'
const SESSION_KEY = 'protrainer.session.v2'

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACC_KEY)
    if (raw) return JSON.parse(raw) as Account[]
  } catch { /* ignore */ }
  return []
}

let accounts: Account[] = readAccounts()
let sessionId: string | null = (() => {
  try { return localStorage.getItem(SESSION_KEY) } catch { return null }
})()
let version = 0
const listeners = new Set<() => void>()

function emit() {
  version++
  listeners.forEach((l) => l())
}
function persist() {
  try { localStorage.setItem(ACC_KEY, JSON.stringify(accounts)) } catch { /* ignore */ }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useAuthVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => version)
}

export function useAccounts(): Account[] {
  useAuthVersion()
  return accounts
}

export const getAccounts = () => accounts

export function currentAccount(): Account | null {
  return accounts.find((a) => a.id === sessionId) ?? null
}

/* ------------------------- Validaciones estándar ------------------------- */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
export const PHONE_RE = /^[+]?[\d\s()-]{7,20}$/
export const ID_RE = /^[A-Za-z0-9-]{5,20}$/
export const PASS_MIN = 8

export interface SignupInput {
  name: string
  email: string
  password: string
  confirm: string
  phone: string
  idNumber: string
  gym: string
  instagram: string
  captchaOk: boolean
}

export function signup(input: SignupInput): { ok: boolean; error?: string; account?: Account } {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (name.length < 3) return { ok: false, error: 'Escribe tu nombre completo.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Correo electrónico no válido.' }
  if (accounts.some((a) => a.email === email)) return { ok: false, error: 'Ese correo ya está registrado.' }
  if (input.password.length < PASS_MIN) return { ok: false, error: `La contraseña debe tener al menos ${PASS_MIN} caracteres.` }
  if (input.password !== input.confirm) return { ok: false, error: 'Las contraseñas no coinciden.' }
  if (!PHONE_RE.test(input.phone.trim())) return { ok: false, error: 'Teléfono no válido.' }
  if (!ID_RE.test(input.idNumber.trim())) return { ok: false, error: 'Cédula no válida.' }
  if (!input.captchaOk) return { ok: false, error: 'Confirma que no eres un robot.' }

  const isFirst = accounts.length === 0
  const account: Account = {
    id: uid(),
    name,
    email,
    password: input.password,
    phone: input.phone.trim(),
    idNumber: input.idNumber.trim(),
    gym: input.gym,
    instagram: input.instagram.trim(),
    role: isFirst ? 'admin' : 'trainer',
    status: isFirst ? 'approved' : 'pending',
    createdAt: TODAY,
  }
  accounts = [...accounts, account]
  sessionId = account.id
  persist()
  try { localStorage.setItem(SESSION_KEY, account.id) } catch { /* ignore */ }
  emit()
  return { ok: true, account }
}

export function login(email: string, password: string): { ok: boolean; error?: string; account?: Account } {
  const acc = accounts.find((a) => a.email === email.trim().toLowerCase())
  if (!acc || acc.password !== password) return { ok: false, error: 'Correo o contraseña incorrectos.' }
  if (acc.status === 'rejected') return { ok: false, error: 'Tu acceso fue denegado por el administrador.' }
  sessionId = acc.id
  try { localStorage.setItem(SESSION_KEY, acc.id) } catch { /* ignore */ }
  emit()
  return { ok: true, account: acc }
}

export function logout() {
  sessionId = null
  try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  emit()
}

export function setAccountStatus(id: string, status: Account['status']) {
  accounts = accounts.map((a) => (a.id === id ? { ...a, status } : a))
  persist()
  emit()
}

export function setAccountRole(id: string, role: Account['role']) {
  accounts = accounts.map((a) => (a.id === id ? { ...a, role } : a))
  persist()
  emit()
}
