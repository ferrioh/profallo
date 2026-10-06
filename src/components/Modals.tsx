import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useApp, type ModalState } from '../context/AppContext'
import type {
  AppData,
  Client,
  Exercise,
  Measurement,
  Payment,
  Routine,
  BodyZone,
  Session,
  SessionStatus,
} from '../types'
import {
  addDays,
  findRoutine,
  TODAY,
  uid,
} from '../lib/utils'
import { exportData } from '../lib/backup'
import { PLANS as MEMBERSHIP_PLANS, planOf } from '../lib/plans'
import { cloudCreatePremiumRequest, cloudDeleteClient, cloudGetAppSettings, cloudMyPremiumRequests, type AppSettings, type PremiumMethod, type PremiumRequestRow } from '../lib/cloud'
import { fileToDataUrl, fitImage, loadImage } from '../lib/image'
import { ImageEditor } from './ImageEditor'
import { Icon } from './Icon'
import { Field, SelectField, TextField } from './form'
import { TimeWheelPicker } from './TimeWheelPicker'
import { BODY_ZONES, MuscleGuide, inferRoutineZones } from './MuscleGuide'

const PLANS = ['Personal', 'Premium', 'Online']
const ROUTINE_CATEGORIES = ['Fuerza', 'Hipertrofia', 'Movilidad', 'Cardio', 'Funcional', 'Mixto']
const ROUTINE_LEVELS = ['Inicial', 'Intermedio', 'Avanzado']
const SESSION_STATUSES: SessionStatus[] = ['Programada', 'Completada', 'Cancelada']
const METHODS = ['Transferencia', 'Efectivo', 'Tarjeta', 'Otro']

const timeToMin = (t: string) =>
  t.split(':').reduce((a, b, i) => a + Number(b) * (i ? 1 : 60), 0)

function upsert<T extends { id: string }>(arr: T[], item: T) {
  const idx = arr.findIndex((x) => x.id === item.id)
  if (idx < 0) arr.push(item)
  else arr[idx] = item
}

