import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead } from '../components/ui'

export function RoutinesPage() {
  const { data } = useApp()
  const actions = useActions()
  const [openId, setOpenId] = useState<string | null>(null)
  const active = data.clients.filter((c) => !c.archived)

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
        actions={
          <button className="button primary" onClick={actions.newRoutine}>
            <Icon name="plus" />
            Crear rutina
          </button>
        }
      />
      <div className="routine-workspace">
        <section className="routine-deck">
          {data.routines.map((r, i) => {
            const assigned = active.filter((c) => c.routine === r.id)
            const total = r.exercises.reduce((n, e) => n + Number(e.sets), 0)
            const open = openId === r.id
            return (
              <article
                className={`routine-panel ${
                  i % 3 === 0 ? 'accent' : i % 3 === 1 ? 'white' : 'smoke'
                }`}
                data-routine={r.id}
                key={r.id}
              >
                <button
                  className="routine-toggle"
                  onClick={() => setOpenId(open ? null : r.id)}
                  aria-expanded={open}
                  aria-controls={`routine-body-${r.id}`}
                >
                  <span className="routine-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
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
                    <small>
                      {assigned.length}{' '}
                      {assigned.length === 1 ? 'cliente' : 'clientes'}
                    </small>
                  </div>
                  <span className="routine-expand">
                    <Icon name="plus" />
                  </span>
                </button>
                <div
                  className="routine-drawer"
                  id={`routine-body-${r.id}`}
                  hidden={!open}
                >
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
                  {r.notes ? <p className="routine-note">{r.notes}</p> : null}
                  <div className="routine-panel-actions">
                    <button
                      className="button dark"
                      onClick={() => actions.editRoutine(r.id)}
                    >
                      Editar plan <Icon name="edit" />
                    </button>
                    <button
                      className={`button ${i % 3 === 0 ? 'light' : 'primary'}`}
                      onClick={() => actions.assignRoutine(r.id)}
                    >
                      Asignar a cliente <Icon name="up" />
                    </button>
                  </div>
                </div>
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
