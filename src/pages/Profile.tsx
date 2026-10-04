import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { CoachStage, QuickActions, TeamFaces } from './Dashboard'

export function ProfilePage() {
  const { data, stats, go } = useApp()
  const count = data.sessions.filter((x) => x.status === 'Completada').length

  return (
    <>
      <PageHead
        k="TU PERFIL / PROTRAINER CLUB."
        title={
          <>
            El entrenador, al centro
            <span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Tu identidad y lo que estás construyendo con tu equipo."
        actions={
          <button className="button glass-button" onClick={() => go('ajustes')}>
            <Icon name="arrow" />
            Editar perfil
          </button>
        }
      />
      <CoachStage full />
      <div className="profile-bottom">
        <section className="card white">
          <span className="eyebrow">TU IMPACTO</span>
          <div className="impact-numbers">
            <div>
              <b>{stats.active}</b>
              <span>clientes activos</span>
            </div>
            <div>
              <b>{count}</b>
              <span>sesiones completadas</span>
            </div>
            <div>
              <b>{data.routines.length}</b>
              <span>rutinas diseñadas</span>
            </div>
          </div>
        </section>
        <section className="card profile-team">
          <span className="eyebrow">PERSONAS QUE ENTRENAS</span>
          <TeamFaces />
          <p>
            Tu mejor carta de presentación
            <br />
            es un equipo que avanza.
          </p>
          <button className="button glass-button" onClick={() => go('clientes')}>
            Ver equipo <Icon name="up" />
          </button>
        </section>
      </div>
      <QuickActions />
    </>
  )
}