function FormWrap({
  kind,
  id,
  children,
  extra,
  error,
  onSubmit,
}: {
  kind: string
  id?: string
  children: ReactNode
  extra?: ReactNode
  error: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  const { closeModal } = useApp()
  return (
    <form id="entityForm" data-kind={kind} data-id={id ?? ''} onSubmit={onSubmit}>
      <div className="form-grid">{children}</div>
      <div id="formError" className="form-error" role="alert">
        {error}
      </div>
      <div className="form-foot">
        {extra}
        <button className="button light" type="button" onClick={closeModal}>
          Cancelar
        </button>
        <button className="button dark" type="submit">
          Guardar <Icon name="check" />
        </button>
      </div>
    </form>
  )
}

function useForm() {
  const { data, commit, closeModal, toast, ui, patchUi } = useApp()
  const activeClients = data.clients.filter((c) => !c.archived)
  const [error, setError] = useState('')
  const fail = (e: unknown) => setError((e as Error).message)
  return {
    data,
    commit,
    closeModal,
    toast,
    ui,
    patchUi,
    activeClients,
    error,
    setError,
    fail,
  }
}

/* ------------------------- Cliente ------------------------- */

export function ClientFormModal({ id }: { id?: string }) {
  const { data, commit, closeModal, toast, ui, patchUi, error, fail } = useForm()
  const { cloudEnabled, cloudUser } = useApp()
  const c = data.clients.find((x) => x.id === id)
  const newId = id || uid()
  const [photo, setPhoto] = useState(c?.photo ?? '')
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  async function onPhotoFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Sube una imagen.'); return }
    try { setPhotoSrc(await fileToDataUrl(file)) } catch { toast('No se pudo abrir la imagen.') }
  }

  async function deleteClient() {
    if (!c) return
    if (!window.confirm(`¿Seguro que quieres ELIMINAR a ${c.name}? Se borrarán también sus sesiones, mediciones y pagos. No se puede deshacer.`)) return
    if (cloudEnabled && cloudUser) await cloudDeleteClient(c.id)
    commit((d) => {
      const sessIds = d.sessions.filter((s) => s.client === c.id).map((s) => s.id)
      const measIds = d.measurements.filter((m) => m.client === c.id).map((m) => m.id)
      const payIds = d.payments.filter((p) => p.client === c.id).map((p) => p.id)
      d.clients = d.clients.filter((x) => x.id !== c.id)
      d.sessions = d.sessions.filter((s) => s.client !== c.id)
      d.measurements = d.measurements.filter((m) => m.client !== c.id)
      d.payments = d.payments.filter((p) => p.client !== c.id)
      d.deleted = [...new Set([...(d.deleted ?? []), c.id, ...sessIds, ...measIds, ...payIds])]
    })
    closeModal()
    toast('Cliente eliminado.')
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      if (!x.name?.trim() || !x.goal?.trim())
        throw new Error('Nombre y objetivo son obligatorios.')
      commit((d) => {
        const existing = d.clients.find((cc) => cc.id === id)
        const frequency: Client['frequency'] = x.frequency === 'quincenal' ? 'quincenal' : 'mensual'
        const client: Client = {
          id: newId,
          name: x.name.trim(),
          email: x.email ?? '',
          phone: x.phone ?? '',
          idNumber: x.idNumber ?? '',
          photo,
          birth: x.birth ?? '',
          goal: x.goal,
          plan: x.plan ?? 'Personal',
          fee: Number(x.fee),
          weight: x.weight ? Number(x.weight) : null,
          height: x.height ? Number(x.height) : null,
          routine: x.routine ?? '',
          notes: x.notes ?? '',
          gym: x.gym ?? '',
          tone: id ? existing?.tone ?? 0 : d.clients.length,
          archived: id ? existing?.archived ?? false : false,
          joined: x.joined || (id ? existing?.joined ?? TODAY : TODAY),
          frequency,
          gender: x.gender === 'hombre' ? 'hombre' : 'mujer',
        }
        upsert(d.clients, client)
        if (!id) {
          const interval = frequency === 'quincenal' ? 15 : 30
          d.payments.push({
            id: uid(),
            client: newId,
            amount: frequency === 'quincenal' ? Math.round((Number(x.fee) / 2) * 100) / 100 : Number(x.fee),
            due: addDays(client.joined || TODAY, interval),
            paid: false,
            paidDate: '',
            method: 'Transferencia',
            note: frequency === 'quincenal' ? 'Quincena' : 'Mensualidad',
          })
        }
      })
      if (!ui.progressClient) patchUi({ progressClient: newId })
      closeModal()
      toast('Registro guardado.')
    } catch (err) {
      fail(err)
    }
  }

  return (
    <FormWrap
      kind="client"
      id={id}
      error={error}
      onSubmit={onSubmit}
      extra={c ? <button className="button danger" type="button" onClick={deleteClient}><Icon name="trash" /> Eliminar</button> : null}
    >
      <div className="full client-photo-field">
        <label>Foto del cliente</label>
        <div className="client-photo-row">
          <span className="client-photo-preview">{photo ? <img src={photo} alt="Cliente" /> : <Icon name="users" />}</span>
          <button type="button" className="button light" onClick={() => photoInputRef.current?.click()}><Icon name="edit" /> Subir foto</button>
          {photo ? <button type="button" className="button light" onClick={() => setPhotoSrc(photo)}><Icon name="crop" /> Ajustar</button> : null}
          {photo ? <button type="button" className="button light" onClick={() => setPhoto('')}>Quitar</button> : null}
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => onPhotoFile(e.target.files?.[0])} />
      </div>
      <Field name="name" label="Nombre completo" value={c?.name} required maxLength={80} />
      <Field name="idNumber" label="Cédula / Documento" value={c?.idNumber} maxLength={40} />
      <Field name="email" label="Correo electrónico" type="email" value={c?.email} maxLength={120} />
      <Field name="phone" label="Teléfono" type="tel" value={c?.phone} maxLength={40} />
      <Field name="birth" label="Fecha de nacimiento" type="date" value={c?.birth} max={TODAY} />
      <Field name="joined" label="Fecha de registro" type="date" value={c?.joined ?? TODAY} required />
      <SelectField name="gender" label="Registrar como" value={c?.gender ?? 'mujer'}>
        <option value="mujer">Mujer</option>
        <option value="hombre">Hombre</option>
      </SelectField>
      <Field name="goal" label="Objetivo principal" value={c?.goal} required maxLength={150} />
      <SelectField name="plan" label="Plan" value={c?.plan}>
        {PLANS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </SelectField>
      <Field
        name="fee"
        label="Mensualidad"
        type="number"
        value={c?.fee ?? 80}
        min={0}
        max={100000}
        step={0.01}
        required
      />
      <SelectField name="frequency" label="Frecuencia de pago" value={c?.frequency ?? 'mensual'}>
        <option value="mensual">Mensual</option>
        <option value="quincenal">Quincenal (cada 15 días)</option>
      </SelectField>
      <SelectField name="routine" label="Rutina asignada" value={c?.routine}>
        <option value="">Sin asignar</option>
        {data.routines.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </SelectField>
      <Field name="gym" label="Gimnasio donde entrena" value={c?.gym} maxLength={80} placeholder="Por ejemplo, Gym Fitness Center" />
      <Field
        name="weight"
        label="Peso inicial / actual (kg)"
        type="number"
        value={c?.weight ?? ''}
        min={20}
        max={400}
        step={0.1}
      />
      <Field name="height" label="Estatura (cm)" type="number" value={c?.height ?? ''} min={80} max={250} />
      <TextField
        name="notes"
        label="Observaciones, limitaciones y preferencias"
        value={c?.notes}
      />
      {photoSrc ? (
        <ImageEditor
          src={photoSrc}
          onCancel={() => setPhotoSrc(null)}
          onSave={(d) => { setPhoto(d); setPhotoSrc(null) }}
        />
      ) : null}
    </FormWrap>
  )
}


/* ------------------------- Sesión ------------------------- */

