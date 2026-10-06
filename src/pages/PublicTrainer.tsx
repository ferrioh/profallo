import { useEffect, useState, type CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import { cloudPublicProfile, type PublicTrainer as PublicTrainerData } from '../lib/cloud'
import { socialHandle, socialUrl } from '../lib/social'

const ACCENT: Record<string, string> = {
  lime: '#d2ff62',
  cyan: '#5ff2e0',
  amber: '#ffb454',
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/** Mide la eficiencia de entrenamiento (porcentaje) y la anima al entrar. */
function EfficiencyMeter({ value }: { value: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const dur = 1500
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <div className="pt-metric">
      <div className="pt-metric-head">
        <span>Eficiencia de entrenamiento</span>
        <b>{n}%</b>
      </div>
      <div className="pt-metric-track">
        <i style={{ width: `${n}%` }} />
      </div>
      <small>En crecimiento constante</small>
    </div>
  )
}

export function PublicTrainer({ username }: { username: string }) {
  const [t, setT] = useState<PublicTrainerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    cloudPublicProfile(username)
      .then((x) => { setT(x); setLoading(false) })
      .catch(() => setLoading(false))
  }, [username])

  const photos = [t?.photo, ...(t?.photos ?? [])].filter(Boolean) as string[]
  useEffect(() => {
    if (photos.length < 2) return
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % photos.length), 6000)
    return () => window.clearInterval(timer)
  }, [photos.length])

  if (loading) {
    return (
      <div className="entry-loader" aria-hidden="true">
        <span className="entry-loader-logo">p</span>
        <span className="entry-loader-line" />
      </div>
    )
  }

  if (!t) {
    return (
      <div className="public-trainer">
        <div className="pt-card pt-glass">
          <h1>Entrenador no encontrado</h1>
          <p className="muted">El enlace <b>@{username}</b> no existe o no está disponible.</p>
        </div>
      </div>
    )
  }

  const accent = ACCENT[t.accent] ?? ACCENT.lime
  const efficiency = Math.round(clamp(58 + t.clients * 3 + t.routines * 1.2 + t.sessionsMonth * 0.8, 55, 98))
  const wa = t.phone
    ? `https://wa.me/${t.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${t.name}, quiero unirme a tu equipo 💪`)}`
    : ''
  const insta = socialUrl('instagram', t.instagram)
  const tiktok = socialUrl('tiktok', t.tiktok)

  return (
    <div className="public-trainer" style={{ '--pt-accent': accent } as CSSProperties}>
      {photos.length ? (
        <div className="pt-bg" aria-hidden="true">
          {photos.map((src, i) => (
            <div key={i} className={`pt-bg-slide ${i === slide ? 'active' : ''}`} style={{ backgroundImage: `url(${src})` }} />
          ))}
          <div className="pt-bg-shade" />
        </div>
      ) : null}

      <div className="pt-card pt-glass">
        <div className="pt-photo">{t.photo ? <img src={t.photo} alt={t.name} /> : <Icon name="user" />}</div>
        <span className="pt-role">{t.specialty || 'Entrenador personal'}</span>
        <h1>
          {t.name}
          {t.verified ? <span className="verified" title="Entrenador verificado"><Icon name="check" /></span> : null}
        </h1>
        {t.bio ? <p className="pt-bio">{t.bio}</p> : null}

        <div className="pt-stats pt-glass-block">
          <div><b>{t.routines}</b><span>Rutinas</span></div>
          <div><b>{t.clients}</b><span>Clientes</span></div>
          <div><b>{t.sessionsMonth}</b><span>Sesiones/mes</span></div>
        </div>

        <EfficiencyMeter value={efficiency} />

        {insta || tiktok ? (
          <div className="pt-social">
            {insta ? (
              <a className="pt-social-link" href={insta} target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" /> {socialHandle(t.instagram)}
              </a>
            ) : null}
            {tiktok ? (
              <a className="pt-social-link" href={tiktok} target="_blank" rel="noopener noreferrer">
                <Icon name="tiktok" /> {socialHandle(t.tiktok)}
              </a>
            ) : null}
          </div>
        ) : null}

        <button className="pt-join" type="button" disabled={!wa} onClick={() => wa && window.open(wa, '_blank', 'noopener')}>
          <Icon name="whatsapp" /> Únete a mi equipo
        </button>

        <footer className="pt-foot">
          <span className="pt-brand">PROFALLO</span>
          <span>profallo.vercel.app</span>
        </footer>
      </div>
    </div>
  )
}
