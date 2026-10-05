export type View =
  | 'inicio'
  | 'clientes'
  | 'calendario'
  | 'pagos'
  | 'rutinas'
  | 'ajustes'
  | 'perfil'
  | 'cliente-perfil'
  | 'notificaciones'
  | 'admin'

export const VIEWS: View[] = [
  'inicio',
  'clientes',
  'calendario',
  'pagos',
  'rutinas',
  'ajustes',
  'perfil',
  'cliente-perfil',
  'notificaciones',
  'admin',
]

export interface Exercise {
  name: string
  sets: number
  reps: string
  rest: number
}

export interface Routine {
  id: string
  name: string
  category: string
  level: string
  duration: number
  notes: string
  exercises: Exercise[]
  focusZones?: BodyZone[]
}

export type BodyZone = 'shoulders' | 'chest' | 'arms' | 'core' | 'hips' | 'legs'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  idNumber?: string
  birth: string
  goal: string
  plan: string
  fee: number
  weight: number | null
  height: number | null
  routine: string
  notes: string
  gym?: string
  tone: number
  archived: boolean
  joined: string
  frequency?: 'mensual' | 'quincenal'
  gender?: 'mujer' | 'hombre'
}

export interface Payment {
  id: string
  client: string
  amount: number
  due: string
  paid: boolean
  paidDate: string
  method: string
  note: string
}

export type SessionStatus = 'Programada' | 'Completada' | 'Cancelada'

export interface Session {
  id: string
  client: string
  title: string
  date: string
  time: string
  duration: number
  status: SessionStatus
  routine: string
  notes: string
}

export interface Measurement {
  id: string
  client: string
  date: string
  weight: number
  waist: number | null
  fat: number | null
  note: string
}

export interface Profile {
  name: string
  currency: string
  specialty: string
  photo?: string
  email?: string
  phone?: string
  idNumber?: string
  instagram?: string
  tiktok?: string
  role?: 'trainer' | 'admin'
  membership?: 'free' | 'premium'
  trialStart?: string
  verified?: boolean
  reviews?: Array<{ id: string; client: string; rating: number; text: string; date: string }>
}

export interface Trainer {
  id: string
  name: string
  email: string
  specialty: string
  membership: 'free' | 'premium'
  verified: boolean
  role: 'trainer' | 'admin'
  activeClients: number
  joined: string
  trialStart?: string
}

export interface AppData {
  version: number
  profile: Profile
  clients: Client[]
  routines: Routine[]
  payments: Payment[]
  sessions: Session[]
  measurements: Measurement[]
  trainers?: Trainer[]
  notificationState?: {
    deleted: string[]
    muted: string[]
    read: string[]
  }
  membershipPayments?: Array<{
    id: string
    amount: number
    date: string
    period: string
    method: string
  }>
  demo: boolean
}

export type ClientFilter = 'activos' | 'todos' | 'archivo'
export type PaymentFilter = 'todos' | 'pendiente' | 'pagado' | 'vencido'