export function SessionFormModal({ id, date }: { id?: string; date?: string }) {
  const { data, commit, closeModal, toast, ui, error, fail } = useForm()
  const s = data.sessions.find((x) => x.id === id)
  const activeClients = data.clients.filter((c) => !c.archived)
  const [sessionTime, setSessionTime] = useState(s?.time ?? '09:00')
  const [sessionDuration, setSessionDuration] = useState(s?.duration ?? 60)
  const [timePicker, setTimePicker] = useState<'clock' | 'duration' | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      if (!x.client || !x.date || !x.time)
        throw new Error('Selecciona cliente, fecha y hora.')
      const duration = Number(x.duration)
      const start = timeToMin(x.time)
      const conflict = data.sessions.some(
        (session) =>
          session.id !== id &&
          session.date === x.date &&
          session.status !== 'Cancelada' &&
          x.status !== 'Cancelada' &&
          (() => {
            const t = timeToMin(session.time)
            return start < t + Number(session.duration) && start + duration > t
          })(),
      )
      if (conflict)
        throw new Error('Ese horario coincide con otra sesión. Ajusta la hora o la duración.')
      commit((d) => {
        const session: Session = {
          id: id || uid(),
          client: x.client,
          title: x.title,
          date: x.date,
          time: x.time,
          duration,
          status: (x.status as SessionStatus) ?? 'Programada',
          routine: x.routine ?? '',
          notes: x.notes ?? '',
        }
        upsert(d.sessions, session)
      })
      closeModal()
      toast('Registro guardado.')
    } catch (err) {
      fail(err)
    }
  }

  return (
    <>
    <FormWrap kind="session" id={id} error={error} onSubmit={onSubmit}>
      <SelectField name="client" label="Cliente" value={s?.client}>
        {activeClients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Field
        name="title"
        label="Nombre de la sesión"
        value={s?.title ?? 'Entrenamiento personal'}
        required
        maxLength={120}
      />
      <Field
        name="date"
        label="Fecha"
        type="date"
        value={s?.date ?? date ?? ui.calendarDate}
        required
      />
      <div><label>Hora</label><input type="hidden" name="time" value={sessionTime} /><button className="time-picker-trigger" type="button" onClick={() => setTimePicker('clock')}><Icon name="clock" />{new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(`2000-01-01T${sessionTime}:00`))}<Icon name="chevron" /></button></div>
      <div><label>Duración</label><input type="hidden" name="duration" value={sessionDuration} /><button className="time-picker-trigger" type="button" onClick={() => setTimePicker('duration')}><Icon name="clock" />{sessionDuration} min<Icon name="chevron" /></button></div>
      <SelectField name="status" label="Estado" value={s?.status ?? 'Programada'}>
        {SESSION_STATUSES.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </SelectField>
      <SelectField name="routine" label="Rutina de esta sesión" value={s?.routine}>
        <option value="">Sin asignar</option>
        {data.routines.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </SelectField>
      <TextField
        name="notes"
        label="Notas de la sesión: cargas, esfuerzo y observaciones"
        value={s?.notes}
      />
    </FormWrap>
    {timePicker && <TimeWheelPicker mode={timePicker} value={timePicker === 'clock' ? sessionTime : sessionDuration} onSave={value => { if (timePicker === 'clock') setSessionTime(String(value)); else setSessionDuration(Number(value)); setTimePicker(null) }} onClose={() => setTimePicker(null)} />}
    </>
  )
}

/* ------------------------- Pago ------------------------- */

export function PaymentFormModal({
  id,
  receive = false,
}: {
  id?: string
  receive?: boolean
}) {
  const { data, commit, closeModal, toast, ui, error, fail } = useForm()
  const p = data.payments.find((x) => x.id === id)
  const activeClients = data.clients.filter((c) => !c.archived)
  const paidValue = p?.paid || receive ? 'yes' : 'no'

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      if (!x.client || !x.due || Number(x.amount) <= 0)
        throw new Error('Cliente, importe y fecha son obligatorios.')
      if (x.paid === 'yes' && !x.paidDate)
        throw new Error('Indica la fecha en la que recibiste el pago.')
      commit((d) => {
        const payment: Payment = {
          id: id || uid(),
          client: x.client,
          amount: Number(x.amount),
          due: x.due,
          paid: x.paid === 'yes',
          paidDate: x.paid === 'yes' ? x.paidDate : '',
          method: x.method ?? 'Transferencia',
          note: x.note ?? 'Mensualidad',
        }
        upsert(d.payments, payment)
      })
      closeModal()
      toast('Registro guardado.')
    } catch (err) {
      fail(err)
    }
  }

  return (
    <FormWrap kind="payment" id={id} error={error} onSubmit={onSubmit}>
      <SelectField name="client" label="Cliente" value={p?.client}>
        {activeClients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Field
        name="amount"
        label={`Importe (${data.profile.currency})`}
        type="number"
        value={p?.amount ?? activeClients[0]?.fee ?? 80}
        min={0.01}
        max={1000000}
        step={0.01}
        required
      />
      <Field
        name="due"
        label="Fecha de vencimiento"
        type="date"
        value={p?.due ?? ui.calendarDate}
        required
      />
      <SelectField name="paid" label="Estado" value={paidValue}>
        <option value="no">Pendiente</option>
        <option value="yes">Pagado</option>
      </SelectField>
      <Field
        name="paidDate"
        label="Fecha de cobro (si está pagado)"
        type="date"
        value={p?.paidDate ?? (receive ? TODAY : '')}
      />
      <SelectField name="method" label="Método" value={p?.method ?? 'Transferencia'}>
        {METHODS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </SelectField>
      <TextField name="note" label="Concepto o referencia" value={p?.note ?? 'Mensualidad'} />
    </FormWrap>
  )
}

/* ------------------------- Rutina ------------------------- */

function ExerciseEditorRow({
  exercise,
  onChange,
  onRemove,
  onRestClick,
}: {
  exercise: Exercise
  onChange: (patch: Partial<Exercise>) => void
  onRemove: () => void
  onRestClick: () => void
}) {
  return (
    <div className="exercise-row exercise-editor-card">
      <div className="exercise-editor-name">
        <label>
          Ejercicio
          <input
            aria-label="Nombre del ejercicio"
            className="ex-name"
            value={exercise.name}
            placeholder="Por ejemplo, sentadilla"
            required
            maxLength={120}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </label>
        <button type="button" onClick={onRemove} aria-label="Quitar ejercicio">
          <Icon name="close" />
        </button>
      </div>
      <div className="exercise-editor-values">
        <label>
          Series
          <input
            aria-label="Series"
            className="ex-sets"
            type="number"
            value={exercise.sets}
            min={1}
            max={20}
            required
            onChange={(e) => onChange({ sets: Number(e.target.value) })}
          />
        </label>
        <label>
          Repeticiones
          <input
            aria-label="Repeticiones"
            className="ex-reps"
            value={exercise.reps}
            required
            maxLength={30}
            onChange={(e) => onChange({ reps: e.target.value })}
          />
        </label>
        <div className="exercise-rest-control"><label>Descanso</label><button type="button" className="time-picker-trigger" onClick={onRestClick} aria-label={`Descanso: ${exercise.rest} segundos. Cambiar tiempo`}><Icon name="clock" />{exercise.rest >= 60 ? `${Math.floor(exercise.rest / 60)} min ${String(exercise.rest % 60).padStart(2, '0')} s` : `${exercise.rest} s`}</button></div>
      </div>
    </div>
  )
}

export function RoutineFormModal({ id }: { id?: string }) {
  const { data, commit, closeModal, toast, error, setError } = useForm()
  const r = data.routines.find((x) => x.id === id)
  const [exercises, setExercises] = useState<Exercise[]>(
    r?.exercises?.length
      ? r.exercises.map((e) => ({ ...e }))
      : [{ name: '', sets: 3, reps: '10–12', rest: 60 }],
  )
  const [duration, setDuration] = useState(r?.duration ?? 50)
  const [name, setName] = useState(r?.name ?? '')
  const [category, setCategory] = useState(r?.category ?? 'Fuerza')
  const [manualFocus, setManualFocus] = useState(Boolean(r?.focusZones?.length))
  const [manualZones, setManualZones] = useState<BodyZone[]>(r?.focusZones?.length ? [...r.focusZones] : [])
  const inferredZones = inferRoutineZones({ name, category, exercises })
  const focusZones = manualFocus ? manualZones : inferredZones
  const [timePicker, setTimePicker] = useState<{ mode: 'duration' | 'rest'; index?: number } | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setError('')
    try {
      const clean = exercises.map((ex) => ({
        name: ex.name.trim(),
        sets: Number(ex.sets),
        reps: ex.reps.trim(),
        rest: Number(ex.rest),
      }))
      if (!x.name?.trim() || !clean.length || clean.some((ex) => !ex.name || !ex.reps))
        throw new Error('Añade un nombre y completa todos los ejercicios.')
      commit((d) => {
        const routine: Routine = {
          id: id || uid(),
          name: x.name.trim(),
          category: x.category ?? 'Fuerza',
          level: x.level ?? 'Inicial',
          duration: Number(x.duration),
          notes: x.notes ?? '',
          exercises: clean,
          focusZones: manualFocus ? manualZones : undefined,
        }
        upsert(d.routines, routine)
      })
      closeModal()
      toast('Registro guardado.')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <>
    <FormWrap kind="routine" id={id} error={error} onSubmit={onSubmit}>
      <div className="full editor-intro">
        <span className="editor-step">01</span>
        <div>
          <h3>Define la intención.</h3>
          <p>Un nombre, un enfoque y a quién va dirigido.</p>
        </div>
      </div>
      <div className="full">
        <label htmlFor="routine-name">Nombre del plan</label>
        <input id="routine-name" name="name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
      </div>
      <div><label htmlFor="routine-category">Enfoque</label><select id="routine-category" name="category" value={category} onChange={e => setCategory(e.target.value)}>{ROUTINE_CATEGORIES.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
      <SelectField name="level" label="Nivel" value={r?.level ?? 'Inicial'}>
        {ROUTINE_LEVELS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </SelectField>
      <div><label>Duración del plan</label><select name="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{[20, 30, 40, 45, 50, 60, 75, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select></div>
      <div className="full editor-intro">
        <span className="editor-step">02</span>
        <div>
          <h3>Construye el movimiento.</h3>
          <p>Ajusta cada ejercicio en su propia tarjeta.</p>
        </div>
      </div>
      <div className="full">
        <div className="exercise-fields" id="exercises">
          {exercises.map((ex, i) => (
            <ExerciseEditorRow
              key={i}
              exercise={ex}
              onChange={(patch) =>
                setExercises((prev) =>
                  prev.map((item, j) => (j === i ? { ...item, ...patch } : item)),
                )
              }
              onRemove={() => {
                if (exercises.length > 1)
                  setExercises((prev) => prev.filter((_, j) => j !== i))
                else toast('La rutina necesita al menos un ejercicio.')
              }}
              onRestClick={() => setTimePicker({ mode: 'rest', index: i })}
            />
          ))}
        </div>
        <button
          className="button light add-exercise-button"
          type="button"
          onClick={() =>
            setExercises((prev) => [
              ...prev,
              { name: '', sets: 3, reps: '10–12', rest: 60 },
            ])
          }
        >
          <Icon name="plus" />
          Añadir otro movimiento
        </button>
      </div>
      <div className="full routine-focus-editor">
        <div className="routine-focus-controls">
          <div className="routine-focus-heading"><Icon name="body" /><div><h3>Mapa corporal</h3><p>Las zonas se detectan según el plan y sus ejercicios.</p></div></div>
          <label className="focus-auto-label"><input type="checkbox" checked={!manualFocus} onChange={e => { if (e.target.checked) setManualFocus(false); else { setManualZones(inferredZones); setManualFocus(true) } }} /> Selección automática</label>
          {manualFocus && <div className="focus-zone-options" aria-label="Zonas de trabajo">{BODY_ZONES.map(zone => <button key={zone.id} type="button" className={manualZones.includes(zone.id) ? 'active' : ''} aria-pressed={manualZones.includes(zone.id)} onClick={() => setManualZones(current => current.includes(zone.id) ? current.length > 1 ? current.filter(z => z !== zone.id) : current : [...current, zone.id])}>{zone.label}</button>)}</div>}
        </div>
        <MuscleGuide zones={focusZones} compact />
      </div>
      <TextField
        name="notes"
        label="La indicación que hace la diferencia"
        value={r?.notes}
      />
    </FormWrap>
    {timePicker && <TimeWheelPicker mode={timePicker.mode} value={timePicker.mode === 'duration' ? duration : exercises[timePicker.index ?? 0].rest} onSave={value => { if (timePicker.mode === 'duration') setDuration(Number(value)); else setExercises(prev => prev.map((item, i) => i === timePicker.index ? { ...item, rest: Number(value) } : item)); setTimePicker(null) }} onClose={() => setTimePicker(null)} />}
    </>
  )
}

/* ------------------------- Medición ------------------------- */

export function MeasurementFormModal({ id }: { id?: string }) {
  const { data, commit, closeModal, toast, ui, patchUi, error, fail } = useForm()
  const activeClients = data.clients.filter((c) => !c.archived)
  const current = data.measurements.find((m) => m.id === id)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      if (!x.client || Number(x.weight) < 20)
        throw new Error('Selecciona un cliente e indica su peso.')
      commit((d) => {
        const measurement: Measurement = {
          id: id || uid(),
          client: x.client,
          date: x.date,
          weight: Number(x.weight),
          waist: x.waist ? Number(x.waist) : null,
          fat: x.fat ? Number(x.fat) : null,
          note: x.note ?? '',
        }
        upsert(d.measurements, measurement)
        const client = d.clients.find((c) => c.id === x.client)
        const latest = d.measurements.filter(m => m.client === x.client).sort((a,b) => b.date.localeCompare(a.date))[0]
        if (client && latest) client.weight = latest.weight
      })
      patchUi({ progressClient: x.client })
      closeModal()
      toast('Registro guardado.')
    } catch (err) {
      fail(err)
    }
  }

  return (
    <FormWrap kind="measurement" id={id} error={error} onSubmit={onSubmit}>
      <SelectField name="client" label="Cliente" value={current?.client ?? ui.progressClient}>
        {activeClients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Field name="date" label="Fecha de medición" type="date" value={current?.date ?? TODAY} required />
      <Field
        name="weight"
        label="Peso (kg)"
        type="number"
        min={20}
        max={400}
        step={0.1}
        value={current?.weight}
        required
      />
      <Field name="waist" label="Cintura (cm)" type="number" min={20} max={300} step={0.1} value={current?.waist ?? ''} />
      <Field name="fat" label="Grasa corporal (%)" type="number" min={1} max={70} step={0.1} value={current?.fat ?? ''} />
      <TextField name="note" label="Observaciones" value={current?.note} />
    </FormWrap>
  )
}

/* ------------------------- Asignar rutina ------------------------- */

export function AssignRoutineModal({ id }: { id: string }) {
  const { data, commit, closeModal, toast, error, fail } = useForm()
  const { cloudEnabled, cloudUser } = useApp()
  const routine = findRoutine(data, id) ?? null
  const activeClients = data.clients.filter((c) => !c.archived)
  const [clientId, setClientId] = useState(activeClients[0]?.id ?? '')

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      const target = data.clients.find((c) => c.id === clientId)
      if (!target) throw new Error('Selecciona un cliente.')
      const date = x.date || TODAY
      commit((d) => {
        const c = d.clients.find((cc) => cc.id === clientId)
        if (c) c.routine = id
        d.sessions.push({
          id: uid(),
          client: clientId,
          title: routine?.name || 'Entrenamiento',
          date,
          time: '07:00',
          duration: routine?.duration ?? 60,
          status: 'Programada',
          routine: id,
          notes: '',
        })
      })
      closeModal()
      toast('Rutina asignada y agendada.')
    } catch (err) {
      fail(err)
    }
  }

  async function removeClient() {
    if (!clientId) { toast('Selecciona un cliente.'); return }
    const name = data.clients.find((c) => c.id === clientId)?.name ?? 'este cliente'
    if (!window.confirm(`¿Seguro que quieres ELIMINAR a ${name}? Se borrarán también sus sesiones, mediciones y pagos. No se puede deshacer.`)) return
    if (cloudEnabled && cloudUser) await cloudDeleteClient(clientId)
    commit((d) => {
      const sessIds = d.sessions.filter((s) => s.client === clientId).map((s) => s.id)
      const measIds = d.measurements.filter((m) => m.client === clientId).map((m) => m.id)
      const payIds = d.payments.filter((p) => p.client === clientId).map((p) => p.id)
      d.clients = d.clients.filter((c) => c.id !== clientId)
      d.sessions = d.sessions.filter((s) => s.client !== clientId)
      d.measurements = d.measurements.filter((m) => m.client !== clientId)
      d.payments = d.payments.filter((p) => p.client !== clientId)
      d.deleted = [...new Set([...(d.deleted ?? []), clientId, ...sessIds, ...measIds, ...payIds])]
    })
    closeModal()
    toast('Cliente eliminado.')
  }

  return (
    <FormWrap kind="assign" id={id} error={error} onSubmit={onSubmit}>
      <div>
        <label htmlFor="f-client">Cliente</label>
        <select id="f-client" name="client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {activeClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Field name="date" label="Fecha a asignar" type="date" value={TODAY} required />
      <div className="full alert-info">
        Se asignará <b>{routine?.name}</b> al cliente y se agendará una sesión ese día.
        Sus sesiones anteriores se conservan.
      </div>
      <div className="full">
        <button className="button danger" type="button" onClick={removeClient}>
          <Icon name="trash" /> Eliminar cliente
        </button>
      </div>
    </FormWrap>
  )
}

