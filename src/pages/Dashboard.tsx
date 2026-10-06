import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead } from '../components/ui'
import { WeekStrip } from '../components/WeekStrip'
import { Agenda } from '../components/Agenda'
import { Verified } from '../components/Layout'
import { ReviewsSection } from '../components/Reviews'
import { MOTIVATIONAL_MAIN, MOTIVATIONAL_SUB, randomFrom } from '../lib/phrases'
import {
  clientPhotos,
  findClient,
  initials,
  longDate,
  month,
  TODAY,
} from '../lib/utils'

const ACCENTS: Array<{ id: 'lime' | 'cyan' | 'amber'; color: string; label: string }> = [
  { id: 'lime', color: '#d2ff62', label: 'Lima' },
  { id: 'cyan', color: '#5ff2e0', label: 'Cian' },
  { id: 'amber', color: '#ffb454', label: 'Ámbar' },
]

export function CoachStage({ full = false }: { full?: boolean }) {
  const { data, stats, go } = useApp()
  const totalSessions = data.sessions.filter((s) => s.status !== 'Cancelada').length
  // Nueva frase motivacional en cada entrada (montaje de la portada).
  const phrase = useMemo(
    () => ({ main: randomFrom(MOTIVATIONAL_MAIN), sub: randomFrom(MOTIVATIONAL_SUB) }),
    [],
  )
  return (
    <section className={`coach-stage ${full ? 'full-profile' : ''}`}>
      <img
        className="coach-photo"
        src={data.profile.photo || (full ? 'assets/coach.png' : 'assets/trainer-hero-v2.png')}
        alt={full ? 'Foto del entrenador' : 'Entrenador en un gimnasio'}
      />
      <div className="coach-scrim" />
      <div className="stage-top">
        <span className="micro-label">PERSONAL TRAINER / TU ESPACIO</span>
      </div>
      <div className="stage-title">
        <span className="eyebrow">UN EQUIPO. MUCHAS HISTORIAS.</span>
        <h2>{phrase.main}</h2>
        <p>{phrase.sub}</p>
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
        <strong>{totalSessions}</strong>
        <span>Sesiones</span>
      </button>
      <div className="stage-caption">
        <i /> COACH BETTER. EVERY DAY.
      </div>
    </section>
  )
}

