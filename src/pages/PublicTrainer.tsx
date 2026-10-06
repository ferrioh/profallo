import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '../components/Icon'
import { cloudPublicProfile, type PublicReview, type PublicTrainer as PublicTrainerData } from '../lib/cloud'
import { socialHandle, socialUrl } from '../lib/social'

const ACCENT: Record<string, string> = {
  lime: '#d2ff62',
  cyan: '#5ff2e0',
  amber: '#ffb454',
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/** Color según la nota: 1 = oscuro, 10 = amarillo. */
function ratingColor(r: number): string {
  const t = clamp((r - 1) / 9, 0, 1)
  const hue = 28 + t * 32
  const light = 26 + t * 46
  return `hsl(${hue}, 90%, ${light}%)`
}

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

function ReviewCarousel({ reviews }: { reviews: PublicReview[] }) {
  const [page, setPage] = useState(0)
  const startX = useRef<number | null>(null)
  const total = Math.max(1, Math.ceil(reviews.length / 3))
  const current = reviews.slice(page * 3, page * 3 + 3)

  function down(e: ReactPointerEvent<HTMLDivElement>) { startX.current = e.clientX }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (startX.current == null) return
    const dx = e.clientX - startX.current
    startX.current = null
    if (dx < -42) setPage((p) => Math.min(total - 1, p + 1))
    else if (dx > 42) setPage((p) => Math.max(0, p - 1))
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  return (
    <div className="pt-reviews">
      <div className="pt-reviews-head">
        <span>Reseñas de clientes</span>
        <span className="pt-reviews-avg" style={{ color: ratingColor(avg), borderColor: ratingColor(avg) }}>
          {avg.toFixed(1)}<small>/10</small>
        </span>
      </div>
      <div className="pt-reviews-viewport" onPointerDown={down} onPointerUp={up}>
        {current.map((r) => (
          <div key={r.id} className="pt-review">
            <div className="pt-review-top">
              <span className="pt-review-photo">{r.clientPhoto ? <img src={r.clientPhoto} alt={r.clientName ?? ''} /> : <Icon name="user" />}</span>
              <b>{r.clientName || 'Cliente'}</b>
              <span className="pt-review-note" style={{ color: ratingColor(r.rating) }}>{r.rating}</span>
            </div>
            {r.text ? <p>{r.text}</p> : null}
          </div>
        ))}
      </div>
      {total > 1 ? (
        <div className="pt-reviews-dots">
          {Array.from({ length: total }, (_, i) => (
            <button key={i} type="button" className={i === page ? 'active' : ''} aria-label={`Página ${i + 1}`} onClick={() => setPage(i)} />
          ))}
        </div>
      ) : null}
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
        <span className="entry-loader-word">profallo</span>
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
  const efficiency = 100
  const reviews = t.reviews ?? []
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

        {reviews.length ? <ReviewCarousel reviews={reviews} /> : null}

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
          <span className="pt-brand"><span className="brand-mark pt-brand-mark">p</span>PROFALLO</span>
          <span>profallo.vercel.app</span>
        </footer>
      </div>
    </div>
  )
}