/* ------------------------- Membresía ------------------------- */

export function MembershipModal() {
  const { data, commit, closeModal, toast, cloudEnabled, cloudUser } = useApp()
  const current = planOf(data.profile.membership)
  const activeCount = data.clients.filter((c) => !c.archived).length
  const [step, setStep] = useState<'plans' | 'method' | 'pay' | 'sent'>('plans')
  const [method, setMethod] = useState<PremiumMethod>('pagomovil')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [capture, setCapture] = useState('')
  const [reference, setReference] = useState('')
  const [sending, setSending] = useState(false)
  const [reading, setReading] = useState(false)
  const [existing, setExisting] = useState<PremiumRequestRow | null>(null)
  const price = MEMBERSHIP_PLANS.premium.price

  useEffect(() => {
    if (cloudEnabled) cloudGetAppSettings().then(setSettings)
  }, [cloudEnabled])

  useEffect(() => {
    if (cloudEnabled && cloudUser) {
      cloudMyPremiumRequests(cloudUser).then((reqs) => {
        const pend = reqs.find((r) => r.status === 'pending')
        if (pend) { setExisting(pend); setStep('sent') }
      })
    }
  }, [cloudEnabled, cloudUser])

  function activateLocal(id: 'free' | 'premium') {
    commit((d) => {
      d.profile.membership = id
      d.profile.verified = id === 'premium'
      if (d.trainers && d.profile.email) {
        const me = d.trainers.find((t) => t.email === d.profile.email)
        if (me) {
          me.membership = id
          me.verified = id === 'premium'
        }
      }
    })
    closeModal()
    toast(id === 'premium' ? '¡Premium activado! Clientes ilimitados y perfil verificado.' : 'Plan Normal activado (hasta 3 clientes).')
  }

  async function onCapture(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Sube una imagen (captura).'); return }
    setReading(true)
    try {
      const url = await fileToDataUrl(file)
      const img = await loadImage(url)
      setCapture(fitImage(img, 1000, 0.7))
    } catch {
      toast('No se pudo procesar la imagen.')
    }
    setReading(false)
  }

  async function submitPremium() {
    if (!capture) { toast('Sube el comprobante de pago.'); return }
    if (!cloudUser) { toast('Vuelve a iniciar sesión.'); return }
    setSending(true)
    const ok = await cloudCreatePremiumRequest({
      trainerId: cloudUser,
      name: data.profile.name,
      email: data.profile.email ?? '',
      phone: data.profile.phone ?? '',
      idNumber: data.profile.idNumber ?? '',
      method,
      reference,
      amount: price,
      capture,
    })
    setSending(false)
    if (!ok) { toast('No se pudo enviar. Intenta de nuevo.'); return }
    setStep('sent')
  }

  const methodLabel = method === 'pagomovil' ? 'Pago Móvil' : method === 'binance' ? 'Binance' : 'Zelle'
  const methodInfo = settings
    ? method === 'pagomovil' ? settings.pay_pagomovil : method === 'binance' ? settings.pay_binance : settings.pay_zelle
    : ''

  const isPremium = current.id === 'premium'
  const premiumPlan = MEMBERSHIP_PLANS.premium
  const order: Array<'free' | 'premium'> = isPremium ? ['premium', 'free'] : ['free', 'premium']

  if (cloudEnabled && step === 'method') {
    return (
      <>
        <p className="notes" style={{ marginBottom: 16 }}>
          Elige cómo pagar <b>${price}</b> para activar Premium.
        </p>
        <div className="pay-methods">
          {(['pagomovil', 'binance'] as const).map((m) => (
            <button key={m} className="pay-method" type="button" onClick={() => { setMethod(m); setStep('pay') }}>
              <b>{m === 'pagomovil' ? 'Pago Móvil' : m === 'binance' ? 'Binance' : 'Zelle'}</b>
              <Icon name="chevron" />
            </button>
          ))}
        </div>
        <button className="entry-back" type="button" onClick={() => setStep('plans')}>‹ Volver</button>
      </>
    )
  }

  if (cloudEnabled && step === 'pay') {
    return (
      <>
        <span className="eyebrow">PAGO · {methodLabel.toUpperCase()}</span>
        <div className="pay-box">
          <p className="pay-amount">Monto a pagar: <b>${price}</b></p>
          <span className="pay-info-label">Datos de pago</span>
          <pre className="pay-info">{methodInfo || 'El administrador aún no cargó los datos de pago.'}</pre>
        </div>
        <div className="pay-user">
          <span className="eyebrow">TUS DATOS (AUTOMÁTICO)</span>
          <p>{data.profile.name}<br />{data.profile.email || 'sin correo'} · {data.profile.phone || 'sin teléfono'}<br />Cédula: {data.profile.idNumber || '—'}</p>
        </div>
        <label className="pay-ref">
          Número de referencia / operación
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej. 12345678" />
        </label>
        <label className="pay-upload">
          Subir captura del pago
          <input type="file" accept="image/*" onChange={(e) => onCapture(e.target.files?.[0])} />
        </label>
        {capture ? <img className="pay-capture" src={capture} alt="Comprobante" /> : null}
        {(reading || sending) ? (
          <div className="pay-progress">
            <span style={{ width: sending ? '100%' : '60%' }} />
            <small>{reading ? 'Cargando captura…' : 'Enviando comprobante…'}</small>
          </div>
        ) : null}
        <div className="form-foot">
          <button className="button light" type="button" onClick={() => setStep('method')}>Volver</button>
          <button className="button primary" type="button" disabled={sending || reading || !capture} onClick={submitPremium}>
            {sending ? 'Enviando…' : 'Enviar comprobante'}
          </button>
        </div>
      </>
    )
  }

  if (cloudEnabled && step === 'sent') {
    return (
      <div className="pay-sent">
        <span className="entry-confirm-icon"><Icon name="check" /></span>
        <span className="pay-badge-review">POR VERIFICAR</span>
        <h3>Pago en revisión</h3>
        <p>Tu comprobante fue enviado y está <b>POR VERIFICAR por la plataforma</b>. El administrador lo revisará y activará tu Premium. Te avisaremos aquí cuando sea procesado.</p>
        {existing ? <p className="form-hint">Referencia: {existing.reference || '—'} · ${existing.amount} · {existing.method === 'pagomovil' ? 'Pago Móvil' : 'Binance'}</p> : null}
        <button className="button primary" type="button" onClick={closeModal}>Entendido</button>
      </div>
    )
  }

  return (
    <>
      {isPremium ? (
        <div className="membership-active">
          <span className="verified verified-xl"><Icon name="check" /></span>
          <div>
            <h3>Premium activo</h3>
            <p>Clientes ilimitados y todas las ventajas.</p>
          </div>
        </div>
      ) : null}
      <p className="notes" style={{ marginBottom: 16 }}>
        Llevas <b>{activeCount}</b> {activeCount === 1 ? 'cliente' : 'clientes'} activos. Tu plan actual es{' '}
        <b>{current.name}</b>.
      </p>
      {order.map((pid) => {
        const plan = MEMBERSHIP_PLANS[pid]
        const isCurrent = current.id === pid
        const featured = pid === 'premium'
        const locked = isPremium && pid === 'free'
        return (
          <button
            key={pid}
            className={`plan-pill ${featured ? 'featured' : ''} ${isCurrent ? 'current' : ''} ${locked ? 'disabled' : ''}`}
            type="button"
            disabled={locked}
            aria-disabled={locked}
            title={locked ? 'Ya tienes Premium activo' : undefined}
            onClick={() => {
              if (locked || isCurrent) return
              if (pid === 'premium') {
                if (cloudEnabled) setStep('method')
                else activateLocal('premium')
              } else {
                activateLocal('free')
              }
            }}
          >
            <div className="plan-pill-main">
              <b>{plan.price === 0 ? 'Gratis' : `$${plan.price}/mes`}</b>
              <small>{featured ? 'Premium · clientes ilimitados y verificado' : 'Normal · hasta 3 clientes'}</small>
            </div>
            {isCurrent ? (
              <span className="plan-pill-badge">Activo</span>
            ) : locked ? (
              <span className="plan-pill-badge muted">No disponible</span>
            ) : featured ? (
              <span className="plan-pill-badge">Recomendado</span>
            ) : (
              <Icon name="chevron" />
            )}
          </button>
        )
      })}
      <div className="plan-benefits">
        <span className="eyebrow">BENEFICIOS PREMIUM</span>
        <ul className="plan-features big">
          {premiumPlan.features.map((f) => (
            <li key={f}><Icon name="check" /> {f}</li>
          ))}
        </ul>
      </div>
      <p className="form-hint" style={{ marginTop: 14 }}>
        La oferta Premium cuesta ${price} USD/mes.
      </p>
    </>
  )
}

