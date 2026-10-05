import { supabase, isSupabaseEnabled } from './supabase'
import { PREMIUM_PRICE, type PlanId } from './plans'
import { TODAY, uid } from './utils'

export interface TrainerRow {
  id: string
  email: string | null
  name: string
  specialty: string | null
  membership: PlanId
  verified: boolean
  role: 'trainer' | 'admin'
  created_at?: string
  trial_start?: string | null
  clients?: number
}

export async function listTrainers(): Promise<TrainerRow[] | null> {
  if (!isSupabaseEnabled || !supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,name,specialty,membership,verified,role,created_at,trial_start')
    .order('created_at', { ascending: true })
  if (error || !data) return null
  return data as TrainerRow[]
}

export async function setTrainerTrial(id: string, date: string): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false
  const { error } = await supabase
    .from('profiles')
    .update({ trial_start: date })
    .eq('id', id)
  return !error
}

export async function setTrainerMembership(id: string, membership: PlanId): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false
  const { error } = await supabase
    .from('profiles')
    .update({ membership, verified: membership === 'premium' })
    .eq('id', id)
  return !error
}

export async function setTrainerRole(id: string, role: 'trainer' | 'admin'): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  return !error
}

export async function recordMembershipPayment(trainerId: string, period: string): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false
  const { error } = await supabase.from('membership_payments').insert({
    id: uid(),
    trainer_id: trainerId,
    amount: PREMIUM_PRICE,
    period,
    paid: true,
    paid_date: TODAY,
    method: 'Manual',
    note: 'Membresía Premium',
  })
  return !error
}

export interface MembershipPaymentRow {
  id: string
  trainer_id: string
  amount: number
  period: string | null
  paid_date: string | null
}

export async function listMembershipPayments(): Promise<MembershipPaymentRow[] | null> {
  if (!isSupabaseEnabled || !supabase) return null
  const { data, error } = await supabase
    .from('membership_payments')
    .select('id,trainer_id,amount,period,paid_date')
    .order('paid_date', { ascending: false })
  if (error || !data) return null
  return data as MembershipPaymentRow[]
}