export function Dashboard() {
  const { data, stats, money, go, ui, commit, toast } = useApp()
  const actions = useActions()
  const active = data.clients.filter((c) => !c.archived)
  const [editingLink, setEditingLink] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [bioDraft, setBioDraft] = useState(data.profile.bio ?? '')
  const monthlySessions = data.sessions.filter((s) => month(s.date) === month(TODAY) && s.status !== 'Cancelada').length
  const publicUrl = `${location.origin}/${data.profile.username || ''}`
  const next = data.sessions
    .filter((x) => x.date >= TODAY && x.status === 'Programada')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  const nextClient = next ? findClient(data, next.client) : null

  // Auto-deslizamiento lento de la fila de clientes (derecha a izquierda).
  const mosaicRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  useEffect(() => {
    const el = mosaicRef.current
    if (!el) return
    let raf = 0
    const step = () => {
      if (!pausedRef.current && el.scrollWidth > el.clientWidth + 4) {
        el.scrollLeft += 0.3
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) el.scrollLeft = 0
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    const pause = () => { pausedRef.current = true }
    const resume = () => { pausedRef.current = false }
    el.addEventListener('pointerdown', pause)
    el.addEventListener('pointerup', resume)
    el.addEventListener('pointercancel', resume)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('pointerup', resume)
      el.removeEventListener('pointercancel', resume)
    }
  }, [])

  async function shareProfile() {
    if (!data.profile.username) {
      toast('Primero pon tu usuario en "Editar link".')
      setEditingLink(true)
      return
    }
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share) {
      try { await nav.share({ title: data.profile.name, text: 'Mira mi perfil de entrenador', url: publicUrl }); return } catch { /* cancelado */ }
    }
    try { await navigator.clipboard.writeText(publicUrl); toast('Link copiado: ' + publicUrl) } catch { toast(publicUrl) }
  }

  function saveUsername(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const raw = String(new FormData(e.currentTarget).get('username') ?? '')
    const username = raw.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()
    commit((d) => { d.profile.username = username })
    setEditingLink(false)
    toast(username ? 'Link actualizado.' : 'Link quitado.')
  }

  function saveBio() {
    commit((d) => { d.profile.bio = bioDraft.trim() })
    toast('Descripción guardada.')
  }

  function setAccent(id: 'lime' | 'cyan' | 'amber') {
    commit((d) => { d.profile.accent = id })
    toast('Color de tu ficha actualizado.')
  }

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
      </div>

      <section className={`share-profile ${shareOpen ? 'open' : ''}`}>
        <button className="share-toggle" type="button" onClick={() => setShareOpen((v) => !v)} aria-expanded={shareOpen}>
          <span className="share-toggle-ic"><Icon name="share" /></span>
          <span className="share-toggle-txt"><b>Comparte tu perfil</b><small>Tu ficha pública para tus clientes</small></span>
          <span className="share-toggle-chev"><Icon name={shareOpen ? 'chevronUp' : 'chevronDown'} /></span>
        </button>
        {shareOpen ? (
          <div className="share-body">
            <div className="share-link">
              <span className="share-url">profallo.vercel.app/<b>{data.profile.username || 'tunombre'}</b></span>
              <button className="button light" onClick={() => setEditingLink((v) => !v)}><Icon name="edit" /> Editar link</button>
            </div>
            {editingLink ? (
              <form className="share-edit" onSubmit={saveUsername}>
                <span className="share-edit-prefix">profallo.vercel.app/</span>
                <input name="username" defaultValue={data.profile.username} placeholder="tu-usuario" maxLength={30} />
                <button className="button primary" type="submit"><Icon name="check" /> Guardar</button>
              </form>
            ) : null}
            <div className="share-bio">
              <span className="eyebrow">DESCRIPCIÓN DE TU FICHA</span>
              <textarea value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} maxLength={240} placeholder="Una pequeña descripción para tus clientes" />
              <button className="button light" type="button" onClick={saveBio}><Icon name="check" /> Guardar descripción</button>
            </div>
            <div className="accent-picker">
              <span>Color de tu ficha:</span>
              <div className="accent-swatches">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    title={a.label}
                    aria-label={`Color ${a.label}`}
                    className={`accent-swatch ${(data.profile.accent ?? 'lime') === a.id ? 'active' : ''}`}
                    style={{ background: a.color }}
                    onClick={() => setAccent(a.id)}
                  />
                ))}
              </div>
            </div>
            <div className="share-preview">
              <span className="share-preview-photo">{data.profile.photo ? <img src={data.profile.photo} alt={data.profile.name} /> : <Icon name="user" />}</span>
              <div className="share-preview-id">
                <span className="share-preview-role">{data.profile.specialty || 'Entrenador personal'}</span>
                <b>{data.profile.name}{data.profile.verified ? <Verified /> : null}</b>
              </div>
              <div className="share-preview-stats">
                <span><b>{data.routines.length}</b> rutinas</span>
                <span><b>{stats.active}</b> clientes</span>
                <span><b>{monthlySessions}</b> sesiones/mes</span>
              </div>
              <button
                className="button share-preview-join"
                disabled={!data.profile.phone}
                onClick={() => data.profile.phone && window.open(`https://wa.me/${data.profile.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${data.profile.name}, quiero unirme a tu equipo 💪`)}`, '_blank', 'noopener')}
              >
                <Icon name="whatsapp" /> Únete a mi equipo
              </button>
            </div>
            <button className="button primary share-cta" onClick={shareProfile}>
              <Icon name="share" /> Compartir perfil
            </button>
            <ReviewsSection />
          </div>
        ) : null}
      </section>

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
          <div className="team-mosaic" ref={mosaicRef}>
            {active
              .map((c) => ({ c, photo: c.photo || clientPhotos[c.id] }))
              .filter((x) => x.photo)
              .concat(active.map((c) => ({ c, photo: c.photo || clientPhotos[c.id] })).filter((x) => !x.photo))
              .slice(0, 12)
              .map(({ c, photo }) => (
                <button
                  key={c.id}
                  className={`team-tile ${photo ? 'photo-tile' : ''}`}
                  onClick={() => actions.clientDetail(c.id)}
                  aria-label={`Abrir perfil de ${c.name}`}
                >
                  {photo ? (
                    <img src={photo} alt={c.name} />
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

      <div className="focus-stack focus-bottom">
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
              <button className="button dark focus-cta" onClick={() => actions.editSession(next.id)}>
                Ver sesión <Icon name="up" />
              </button>
            </>
          ) : (
            <>
              <p className="subtle">Elige cuándo empieza el próximo reto.</p>
              <button className="button dark focus-cta" onClick={() => actions.newSession()}>
                Programar <Icon name="plus" />
              </button>
            </>
          )}
        </section>
        <section className="focus-card lime">
          <div className="card-head">
            <span className="eyebrow">TUS COBROS</span>
            <button className="icon-button" onClick={() => go('pagos')} aria-label="Ver pagos">
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