/* ------------------------- Empezar vacío / Importar ------------------------- */

export function StartEmptyModal() {
  const { data, replaceData, closeModal, go, toast, patchUi } = useApp()
  return (
    <>
      <p className="notes">
        Se quitarán los datos de ejemplo de este navegador. Primero descarga un
        respaldo para conservar cualquier registro que hayas agregado.
      </p>
      <div className="form-foot">
        <button className="button light" onClick={() => exportData(data)}>
          Descargar respaldo
        </button>
        <button
          className="button dark"
          onClick={() => {
            exportData(data)
            replaceData({
              version: 1,
              profile: data.profile,
              clients: [],
              routines: [],
              sessions: [],
              payments: [],
              measurements: [],
              demo: false,
            })
            patchUi({ progressClient: '' })
            closeModal()
            go('clientes')
            toast('Espacio vacío creado. Se descargó el respaldo anterior.')
          }}
        >
          Crear espacio vacío
        </button>
      </div>
    </>
  )
}

export function ImportConfirmModal({ candidate }: { candidate: AppData }) {
  const { data, replaceData, closeModal, toast, patchUi } = useApp()
  const candidateData = candidate
  return (
    <>
      <p className="notes">
        Este respaldo contiene {candidateData.clients.length} clientes,{' '}
        {candidateData.sessions.length} sesiones y {candidateData.payments.length}{' '}
        pagos. Reemplazará los registros actuales de este navegador; antes se
        descargará una copia de seguridad.
      </p>
      <div className="form-foot">
        <button className="button light" onClick={closeModal}>
          Cancelar
        </button>
        <button
          className="button dark"
          onClick={() => {
            exportData(data)
            replaceData(candidateData)
            patchUi({
              progressClient:
                candidateData.clients.find((c) => !c.archived)?.id ?? '',
            })
            closeModal()
            toast('Respaldo importado.')
          }}
        >
          Importar respaldo
        </button>
      </div>
    </>
  )
}

