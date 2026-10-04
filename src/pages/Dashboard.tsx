import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead } from '../components/ui'
import { WeekStrip } from '../components/WeekStrip'
import { Agenda } from '../components/Agenda'
import { Verified } from '../components/Layout'
import {
  clientPhotos,
  findClient,
  initials,
  longDate,
  TODAY,
} from '../lib/utils'

export function CoachStage({ full = false }: { full?: boolean }) {
  const { data, stats, go } = useApp()
  return (
    <section className={`coach-stage ${full ? 'full-profile' : ''}`}>
      <img
        className="coach-photo"
        src="assets/coach.png"
        alt="Entrenador levantando una barra, foto de perfil proporcionada"
      />
      <div className="coach-scrim" />
      <div className="stage-top">
        <span className="micro-label">PERSONAL TRAINER / TU ESPACIO</span>
        <button
          className="button glass-button"
          onClick={() => go(full ? 'ajustes' : 'perfil')}
        >
          {full ? 'Editar perfil' : 'Mi perfil'} <Icon name="up" />
        </button>
      </div>
      <div className="stage-title">
        <span className="eyebrow">UN EQUIPO. MUCHAS HISTORIAS.</span>
        <h2>
          {full ? (
            <>
              Tu forma de entrenar.
              <br />
              Tu forma de inspirar.
            </>
          ) : (
            <>
              Tu equipo empieza
              <br />
              contigo.
            </>
          )}
        </h2>
        <p>
          Todo lo esencial, cerca.
          <br />
          El resto, a tu ritmo.
        </p>
      </div>
      <div className="stage-identity">
        <div className="coach-name">
          {data.profile.name} <Verified />
        </div>
        <p>
          {data.profile.specialty || 'Entrenamiento personal'}{' '}
          <span>PROTRAINER CLUB</span>
        </p>
      </div>
      <button className="stage-orbit orbit-a glass-button" onClick={() => go('clientes')}>
        <span className="orbit-icon">
          <Icon name="users" />
        </span>
        <strong>{stats.active}</strong>
        <span>Tu equipo</span>
      </button>
      <button
        className="stage-orbit orbit-b glass-button"
        onClick={() => go('calendario')}
      >
        <span className="orbit-icon">
          <Icon name="calendar" />
        </span>
        <strong>{stats.todaySessions.length}</strong>
        <span>Sesiones hoy</span>
      </button>
      <div className="stage-caption">
        <i /> COACH BETTER. EVERY DAY.
      </div>
    </section>
  )
}

export function QuickActions() {
  const { openModal, toast, data } = useApp()
  const active = data.clients.filter((c) => !c.archived)
  const guard = (msg: string, run: () => void) => {
    if (!active.length) {
      toast(msg)
      return
    }
    run()
  }
  return (
    <div className="quick-actions">
      <button
        className="quick-action"
        onClick={() =>
          guard('Añade un cliente antes de programar sesiones.', () =>
            openModal({ kind: 'session-form' }),
          )
        }
      >
        <span>
          <Icon name="calendar" />
        </span>
        <div>
          <b>Agendar sesión</b>
          <small>Lo próximo, en segundos</small>
        </div>
        <Icon name="plus" />
      </button>
      <button
        className="quick-action"
        onClick={() => openModal({ kind: 'client-form' })}
      >
        <span>
          <Icon name="users" />
        </span>
        <div>
          <b>Añadir cliente</b>
          <small>Una nueva historia</small>
        </div>
        <Icon name="plus" />
      </button>
      <button
        className="quick-action"
        onClick={() => openModal({ kind: 'routine-form' })}
      >
        <span>
          <Icon name="dumbbell" />
        </span>
        <div>
          <b>Crear rutina</b>
          <small>Diseña su siguiente reto</small>
        </div>
        <Icon name="plus" />
      </button>
    </div>
  )
}

export function TeamFaces() {
  const { data } = useApp()
  const active = data.clients.filter((c) => !c.archived)
  return (
    <div className="face-stack">
      {active.slice(0, 5).map((c) => (
        <Avatar key={c.id} client={c} />
      ))}
    </div>
  )
}

