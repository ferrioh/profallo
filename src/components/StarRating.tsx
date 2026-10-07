import type { CSSProperties } from 'react'

/** Estrellas de reseña animadas (estilo Peak Rating): 5 estrellas con relleno parcial. */
export function StarRating({ value, max = 10, size = 14 }: { value: number; max?: number; size?: number }) {
  const stars = 5
  const filled = Math.max(0, Math.min(stars, (value / max) * stars))
  return (
    <span className="star-rating" style={{ fontSize: size }} aria-label={`${value} de ${max}`}>
      {Array.from({ length: stars }, (_, i) => {
        const fill = Math.max(0, Math.min(1, filled - i))
        return (
          <span key={i} className="sr-star" style={{ '--fill': `${fill * 100}%`, animationDelay: `${i * 55}ms` } as CSSProperties}>
            ★
          </span>
        )
      })}
    </span>
  )
}
