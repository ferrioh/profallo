import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { cloudPublicClientWeek, type ClientWeek } from '../lib/cloud'
import { addDays, longDate, shortWeekday, TODAY } from '../lib/utils'

export function PublicClient({ code }: { code: string }) {
  const [w, setW] = useState<ClientWeek | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cloudPublicClientWeek(code)
      .then((x) => { setW(x); setLoading(false) })
      .catch(() => setLoading(false))
  }, [code])

  if (loading) {
    return (
      <div className="entry-loader" aria-hidden="true">
        <span className="entry-loader-logo">p</span>
        <span className="entry-loader-line" />
      </div>
    )
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
  const firstW = measures[0]?.weight ?? null
  const lastW = measures[measures.length - 1]?.weight ?? null
  const delta = firstW != null && lastW != null ? Number((Number(lastW) - Number(firstW)).toFixed(1)) : null
  const lastM = measures[measures.length - 1]
  const wa = w.trainerPhone
    ? `https://wa.me/${w.trainerPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${w.trainerName}, vi mi semana de entrenamiento 💪`)}`
    : ''

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
            return (
              <section key={d} className={`pc-day ${d === TODAY ? 'today' : ''} ${list.length ? 'has' : ''}`}>
                <header className="pc-day-head">
                  <span className="pc-day-name">{shortWeekday(d)}</span>
                  <span className="pc-day-date">{longDate(d, { day: 'numeric', month: 'short' })}</span>
                  {d === TODAY ? <span className="pc-today">HOY</span> : null}
                </header>
                {list.length ? (
                  list.map((s, i) => (
                    <div key={i} className="pc-session">
                      <div className="pc-session-top">
                        <span className="pc-time">{s.time}</span>
                        <div className="pc-session-copy">
                          <b>{s.routineName || s.title || 'Entrenamiento'}</b>
                          <small>
                            {s.duration} min{s.category ? ` · ${s.category}` : ''}
                          </small>
                        </div>
                      </div>
                      {s.exercises && s.exercises.length ? (
                        <ul className="pc-exercises">
                          {s.exercises.map((ex, j) => (
                            <li key={j}>
                              <span>{ex.name}</span>
                              <small>
                                {ex.sets}×{ex.reps}{ex.rest ? ` · ${ex.rest}s` : ''}
                              </small>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {s.notes ? <p className="pc-notes">{s.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="pc-rest">Descanso</p>
                )}
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
          <div className="pc-prog-grid">
            <div className="pc-prog-item">
              <span>Peso actual</span>
              <b>{lastW} kg</b>
              {delta != null ? <small className={delta <= 0 ? 'down' : 'up'}>{delta > 0 ? '+' : ''}{delta} kg</small> : null}
            </div>
            {lastM?.waist != null ? <div className="pc-prog-item"><span>Cintura</span><b>{lastM.waist} cm</b></div> : null}
            {lastM?.fat != null ? <div className="pc-prog-item"><span>Grasa</span><b>{lastM.fat}%</b></div> : null}
            <div className="pc-prog-item"><span>Mediciones</span><b>{measures.length}</b></div>
          </div>
        </section>
      ) : null}

      {wa ? (
        <a className="pc-contact" href={wa} target="_blank" rel="noopener noreferrer">
          <Icon name="whatsapp" /> Contactar a mi entrenador
        </a>
      ) : null}

      <footer className="pc-foot">
        <span className="pc-brand">PROFALLO</span>
        <span>profallo.vercel.app</span>
      </footer>
    </div>
  )
}