export function Dashboard() {
  const { data, stats, money, go, ui } = useApp()
  const actions = useActions()
  const active = data.clients.filter((c) => !c.archived)
  const next = data.sessions
    .filter((x) => x.date >= TODAY && x.status === 'Programada')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  const nextClient = next ? findClient(data, next.client) : null

  return (
    <>
      <PageHead
        k="BUEN DÍA / VAMOS POR MÁS."
        title={
          <>
            Tu próximo nivel<span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub={
          <>
            {longDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
            · Lo importante, primero.
          </>
        }
        actions={
          <button className="button glass-button" onClick={() => actions.newSession()}>
            <Icon name="arrow" />
            Nueva sesión
          </button>
        }
      />

      <div className="overview-stage">
        <CoachStage />
        <div className="focus-stack">
          <section className="focus-card white">
            <div className="card-head">
              <span className="eyebrow">TU PRÓXIMA SESIÓN</span>
              <span className="pill green">
                {next ? 'EN AGENDA' : 'ESPACIO LIBRE'}
              </span>
            </div>
            <div className="focus-time">
              {next ? next.time : '—'}
              <span>{next ? 'h' : 'Tu momento'}</span>
            </div>
            {next && nextClient ? (
              <>
                <div className="session-person">
                  <Avatar client={nextClient} />
                  <div>
                    <b>{nextClient.name}</b>
                    <p>{next.title}</p>
                  </div>
                </div>
                <button
                  className="button dark focus-cta"
                  onClick={() => actions.editSession(next.id)}
                >
                  Ver sesión <Icon name="up" />
                </button>
              </>
            ) : (
              <>
                <p className="subtle">Elige cuándo empieza el próximo reto.</p>
                <button
                  className="button dark focus-cta"
                  onClick={() => actions.newSession()}
                >
                  Programar <Icon name="plus" />
                </button>
              </>
            )}
          </section>
          <section className="focus-card lime">
            <div className="card-head">
              <span className="eyebrow">TUS COBROS</span>
              <button
                className="icon-button"
                onClick={() => go('pagos')}
                aria-label="Ver pagos"
              >
                <Icon name="up" />
              </button>
            </div>
            <div className="focus-money">{money(stats.monthIncome)}</div>
            <div className="money-meta">
              <span>recibidos este mes</span>
              <b>{stats.late} vencidos</b>
            </div>
            <button className="focus-link" onClick={() => actions.newPayment()}>
              Registrar un cobro <Icon name="plus" />
            </button>
          </section>
        </div>
      </div>

      <QuickActions />

      <div className="modern-grid">
        <section className="team-block">
          <div className="section-heading">
            <h2>Personas. No números.</h2>
            <button onClick={() => go('clientes')}>Tu equipo ↗</button>
          </div>
          <div className="team-mosaic">
            {active
              .filter((c) => clientPhotos[c.id])
              .concat(active.filter((c) => !clientPhotos[c.id]))
              .slice(0, 3)
              .map((c) => (
                <button
                  key={c.id}
                  className={`team-tile ${clientPhotos[c.id] ? 'photo-tile' : ''}`}
                  onClick={() => actions.clientDetail(c.id)}
                  aria-label={`Abrir ficha de ${c.name}`}
                >
                  {clientPhotos[c.id] ? (
                    <img src={clientPhotos[c.id]} alt={c.name} />
                  ) : (
                    <div className="tile-initials">{initials(c.name)}</div>
                  )}
                  <div className="team-shade" />
                  <span className="team-tag">{c.plan}</span>
                  <div className="tile-caption">
                    <b>{c.name}</b>
                    <small>{c.goal}</small>
                  </div>
                  <span className="tile-open">
                    <Icon name="up" />
                  </span>
                </button>
              )) || (
              <div className="card empty-state">Añade tu primer cliente.</div>
            )}
          </div>
        </section>
        <section className="agenda-modern">
          <div className="section-heading">
            <h2>Tu semana, sin ruido.</h2>
            <button onClick={() => go('calendario')}>Ver todo ↗</button>
          </div>
          <div className="card white">
            <WeekStrip
              selected={ui.calendarDate}
              data={data}
              onSelect={actions.selectDay}
            />
            <div className="calendar-subhead">
              <span>
                {ui.calendarDate === TODAY
                  ? 'HOY'
                  : longDate(ui.calendarDate).toUpperCase()}
              </span>
              <span>SESIONES & PAGOS</span>
            </div>
            <Agenda
              day={ui.calendarDate}
              data={data}
              money={money}
              limit={3}
              onOpen={(kind, id) =>
                kind === 'payment'
                  ? actions.editPayment(id)
                  : actions.editSession(id)
              }
            />
          </div>
        </section>
      </div>

      <section className="routine-peek">
        <div>
          <span className="eyebrow">DISEÑA EL PRÓXIMO RETO</span>
          <h2>
            Rutinas que se adaptan.
            <br />
            Personas que avanzan.
          </h2>
          <div className="peek-people">
            <TeamFaces />
            <small>{stats.active} historias en movimiento</small>
          </div>
        </div>
        <div className="peek-routines">
          {data.routines.slice(0, 2).map((r, i) => (
            <button
              key={r.id}
              className={`peek-routine ${i ? '' : 'lime'}`}
              onClick={() => actions.editRoutine(r.id)}
            >
              <span>{r.category}</span>
              <b>{r.name}</b>
              <small>
                {r.exercises.length} ejercicios · {r.duration} min
              </small>
              <Icon name="up" />
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
