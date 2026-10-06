import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { LineChart } from '../components/ui'
import { EntryLoader } from '../components/EntryLoader'
import { cloudPublicClientWeek, type ClientWeek } from '../lib/cloud'
import { addDays, longDate, shortWeekday, TODAY } from '../lib/utils'
import { MuscleGuide, getRoutineZones } from '../components/MuscleGuide'

const METS: Array<{ key: 'weight' | 'waist' | 'fat'; label: string; unit: string }> = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'fat', label: 'Grasa', unit: '%' },
]

export function PublicClient({ code }: { code: string }) {
  const [w, setW] = useState<ClientWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [pm, setPm] = useState<'weight' | 'waist' | 'fat'>('weight')
  const [expDay, setExpDay] = useState<string | null>(null)

  useEffect(() => {
    cloudPublicClientWeek(code)
      .then((x) => { setW(x); setLoading(false) })
      .catch(() => setLoading(false))
  }, [code])

  if (loading) {
    return <EntryLoader />
  }

  if (!w) {
    return (
      <div className="public-client">
        <div className="pc-head">
          <h1>Link no válido</h1>
          <p className="pc-goal">Este enlace expiró o no existe. Pídele a tu entrenador uno nuevo.</p>
        </div>
      </div>
    )
  }

  const start = w.weekStart || TODAY
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d >= TODAY)
  const byDate = (d: string) => w.sessions.filter((s) => s.date === d)
  const pending = w.sessions.filter((s) => s.date >= TODAY).length
  const measures = (w.measurements ?? []).filter((m) => m.weight != null)
  const allMeas = w.measurements ?? []
  const mUnit = METS.find((m) => m.key === pm)?.unit ?? ''
  const series = allMeas.filter((m) => m[pm] != null).map((m) => Number(m[pm]))

  return (
    <div className="public-client">
      {w.clientPhoto ? <div className="pc-bg" style={{ backgroundImage: `url(${w.clientPhoto})` }} aria-hidden="true" /> : null}
      <div className="pc-bg-shade" aria-hidden="true" />
      <header className="pc-head">
        {w.clientPhoto ? <div className="pc-photo"><img src={w.clientPhoto} alt={w.clientName} /></div> : null}
        <span className="pc-coach">Entrenador: <b>{w.trainerName}</b></span>
        <h1>{w.clientName}</h1>
        {w.clientGoal ? <p className="pc-goal">{w.clientGoal}</p> : null}
        <span className="pc-week">
          <Icon name="calendar" /> Semana del {longDate(start, { day: 'numeric', month: 'long' })}
        </span>
      </header>

      {pending === 0 ? (
        <div className="pc-empty">
          <Icon name="dumbbell" />
          <p>No tienes entrenamientos pendientes esta semana. Lo que ya pasó se quitó automáticamente.</p>
        </div>
      ) : (
        <div className="pc-days">
          {days.map((d) => {
            const list = byDate(d)
            const expanded = expDay === d
            return (
              <section key={d} className={`pc-day ${d === TODAY ? 'today' : ''} ${list.length ? 'has' : ''}`}>
                <header className="pc-day-head" onClick={() => setExpDay(expDay === d ? null : d)}>
                  <span className="pc-day-name">{shortWeekday(d)}</span>
                  <span className="pc-day-date">{longDate(d, { day: 'numeric', month: 'short' })}</span>
                  {d === TODAY ? <span className="pc-today">HOY</span> : null}
                  <span className="pc-day-chev">{expanded ? '−' : '+'}</span>
                </header>
                {expanded && list.length ? list.map((s) => (
                  <div key={`${s.date}-${s.time}`} className="pc-session">
                    <div className="pc-session-top">
                      <span className="pc-time">{s.time}</span>
                      <div className="pc-session-copy">
                        <b>{s.routineName || s.title || 'Entrenamiento'}</b>
                        <small>{s.duration} min{s.category ? ` · ${s.category}` : ''}</small>
                      </div>
                    </div>
                    {s.exercises && s.exercises.length ? (
                      <div className="pc-ex-row">
                        <ul className="pc-exercises">
                          {s.exercises.map((ex, j) => (
                            <li key={j}><span>{ex.name}</span><small>{ex.sets}×{ex.reps}{ex.rest ? ` · ${ex.rest}s` : ''}</small></li>
                          ))}
                        </ul>
                        {(() => { const zones = getRoutineZones({ name: s.routineName ?? '', category: s.category ?? '', exercises: s.exercises, focusZones: [] }); return zones.length ? <MuscleGuide zones={zones} compact /> : null })()}
                      </div>
                    ) : null}
                    {s.notes ? <p className="pc-notes">{s.notes}</p> : null}
                  </div>
                )) : null}
                {expanded && !list.length ? <p className="pc-rest">Descanso</p> : null}
              </section>
            )
          })}
        </div>
      )}

      {measures.length ? (
        <section className="pc-day pc-progress">
          <header className="pc-day-head">
            <span className="pc-day-name">Progreso</span>
          </header>
          <div className="pc-metric-tabs">
            {METS.map((mt) => (
              <button key={mt.key} type="button" className={pm === mt.key ? 'active' : ''} onClick={() => setPm(mt.key)}>{mt.label}</button>
            ))}
          </div>
          <LineChart values={series} unit={mUnit} cls="metric-chart pc-chart" />
        </section>
      ) : null}

      <footer className="pc-foot">
        <span className="pc-brand">PROFALLO</span>
        <span>profallo.vercel.app</span>
      </footer>
    </div>
  )
}
