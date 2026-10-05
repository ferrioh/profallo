export type PlanId = 'free' | 'premium'

import { addDays, parseDate, TODAY } from './utils'

export const TRIAL_DAYS = 15

export interface PlanDef {
  id: PlanId
  name: string
  price: number
  clientLimit: number | null
  verified: boolean
  tagline: string
  features: string[]
}

export const PREMIUM_PRICE = 3

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: 'free',
    name: 'Normal',
    price: 0,
    clientLimit: 3,
    verified: false,
    tagline: `Gratis ${TRIAL_DAYS} días con todo incluido`,
    features: [
      `Prueba gratis de ${TRIAL_DAYS} días con TODO incluido`,
      'Clientes ilimitados durante la prueba',
      'Rutinas, calendario, pagos y progreso',
      'PDF, compartir ficha y analíticas',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: PREMIUM_PRICE,
    clientLimit: null,
    verified: true,
    tagline: `Clientes ilimitados por ${PREMIUM_PRICE} USD/mes`,
    features: [
      'Clientes ilimitados',
      'Analíticas de pago',
      'Descargar fichas en PDF',
      'Enviar al cliente el link de la rutina del día',
      'Progreso y mediciones',
      'Ícono de verificado en tu nombre',
      'Soporte 24/7',
      'Links personalizados con videos para tus clientes',
    ],
  },
}

export function planOf(id: string | undefined): PlanDef {
  return id === 'premium' ? PLANS.premium : PLANS.free
}

export function clientLimit(plan: PlanDef): number {
  return plan.clientLimit ?? Number.POSITIVE_INFINITY
}

export function reachedClientLimit(planId: string | undefined, activeClients: number): boolean {
  const plan = planOf(planId)
  // Durante la prueba (plan Normal) todo está desbloqueado.
  if (plan.id === 'free') return false
  return plan.clientLimit != null && activeClients >= plan.clientLimit
}

export function trialEnd(start?: string): string {
  return addDays(start || TODAY, TRIAL_DAYS)
}

export function trialDaysLeft(start?: string): number {
  const diff = Math.ceil((parseDate(trialEnd(start)).getTime() - parseDate(TODAY).getTime()) / 86400000)
  return Math.max(0, diff)
}

export function isTrialExpired(start?: string): boolean {
  return trialDaysLeft(start) <= 0
}

export function membershipLocked(profile: { membership?: string; trialStart?: string }): boolean {
  return profile.membership !== 'premium' && isTrialExpired(profile.trialStart)
}

export function trainerStatus(profile: { membership?: string; trialStart?: string }): 'premium' | 'trial' | 'expired' {
  if (profile.membership === 'premium') return 'premium'
  return isTrialExpired(profile.trialStart) ? 'expired' : 'trial'
}

