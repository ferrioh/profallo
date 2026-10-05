/** Frases motivacionales para la portada del inicio (cambian en cada entrada). */
export const MOTIVATIONAL_MAIN = [
  'El progreso empieza contigo.',
  'Haz que cada día cuente.',
  'Constancia sobre talento.',
  'Tu equipo confía en ti.',
  'Da siempre el 1% más.',
  'Entrena mente y cuerpo.',
  'El esfuerzo tiene premio.',
  'Sé el coach que admiras.',
  'Hoy es tu mejor versión.',
  'Nadie entrena solo.',
  'Grandes metas, pasos cortos.',
  'La disciplina te hace libre.',
  'Diseña el cambio que quieres ver.',
  'Cada repetición cuenta.',
  'Lidera con el ejemplo.',
]

export const MOTIVATIONAL_SUB = [
  'Cada sesión suma.',
  'Cada persona importa.',
  'Un equipo, muchas historias.',
  'Tú marcas el ritmo.',
  'El progreso se construye.',
  'Coach better, every day.',
  'Energía, foco y acción.',
  'Entrena, organiza, cobra.',
]

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
