import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { useReveal } from '../hooks/useReveal'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { LineChart } from '../components/ui'
import { MuscleGuide, getRoutineZones } from '../components/MuscleGuide'
import { PublicClient } from './PublicClient'
import { cloudCreateClientLink } from '../lib/cloud'
import {
  buildClientShareLink,
  findRoutine,
  longDate,
  month,
  progressFor,
  TODAY,
} from '../lib/utils'

type MetricKey = 'weight' | 'waist' | 'fat'
const METRICS: Array<{ key: MetricKey; label: string; unit: string }> = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'fat', label: 'Grasa', unit: '%' },
]

function ActivityRings({ attendance, training, payments }: { attendance: number; training: number; payments: number }) {
  const rings = [
    { value: attendance, radius: 70, color: '#d2ff62', label: 'Asistencia' },
    { value: training, radius: 51, color: '#aede54', label: 'Sesiones completadas' },
    { value: payments, radius: 32, color: '#83aa44', label: 'Pagos realizados' },
  ]
  return <svg className="activity-rings" viewBox="0 0 180 180" role="img" aria-label={rings.map(r => `${r.label}: ${r.value}%`).join(', ')}>
    {rings.map(r => { const circumference = 2 * Math.PI * r.radius; return <g key={r.label} transform="rotate(-90 90 90)"><circle cx="90" cy="90" r={r.radius} fill="none" stroke="#555761" strokeWidth="11" /><circle cx="90" cy="90" r={r.radius} fill="none" stroke={r.color} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${circumference * Math.min(100, Math.max(0, r.value)) / 100} ${circumference}`} /></g> })}
    <circle cx="90" cy="90" r="17" fill="#24262c" />
  </svg>
}

export function ClientProfilePage() {
  const { data, ui, go, patchUi, money, toast, commit, cloudEnabled } = useApp()
  const actions = useActions()
  const [metric, setMetric] = useState<MetricKey>('weight')
  const [openSession, setOpenSession] = useState<string | null>(ui.focusSession || null)
  const [shareCode, setShareCode] = useState<string | null>(null)
  useReveal(ui.selectedClient)
  useEffect(() => {
    if (ui.focusSession) setOpenSession(ui.focusSession)
  }, [ui.focusSession])
  useEffect(() => {
    if (!ui.focusSession) return
    const t = window.setTimeout(() => {
      document.querySelector('.workout-block.open')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 280)
    return () => window.clearTimeout(t)
  }, [ui.focusSession])
  const client = data.clients.find(c => c.id === ui.selectedClient)
  if (!client) return <section className="card client-profile"><h1>Selecciona un cliente</h1><button className="button primary" onClick={() => go('clientes')}>Ir a clientes</button></section>
  const routine = findRoutine(data, client.routine)
  const sessions = data.sessions
    .filter(s => s.client === client.id && s.status !== 'Cancelada')
    .sort((a, b) => {
      const af = a.date >= TODAY, bf = b.date >= TODAY
      if (af !== bf) return af ? -1 : 1
      return af ? (a.date + a.time).localeCompare(b.date + b.time) : (b.date + b.time).localeCompare(a.date + a.time)
    })
  const completed = sessions.filter(s => s.status === 'Completada')
  const measurements = data.measurements.filter(m => m.client === client.id).sort((a,b) => b.date.localeCompare(a.date))
  const chrono = [...measurements].reverse()
  const payments = data.payments.filter(p => p.client === client.id).sort((a,b) => b.due.localeCompare(a.due))
  const paid = payments.filter(p => p.paid)
  const attendance = progressFor(data, client.id)
  const pastSessions = sessions.filter(s => s.date <= TODAY)
  const training = pastSessions.length ? Math.round(completed.length / pastSessions.length * 100) : 0
  const paymentRate = payments.length ? Math.round(paid.length / payments.length * 100) : 0
  const activeClient = client
  const current = METRICS.find(m => m.key === metric) ?? METRICS[0]
  const trend = chrono.filter(m => m[metric] != null).map(m => Number(m[metric]))
  const trendDelta = trend.length > 1 ? Number(trend[trend.length - 1] - trend[0]) : null
  const focus = data.sessions.find(s => s.id === ui.focusSession)

  function setSessionRoutine(sessionId: string, routineId: string) {
    commit((d) => {
      const s = d.sessions.find((x) => x.id === sessionId)
      if (s) s.routine = routineId
    })
    toast(routineId ? 'Entrenamiento actualizado.' : 'Entrenamiento eliminado.')
  }

  async function doShare(url: string) {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share) {
      try { await nav.share({ title: `Semana de ${activeClient.name}`, text: 'Tus entrenamientos de esta semana', url }); return } catch { /* cancelado */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copiado: ' + url)
    } catch {
      toast(`Comparte este link: ${url}`)
    }
  }

  async function shareFicha() {
    // Abre la vista previa (lo que verá el cliente) y desde ahí se comparte.
    if (cloudEnabled) {
      const code = await cloudCreateClientLink(activeClient.id)
      if (code) { setShareCode(code); return }
    }
    await doShare(buildClientShareLink(activeClient, data))
  }
  return <div className="client-profile">
    <div className="client-back-row">
      <button className="text-back" onClick={() => go('clientes')}>‹ Volver a clientes</button>
      {focus ? <button className="text-back date-back" onClick={() => { patchUi({ calendarDate: focus.date, calendarMonth: month(focus.date) }); go('calendario') }}><Icon name="calendar" /> {longDate(focus.date, { weekday: 'short', day: 'numeric', month: 'short' })} · Calendario</button> : null}
    </div>
    <header className="client-profile-hero">
      <Avatar client={client} />
      <div><span className="eyebrow">PERFIL DEL CLIENTE</span><h1>{client.name}</h1><p>{client.goal}</p>{client.gym ? <span className="client-gym"><Icon name="dumbbell" /> {client.gym}</span> : null}</div>
      <button className="button primary" onClick={() => actions.editClient(client.id)}><Icon name="edit" /> Editar perfil</button>
    </header>
    <div className="client-profile-actions reveal">
      <button className="button" onClick={shareFicha}><Icon name="share" /> Compartir semana del cliente</button>
    </div>
    <div className="client-visual-dashboard reveal">
      <section className="client-visual-card daily-card"><div className="visual-card-top"><span>Actividad del cliente</span><small>Progreso registrado</small></div><div className="daily-card-content"><div className="activity-metrics"><div><span>Asistencia</span><strong>{attendance}<small>%</small></strong><small>{completed.length} sesiones realizadas</small></div><div><span>Entrenamientos</span><strong>{completed.length}<small> / {pastSessions.length}</small></strong><small>{training}% completados</small></div><div><span>Pagos</span><strong>{paid.length}<small> / {payments.length}</small></strong><small>{paymentRate}% realizados</small></div></div><ActivityRings attendance={attendance} training={training} payments={paymentRate} /></div><div className="ring-legend"><span><i /> Asistencia</span><span><i /> Entrenamientos</span><span><i /> Pagos</span></div></section>
      <section className="client-visual-card workouts-card"><div className="visual-card-top"><span>Entrenamientos</span></div><div className="workout-list">{sessions.slice(0,5).map(s => { const sr = findRoutine(data, s.routine) ?? routine; const open = openSession === s.id; return <div className={`workout-block ${open ? 'open' : ''}`} key={s.id}><button className="workout-item" onClick={() => setOpenSession(open ? null : s.id)} aria-expanded={open}><span className="workout-icon"><Icon name="dumbbell" /></span><span className="workout-copy"><b>{s.title}</b><strong>{s.duration} min <small>· {s.status}</small></strong></span><span className="workout-date">{longDate(s.date)} ›</span></button>{open ? <div className="workout-detail"><div className="workout-detail-head"><span className="eyebrow">ENTRENAMIENTO</span><b>{sr?.name ?? 'Sin rutina asignada'}</b></div>{sr ? <><p className="routine-meta">{sr.category} · {sr.level} · {sr.duration} min</p>{sr.notes ? <p className="routine-note-text">{sr.notes}</p> : null}<div className="client-training-layout"><div className="routine-profile-list">{sr.exercises.map((e,i) => <div key={i}><b>{String(i+1).padStart(2,'0')}</b><span>{e.name}</span><small>{e.sets} × {e.reps}{e.rest ? ` · ${e.rest}s` : ''}</small></div>)}</div><MuscleGuide zones={getRoutineZones(sr)} sex={client.gender === 'hombre' ? 'male' : 'female'} compact /></div></> : <p>Sin rutina asignada a esta sesión.</p>}<div className="session-routine-picker"><span className="eyebrow">CAMBIAR O AGREGAR RUTINA</span><div className="session-routine-options">{data.routines.map(r => <button key={r.id} className={s.routine === r.id ? 'active' : ''} onClick={() => setSessionRoutine(s.id, r.id)}>{r.name}</button>)}</div>{s.routine ? <button className="button small danger-quiet" onClick={() => setSessionRoutine(s.id, '')}><Icon name="close" /> Quitar entrenamiento</button> : null}</div></div> : null}</div> })}{!sessions.length && <p className="visual-empty">Aún no hay sesiones registradas.</p>}</div></section>
      <section className="client-visual-card weight-card"><div className="visual-card-top"><span>Mediciones</span><button onClick={() => { patchUi({ progressClient: client.id }); actions.newMeasurement() }}>Nueva medición +</button></div><div className="weight-value">{measurements[0]?.weight ?? client.weight ?? '—'} <small>kg</small></div><p>{measurements.length ? `Última medición: ${longDate(measurements[0].date)}` : 'Agrega una medición para seguir el avance'}</p><div className="weight-meta"><span>Cintura <b>{measurements[0]?.waist ?? '—'} cm</b></span><span>Grasa <b>{measurements[0]?.fat ?? '—'}%</b></span></div></section>
    </div>
    <section className="progress-trend reveal">
      <div className="progress-trend-head"><div><span className="eyebrow">TENDENCIA</span><h3>{current.label}</h3></div><div className="progress-metric-tabs" role="group" aria-label="Parámetro a mostrar">{METRICS.map(mt => <button key={mt.key} className={metric === mt.key ? 'active' : ''} aria-pressed={metric === mt.key} onClick={() => setMetric(mt.key)}>{mt.label}</button>)}</div></div>
      <div className="progress-trend-body"><div className="progress-trend-value"><strong>{trend.at(-1) ?? '—'} <small>{current.unit}</small></strong>{trendDelta != null && <small className={trendDelta > 0 ? 'up' : 'down'}>{trendDelta > 0 ? '+' : ''}{trendDelta.toFixed(1)} {current.unit} desde el inicio</small>}</div><LineChart values={trend} unit={current.unit} /></div>
      <div className="progress-chart-dates"><span>{chrono[0] ? longDate(chrono[0].date) : 'Inicio'}</span><span>{measurements.length} registros</span><span>{chrono.length ? longDate(chrono[chrono.length - 1].date) : 'Hoy'}</span></div>
    </section>
    <div className="client-profile-grid">
      <section className="profile-dark-card tone-white reveal"><div className="section-line"><div><span className="eyebrow">EVOLUCIÓN</span><h2>Mediciones</h2></div><button className="button small" onClick={() => { patchUi({ progressClient: client.id }); actions.newMeasurement() }}>Añadir medición</button></div>{measurements.slice(0,4).map(m => <div className="profile-row" key={m.id}><span>{longDate(m.date)}</span><b>{m.weight} kg</b><button onClick={() => actions.editMeasurement(m.id)}>Editar</button></div>)}{!measurements.length && <p>El progreso aparecerá después de la primera medición.</p>}</section>
    </div>
    <section className="profile-dark-card reveal"><span className="eyebrow">INFORMACIÓN Y NOTAS</span><p>{client.notes || 'Sin observaciones.'}</p><div className="client-contact"><span>{client.idNumber ? `Cédula ${client.idNumber}` : 'Sin cédula'}</span><span>{client.email || 'Sin correo'}</span><span>{client.phone || 'Sin teléfono'}</span><span>Plan {client.plan} · {money(client.fee)} {client.frequency === 'quincenal' ? 'quincenal' : 'al mes'}</span>{client.joined ? <span className="client-since"><Icon name="calendar" /> Desde {longDate(client.joined, { day: 'numeric', month: 'short', year: 'numeric' })}</span> : null}</div></section>

    {shareCode ? createPortal(
      <div className="share-modal-backdrop" onClick={() => setShareCode(null)}>
        <div className="share-modal" onClick={(e) => e.stopPropagation()}>
          <div className="share-modal-head">Esto verá tu cliente</div>
          <div className="share-modal-body">
            <PublicClient code={shareCode} />
          </div>
          <div className="share-modal-foot">
            <button className="button light" type="button" onClick={() => setShareCode(null)}>Cerrar</button>
            <button className="button primary" type="button" onClick={() => doShare(`${location.origin}/c/${shareCode}`)}>
              <Icon name="share" /> Compartir
            </button>
          </div>
        </div>
      </div>,
      document.body,
    ) : null}
  </div>
}
