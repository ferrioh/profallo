import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { cloudPublicProfile, type PublicTrainer as PublicTrainerData } from '../lib/cloud'

export function PublicTrainer({ username }: { username: string }) {
  const [t, setT] = useState<PublicTrainerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cloudPublicProfile(username)
      .then((x) => { setT(x); setLoading(false) })
      .catch(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <div className="public-trainer"><div className="pt-card"><span className="verify-spinner" /></div></div>
    )
  }

  if (!t) {
    return (
      <div className="public-trainer">
        <div className="pt-card">
          <h1>Entrenador no encontrado</h1>
          <p className="muted">El enlace <b>@{username}</b> no existe o no está disponible.</p>
        </div>
      </div>
    )
  }

  const wa = t.phone
    ? `https://wa.me/${t.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${t.name}, quiero unirme a tu equipo 💪`)}`
    : ''
  const ig = t.instagram
    ? t.instagram.startsWith('http') ? t.instagram : `https://instagram.com/${t.instagram.replace(/^@/, '')}`
    : ''

  return (
    <div className="public-trainer">
      <div className="pt-card">
        <div className="pt-photo">{t.photo ? <img src={t.photo} alt={t.name} /> : <Icon name="user" />}</div>
        <span className="pt-role">{t.specialty || 'Entrenador personal'}</span>
        <h1>{t.name}</h1>
        {t.bio ? <p className="pt-bio">{t.bio}</p> : null}
        {t.gym ? <span className="pt-gym"><Icon name="dumbbell" /> {t.gym}</span> : null}
        <div className="pt-stats">
          <div><b>{t.routines}</b><span>Rutinas</span></div>
          <div><b>{t.clients}</b><span>Clientes</span></div>
          <div><b>{t.sessionsMonth}</b><span>Sesiones/mes</span></div>
        </div>
        <button className="button primary pt-join" type="button" disabled={!wa} onClick={() => wa && window.open(wa, '_blank', 'noopener')}>
          <Icon name="whatsapp" /> Únete a mi equipo
        </button>
        <div className="pt-contact">
          {wa ? <a href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /> WhatsApp</a> : null}
          {ig ? <a href={ig} target="_blank" rel="noopener noreferrer"><Icon name="instagram" /> Instagram</a> : null}
          {t.email ? <a href={`mailto:${t.email}`}><Icon name="arrow" /> {t.email}</a> : null}
        </div>
        <footer className="pt-foot">Profallo · @{t.username || username}</footer>
      </div>
    </div>
  )
}
