import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead } from '../components/ui'
import { MuscleGuide, getRoutineZones } from '../components/MuscleGuide'

export function RoutinesPage() {
  const { data, commit, toast } = useApp()
  const actions = useActions()
  const [openId, setOpenId] = useState<string | null>(null)
  const active = data.clients.filter((c) => !c.archived)

  function deleteRoutine(id: string, name: string) {
    if (!window.confirm(`¿Eliminar la rutina "${name}"? Se quitará de los clientes y sesiones que la tengan.`)) return
    commit((d) => {
      d.routines = d.routines.filter((x) => x.id !== id)
      d.clients.forEach((c) => { if (c.routine === id) c.routine = '' })
      d.sessions.forEach((s) => { if (s.routine === id) s.routine = '' })
      d.deleted = [...new Set([...(d.deleted ?? []), id])]
    })
    setOpenId((prev) => (prev === id ? null : prev))
    toast('Rutina eliminada.')
  }

  return (
    <>
      <PageHead
        k="DISEÑAR ES MÁS SIMPLE CUANDO TODO ENCAJA."
        title={
          <>
            Cada rutina, un nuevo reto
            <span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Abre un plan, ajusta sus ejercicios y asígnalo. Sin perderte entre listas."
      />
      <div className="routine-create">
        <button className="routine-create-btn" onClick={actions.newRoutine} aria-label="Crear rutina">
          <Icon name="plus" />
        </button>
        <span>Crear rutina</span>
      </div>
      <div className="routine-overview" aria-label="Resumen de rutinas">
        <div className="routine-overview-card"><span>Planes creados</span><strong>{data.routines.length}</strong><small>Listos para editar</small></div>
        <div className="routine-overview-card"><span>Clientes con rutina</span><strong>{active.filter(c => !!c.routine).length}<small> / {active.length}</small></strong><small>Con un plan asignado</small></div>
        <div className="routine-overview-card"><span>Ejercicios disponibles</span><strong>{data.routines.reduce((n,r) => n + r.exercises.length, 0)}</strong><small>En todos los planes</small></div>
      </div>
      <div className="routine-workspace">
        <section className="routine-deck">
          {data.routines.map((r, i) => {
            const assigned = active.filter((c) => c.routine === r.id)
            const total = r.exercises.reduce((n, e) => n + Number(e.sets), 0)
            const open = openId === r.id
            return (
              <article
                className={`routine-panel refreshed ${
                  i % 3 === 0 ? 'accent' : i % 3 === 1 ? 'white' : 'smoke'
                } ${open ? 'expanded' : ''}`}
                data-routine={r.id}
                key={r.id}
              >
                <button
                  className="routine-toggle"
                  onClick={() => setOpenId(open ? null : r.id)}
                  aria-expanded={open}
                  aria-controls={open ? `routine-body-${r.id}` : undefined}
                >
                  <span className="routine-number">{String(i + 1).padStart(2, '0')}</span>
                  <div className="routine-summary">
                    <span className="routine-category">
                      {r.category} / {r.level}
                    </span>
                    <h3>{r.name}</h3>
                    <div className="routine-chips">
                      <span>{r.duration} min</span>
                      <span>{r.exercises.length} ejercicios</span>
                      <span>{total} series</span>
                    </div>
                  </div>
                  <div className="routine-assignees">
                    {assigned.slice(0, 3).map((c) => (
                      <Avatar key={c.id} client={c} />
                    ))}
                    <small>{assigned.length} {assigned.length === 1 ? 'cliente' : 'clientes'}</small>
                  </div>
                  <span className="routine-expand">
                    <Icon name={open ? 'chevronUp' : 'chevronDown'} />
                  </span>
                </button>
                {open ? (
                  <>
                    <div className="routine-quick-actions">
                      <button onClick={() => actions.editRoutine(r.id)}><Icon name="edit" /> Editar rutina</button>
                      <button onClick={() => actions.assignRoutine(r.id)}><Icon name="users" /> Asignar</button>
                      <button className="danger-quiet" onClick={() => deleteRoutine(r.id, r.name)}><Icon name="trash" /> Eliminar</button>
                    </div>
                    <div className="routine-drawer" id={`routine-body-${r.id}`}>
                      <div className="routine-detail-layout">
                      <div className="exercise-cells">
                        {r.exercises.map((e, j) => (
                          <div className="exercise-cell" key={j}>
                            <span className="exercise-step">
                              {String(j + 1).padStart(2, '0')}
                            </span>
                            <div>
                              <b>{e.name}</b>
                              <span>
                                {e.sets} series × {e.reps}
                                {/\b(s|min)\b/.test(e.reps) ? '' : ' reps'}
                              </span>
                            </div>
                            <span className="exercise-rest">
                              {e.rest}s<small>descanso</small>
                            </span>
                          </div>
                        ))}
                      </div>
                      <MuscleGuide zones={getRoutineZones(r)} />
                      </div>
                      {r.notes ? <p className="routine-note">{r.notes}</p> : null}
                    </div>
                  </>
                ) : null}
              </article>
            )
          })}
          {!data.routines.length ? (
            <div className="card empty-state">Crea tu primer plan.</div>
          ) : null}
        </section>
        <aside className="routine-side">
          <div className="routine-side-card">
            <div className="equipment-art" aria-hidden="true">
              <div className="weight-disc d1" />
              <div className="weight-bar" />
              <div className="weight-disc d2" />
              <div className="weight-disc d3" />
            </div>
            <span className="eyebrow">PROGRAMAR CON INTENCIÓN</span>
            <h2>
              Más enfoque.
              <br />
              Menos pasos.
            </h2>
            <p>
              Una figura clara.
              <br />
              Un plan a su medida.
            </p>
            <button className="button glass-button" onClick={actions.newRoutine}>
              Diseñar rutina <Icon name="plus" />
            </button>
          </div>
          <div className="routine-count">
            <b>{data.routines.length}</b>
            <div>
              planes disponibles
              <small>Siempre editables</small>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
