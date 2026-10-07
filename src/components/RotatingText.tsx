import { useEffect, useState } from 'react'

/** Texto que rota por frases con un efecto "3D Letter Swap" (React Bits):
 *  al cambiar, cada letra gira en 3D (rotateX + blur) con retardo escalonado. */
export function RotatingText({ phrases, interval = 20000 }: { phrases: string[]; interval?: number }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (phrases.length <= 1) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % phrases.length), interval)
    return () => window.clearInterval(timer)
  }, [phrases.length, interval])
  const phrase = phrases[index] ?? ''
  let c = 0
  return (
    <span className="rotating-text" key={index} aria-live="polite">
      {phrase.split(' ').map((word, w) => (
        <span className="rt-word" key={`w${w}`}>
          {Array.from(word).map((ch) => (
            <span className="rt-char" key={`c${c}`} style={{ animationDelay: `${(c++) * 0.03}s` }}>
              {ch}
            </span>
          ))}
          <span className="rt-space">{'\u00a0'}</span>
        </span>
      ))}
    </span>
  )
}
