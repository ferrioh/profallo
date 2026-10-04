export type View =
  | 'inicio'
  | 'clientes'
  | 'calendario'
  | 'pagos'
  | 'rutinas'
  | 'progreso'
  | 'ajustes'
  | 'perfil'

export const VIEWS: View[] = [
  'inicio',
  'clientes',
  'calendario',
  'pagos',
  'rutinas',
  'progreso',
  'ajustes',
  'perfil',
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
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  birth: string
  goal: string
  plan: string
  fee: number
  weight: number | null
  height: number | null
  routine: string
  notes: string
  tone: number
  archived: boolean
  joined: string
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
}

export interface AppData {
  version: number
  profile: Profile
  clients: Client[]
  routines: Routine[]
  payments: Payment[]
  sessions: Session[]
  measurements: Measurement[]
  demo: boolean
}

export type ClientFilter = 'activos' | 'todos' | 'archivo'
export type PaymentFilter = 'todos' | 'pendiente' | 'pagado' | 'vencido'
