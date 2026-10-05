import type { AppData, Client, Routine, Trainer } from '../types'
import { addDays, TODAY } from './utils'

export function demoData(): AppData {
  const names = [
    'Valentina Ríos',
    'Carlos Mendoza',
    'Sofía Martínez',
    'Andrés Pérez',
    'Daniela Ruiz',
    'Mateo García',
  ]
  const goals = [
    'Fuerza y definición',
    'Ganar masa muscular',
    'Movilidad y bienestar',
    'Preparación deportiva',
    'Recomposición corporal',
    'Fuerza y resistencia',
  ]

  const routines: Routine[] = [
    {
      id: 'r1',
      name: 'Full body / Strength',
      category: 'Fuerza',
      level: 'Intermedio',
      duration: 55,
      notes: 'Ajusta la carga según técnica y esfuerzo percibido.',
      exercises: [
        { name: 'Sentadilla', sets: 4, reps: '8–10', rest: 90 },
        { name: 'Press de banca', sets: 3, reps: '10–12', rest: 90 },
        { name: 'Remo con mancuerna', sets: 3, reps: '12', rest: 60 },
        { name: 'Plancha', sets: 3, reps: '40 s', rest: 45 },
      ],
    },
    {
      id: 'r2',
      name: 'Lower body / Build',
      category: 'Hipertrofia',
      level: 'Intermedio',
      duration: 50,
      notes: 'Registrar cargas al terminar la sesión.',
      exercises: [
        { name: 'Peso muerto rumano', sets: 4, reps: '8', rest: 120 },
        { name: 'Zancadas', sets: 3, reps: '12', rest: 75 },
        { name: 'Hip thrust', sets: 4, reps: '10', rest: 90 },
      ],
    },
    {
      id: 'r3',
      name: 'Move / Feel good',
      category: 'Movilidad',
      level: 'Inicial',
      duration: 35,
      notes: 'Movimientos cómodos y controlados.',
      exercises: [
        { name: 'Movilidad de cadera', sets: 3, reps: '8 por lado', rest: 30 },
        { name: 'Puente de glúteos', sets: 3, reps: '15', rest: 45 },
        { name: 'Bird dog', sets: 3, reps: '10 por lado', rest: 30 },
      ],
    },
  ]

  const clients: Client[] = names.map((name, i) => ({
    id: `c${i + 1}`,
    name,
    email: `cliente${i + 1}@ejemplo.com`,
    phone: '',
    birth: '',
    goal: goals[i],
    plan: i % 2 ? 'Premium' : 'Personal',
    fee: i % 2 ? 120 : 80,
    weight: 58 + i * 5,
    height: 162 + i * 3,
    routine: routines[i % 3].id,
    notes: 'Ficha de ejemplo. Sustituye estos datos por los de tu cliente.',
    tone: i,
    archived: false,
    joined: addDays(TODAY, -45 - i * 3),
  }))

  const payments = clients.map((c, i) => ({
    id: `p${i + 1}`,
    client: c.id,
    amount: c.fee,
    due: addDays(TODAY, i < 2 ? -2 : i - 2),
    paid: i >= 2 && i < 5,
    paidDate: i >= 2 && i < 5 ? addDays(TODAY, -i) : '',
    method: 'Transferencia',
    note: 'Mensualidad — datos de ejemplo',
  }))

  const sessions = [
    ...clients.slice(0, 4).map((c, i) => ({
      id: `s${i + 1}`,
      client: c.id,
      title: i % 2 ? 'Sesión de fuerza' : 'Entrenamiento personal',
      date: TODAY,
      time: `${String(8 + i * 2).padStart(2, '0')}:00`,
      duration: 60,
      status: (i === 0 ? 'Completada' : 'Programada') as
        | 'Completada'
        | 'Programada',
      routine: c.routine,
      notes: '',
    })),
    ...clients.slice(0, 3).map((c, i) => ({
      id: `s${i + 5}`,
      client: c.id,
      title: 'Entrenamiento personal',
      date: addDays(TODAY, i + 1),
      time: '09:00',
      duration: 60,
      status: 'Programada' as const,
      routine: c.routine,
      notes: '',
    })),
    ...clients.map((c, i) => ({
      id: `s${i + 8}`,
      client: c.id,
      title: 'Sesión de fuerza',
      date: addDays(TODAY, -i - 1),
      time: '10:00',
      duration: 50,
      status: 'Completada' as const,
      routine: c.routine,
      notes: '',
    })),
  ]

  const measurements = clients.flatMap((c, i) =>
    [30, 20, 10, 0].map((ago, j) => ({
      id: `m${i}-${j}`,
      client: c.id,
      date: addDays(TODAY, -ago),
      weight: (c.weight ?? 0) + 1.5 - j * 0.5,
      waist: 76 + i * 2 - j * 0.5,
      fat: 22 - i * 0.4 - j * 0.2,
      note: 'Medición de ejemplo',
    })),
  )

  const trainers: Trainer[] = [
    {
      id: 't1',
      name: 'Alex Torres',
      email: 'admin@profallo.app',
      specialty: 'Entrenamiento personal',
      membership: 'premium',
      verified: true,
      role: 'admin',
      activeClients: clients.length,
      joined: addDays(TODAY, -120),
    },
    {
      id: 't2',
      name: 'María Gómez',
      email: 'maria@ejemplo.com',
      specialty: 'Fuerza e hipertrofia',
      membership: 'free',
      verified: false,
      role: 'trainer',
      activeClients: 3,
      joined: addDays(TODAY, -40),
      trialStart: addDays(TODAY, -4),
    },
    {
      id: 't3',
      name: 'Julián Rojas',
      email: 'julian@ejemplo.com',
      specialty: 'Movilidad y bienestar',
      membership: 'free',
      verified: false,
      role: 'trainer',
      activeClients: 1,
      joined: addDays(TODAY, -12),
      trialStart: addDays(TODAY, -25),
    },
    {
      id: 't4',
      name: 'Carolina Díaz',
      email: 'caro@ejemplo.com',
      specialty: 'Recomposición corporal',
      membership: 'premium',
      verified: true,
      role: 'trainer',
      activeClients: 9,
      joined: addDays(TODAY, -200),
      trialStart: addDays(TODAY, -15),
    },
  ]

  return {
    version: 1,
    profile: {
      name: 'Alex Torres',
      currency: 'USD',
      specialty: 'Entrenamiento personal',
      email: 'admin@profallo.app',
      role: 'admin',
      membership: 'premium',
      verified: true,
      trialStart: addDays(TODAY, -3),
    },
    clients,
    routines,
    payments,
    sessions,
    measurements,
    trainers,
    demo: true,
  }
}
