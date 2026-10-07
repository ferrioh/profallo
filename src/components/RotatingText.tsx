import { useEffect, useState } from 'react'

/** Texto que rota por frases con una animación de entrada tipo "BlurText" (React Bits).
 *  Cada cambio revela palabra por palabra con desenfoque + desplazamiento escalonado. */
export function RotatingText({ phrases, interval = 20000 }: { phrases: string[]; interval?: number }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (phrases.length <= 1) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % phrases.length), interval)
    return () => window.clearInterval(timer)
  }, [phrases.length, interval])
  const phrase = phrases[index] ?? ''
  return (
    <span className="rotating-text" key={index} aria-live="polite">
      {phrase.split(' ').map((word, i) => (
        <span className="rt-word" key={`${index}-${i}`} style={{ animationDelay: `${i * 0.075}s` }}>
          {word}{'\u00a0'}
        </span>
      ))}
    </span>
  )
}