/* ------------------------- Host ------------------------- */

const TITLES: Record<ModalState['kind'], string> = {
  'client-form': '',
  'session-form': '',
  'payment-form': '',
  'routine-form': '',
  'measurement-form': 'Medición',
  'assign-routine': 'Asignar rutina',
  membership: 'Tu membresía',
  'start-empty': 'Empezar tu espacio',
  'import-confirm': 'Importar respaldo',
}

function modalTitle(modal: ModalState, data: ReturnType<typeof useApp>['data']): string {
  switch (modal.kind) {
    case 'client-form':
      return modal.id ? 'Editar cliente' : 'Añadir cliente'
    case 'session-form':
      return modal.id ? 'Detalle de sesión' : 'Nueva sesión'
    case 'payment-form': {
      const p = data.payments.find((x) => x.id === modal.id)
      return modal.receive
        ? 'Registrar cobro recibido'
        : p?.id
          ? 'Editar pago'
          : 'Registrar pago'
    }
    case 'routine-form':
      return modal.id ? 'Afinar el plan' : 'Diseñar una rutina'
    case 'measurement-form':
      return modal.id ? 'Editar medición' : 'Añadir medición'
    default:
      return TITLES[modal.kind]
  }
}

export function ModalHost() {
  const { modal, closeModal, data } = useApp()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (modal) {
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
    }
  }, [modal])

  let body: ReactNode = null
  if (modal) {
    switch (modal.kind) {
      case 'client-form':
        body = <ClientFormModal id={modal.id} />
        break
      case 'session-form':
        body = <SessionFormModal id={modal.id} date={modal.date} />
        break
      case 'payment-form':
        body = <PaymentFormModal id={modal.id} receive={modal.receive} />
        break
      case 'routine-form':
        body = <RoutineFormModal id={modal.id} />
        break
      case 'measurement-form':
        body = <MeasurementFormModal id={modal.id} />
        break
      case 'assign-routine':
        body = <AssignRoutineModal id={modal.id} />
        break
      case 'membership':
        body = <MembershipModal />
        break
      case 'start-empty':
        body = <StartEmptyModal />
        break
      case 'import-confirm':
        body = <ImportConfirmModal candidate={modal.candidate} />
        break
    }
  }

  return (
    <dialog
      id="modal"
      className="app-sheet"
      aria-labelledby="dialogTitle"
      ref={ref}
      onClose={closeModal}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect()
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            ref.current.close()
        }
      }}
    >
      <div className="dialog-head">
        <div>
          <span className="eyebrow">PROFALLO / TU ESPACIO</span>
          <h2 id="dialogTitle">{modal ? modalTitle(modal, data) : ''}</h2>
        </div>
        <button className="icon-button" onClick={closeModal} aria-label="Cerrar ventana">
          <Icon name="close" />
        </button>
      </div>
      <div id="dialogBody">{body}</div>
    </dialog>
  )
}
