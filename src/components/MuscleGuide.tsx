import type { BodyZone, Routine } from '../types'
import { Icon } from './Icon'

export const BODY_ZONES: Array<{ id: BodyZone; label: string }> = [
  { id: 'shoulders', label: 'Hombros' },
  { id: 'chest', label: 'Pecho y espalda' },
  { id: 'arms', label: 'Brazos' },
  { id: 'core', label: 'Abdomen' },
  { id: 'hips', label: 'Cadera y glúteos' },
  { id: 'legs', label: 'Piernas' },
]

const ALL_ZONES = BODY_ZONES.map(zone => zone.id)

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function inferRoutineZones(routine: Pick<Routine, 'name' | 'category' | 'exercises'>): BodyZone[] {
  const title = normalize(routine.name)
  if (/full body|cuerpo completo|total body|todo el cuerpo/.test(title)) return ALL_ZONES
  if (/lower body|tren inferior|piernas|gluteos/.test(title)) return ['hips', 'legs']
  if (/upper body|tren superior/.test(title)) return ['shoulders', 'chest', 'arms']
  const text = normalize(`${routine.name} ${routine.exercises.map(e => e.name).join(' ')}`)
  const zones = new Set<BodyZone>()
  if (/hombro|deltoid|militar|shoulder/.test(text)) zones.add('shoulders')
  if (/pecho|chest|banca|push|flexion|espalda|remo|row|dominada|pull/.test(text)) zones.add('chest')
  if (/brazo|bicep|tricep|curl|press|remo|row|push|flexion|dominada/.test(text)) zones.add('arms')
  if (/abdomen|abdominal|core|plancha|plank|bird dog|oblicuo/.test(text)) zones.add('core')
  if (/cadera|glute|hip|puente|thrust/.test(text)) zones.add('hips')
  if (/pierna|sentadilla|squat|zancada|lunge|peso muerto|deadlift|gemelo|pantorrilla/.test(text)) zones.add('legs')
  return zones.size ? ALL_ZONES.filter(zone => zones.has(zone)) : ALL_ZONES
}

export function getRoutineZones(routine: Pick<Routine, 'name' | 'category' | 'exercises' | 'focusZones'>): BodyZone[] {
  return routine.focusZones?.length ? routine.focusZones : inferRoutineZones(routine)
}

export function focusLabel(zones: BodyZone[]) {
  if (zones.length === ALL_ZONES.length) return 'Cuerpo completo'
  if (zones.length === 2 && zones.includes('hips') && zones.includes('legs')) return 'Tren inferior'
  if (zones.length === 3 && zones.includes('shoulders') && zones.includes('chest') && zones.includes('arms')) return 'Tren superior'
  return BODY_ZONES.filter(zone => zones.includes(zone.id)).map(zone => zone.label).join(' · ')
}

type Segment = { zone: BodyZone; d: string }

const male: Segment[] = [
  { zone: 'shoulders', d: 'M68 63 C56 60 47 65 43 76 L55 87 L68 81 Z M92 63 C104 60 113 65 117 76 L105 87 L92 81 Z' },
  { zone: 'chest', d: 'M68 64 L80 69 L92 64 L106 81 L101 111 L80 116 L59 111 L54 81 Z' },
  { zone: 'arms', d: 'M42 77 L54 88 L49 122 L43 158 L31 155 L32 115 Z M118 77 L106 88 L111 122 L117 158 L129 155 L128 115 Z' },
  { zone: 'core', d: 'M59 114 L80 118 L101 114 L98 158 L80 164 L62 158 Z' },
  { zone: 'hips', d: 'M62 161 L80 167 L98 161 L106 183 L91 194 L80 186 L69 194 L54 183 Z' },
  { zone: 'legs', d: 'M54 187 L69 197 L78 190 L77 246 L71 305 L55 305 L53 249 Z M106 187 L91 197 L82 190 L83 246 L89 305 L105 305 L107 249 Z' },
]

const female: Segment[] = [
  { zone: 'shoulders', d: 'M70 64 C59 62 51 67 48 76 L58 85 L70 80 Z M90 64 C101 62 109 67 112 76 L102 85 L90 80 Z' },
  { zone: 'chest', d: 'M70 66 L80 70 L90 66 L102 81 L99 109 L80 114 L61 109 L58 81 Z' },
  { zone: 'arms', d: 'M47 77 L58 86 L53 120 L47 158 L36 155 L37 116 Z M113 77 L102 86 L107 120 L113 158 L124 155 L123 116 Z' },
  { zone: 'core', d: 'M62 112 L80 116 L98 112 L94 151 L80 159 L66 151 Z' },
  { zone: 'hips', d: 'M66 154 L80 163 L94 154 C100 159 106 168 110 183 L92 195 L80 187 L68 195 L50 183 C54 168 60 159 66 154 Z' },
  { zone: 'legs', d: 'M50 186 L68 198 L78 191 L77 245 L71 305 L56 305 L53 249 Z M110 186 L92 198 L82 191 L83 245 L89 305 L104 305 L107 249 Z' },
]

function BodyFigure({ sex, zones }: { sex: 'male' | 'female'; zones: BodyZone[] }) {
  const selected = new Set(zones)
  const segments = sex === 'male' ? male : female
  return <div className="body-figure">
    <svg viewBox="0 0 160 320" role="img" aria-label={`${sex === 'male' ? 'Hombre' : 'Mujer'}: ${focusLabel(zones)}`}>
      <circle className="body-head" cx="80" cy="34" r="18" />
      {sex === 'female' && <path className="body-hair" d="M62 37 C56 22 65 12 80 12 C96 12 104 25 98 40 L94 49 L93 25 C87 17 72 18 67 26 L66 48 Z" />}
      <path className="body-neck" d="M71 49 L71 61 Q80 67 89 61 L89 49" />
      {segments.map((segment, index) => <path key={index} className={selected.has(segment.zone) ? 'body-segment selected' : 'body-segment'} d={segment.d} />)}
      <path className="body-foot" d="M55 303 L71 303 L72 311 L53 312 Z M89 303 L105 303 L107 312 L88 311 Z" />
    </svg>
    <span>{sex === 'male' ? 'Hombre' : 'Mujer'}</span>
  </div>
}

export function MuscleGuide({ zones, compact = false, sex }: { zones: BodyZone[]; compact?: boolean; sex?: 'male' | 'female' }) {
  return <div className={`muscle-guide ${compact ? 'compact' : ''} ${sex ? 'single' : ''}`}>
    <div className="muscle-guide-head"><span><Icon name="body" /> GUÍA CORPORAL</span><strong>{focusLabel(zones)}</strong></div>
    <div className="muscle-guide-figures">
      {sex ? <BodyFigure sex={sex} zones={zones} /> : <><BodyFigure sex="male" zones={zones} /><BodyFigure sex="female" zones={zones} /></>}
    </div>
    <div className="muscle-guide-legend"><i /> Zonas de trabajo</div>
  </div>
}
