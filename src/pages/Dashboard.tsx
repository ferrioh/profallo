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
        src={full ? (data.profile.photo || 'assets/coach.png') : 'assets/trainer-hero-v2.png'}
        alt={full ? 'Foto del entrenador' : 'Entrenador en un gimnasio'}
      />
      <div className="coach-scrim" />
      <div className="stage-top">
        <span className="micro-label">PERSONAL TRAINER / TU ESPACIO</span>
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
              El progreso empieza
              <br />
              contigo.
            </>
          )}
        </h2>
        <p>
          Cada sesión suma.
          <br />
          Cada persona importa.
        </p>
      </div>
      <div className="stage-identity" />
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

export function Dashboard() {
  const { data, stats, money, go, ui } = useApp()
  const actions = useActions()
  const active = data.clients.filter((c) => !c.archived)
  const next = data.sessions
    .filter((x) => x.date >= TODAY && x.status === 'Programada')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  const nextClient = next ? findClient(data, next.client) : null

  return (
    <div className="dashboard-home">
      <PageHead
        k="BUEN DÍA / VAMOS POR MÁS."
        title={
          <>
            {data.profile.name}
            {data.profile.verified ? <Verified /> : null}
          </>
        }
        sub={
          <>
            {longDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
            · Lo importante, primero.
          </>
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

      <div className="home-overview" aria-label="Resumen del día">
        <div><span>Clientes activos</span><strong>{stats.active}</strong><small>Personas en tu equipo</small></div>
        <div><span>Sesiones hoy</span><strong>{stats.todaySessions.length}</strong><small>En el calendario</small></div>
        <div><span>Rutinas</span><strong>{data.routines.length}</strong><small>Planes disponibles</small></div>
      </div>

      <div className="modern-grid">
        <section className="team-block">
          <div className="section-heading">
            <h2>Clientes</h2>
            <button onClick={() => go('clientes')}>Ver todos ↗</button>
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
                  aria-label={`Abrir perfil de ${c.name}`}
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
            <h2>Agenda de la semana</h2>
            <button onClick={() => go('calendario')}>Abrir calendario ↗</button>
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
              onOpen={(kind, id) => {
                if (kind === 'payment') actions.editPayment(id)
                else actions.focusSession(id)
              }}
            />
          </div>
        </section>
      </div>
      <footer className="profile-social">
        <div className="profile-social-icons">
          <a className="social-icon" href={data.profile.instagram || '#'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" onClick={(e) => { if (!data.profile.instagram) e.preventDefault() }}>
            <Icon name="instagram" />
          </a>
          <a className="social-icon" href={data.profile.tiktok || '#'} target="_blank" rel="noopener noreferrer" aria-label="TikTok" onClick={(e) => { if (!data.profile.tiktok) e.preventDefault() }}>
            <Icon name="tiktok" />
          </a>
        </div>
        <p className="profile-copyright">© Profallo by Ferrioh 2026</p>
      </footer>
    </div>
  )
}
