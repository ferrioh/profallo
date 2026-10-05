import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { cloudPublicProfile, type PublicTrainer as PublicTrainerData } from '../lib/cloud'

export function PublicTrainer({ username }: { username: string }) {
  const [t, setT] = useState<PublicTrainerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    cloudPublicProfile(username)
      .then((x) => { setT(x); setLoading(false) })
      .catch(() => setLoading(false))
  }, [username])

  const photos = t?.photos ?? []
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

  const wa = t.phone
    ? `https://wa.me/${t.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${t.name}, quiero unirme a tu equipo 💪`)}`
    : ''

  return (
    <div className="public-trainer">
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
        {t.gym ? <span className="pt-gym"><Icon name="dumbbell" /> {t.gym}</span> : null}

        <div className="pt-stats">
          <div><b>{t.routines}</b><span>Rutinas</span></div>
          <div><b>{t.clients}</b><span>Clientes</span></div>
          <div><b>{t.sessionsMonth}</b><span>Sesiones/mes</span></div>
        </div>

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
