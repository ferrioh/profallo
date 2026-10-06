import { useEffect, useRef } from 'react'

/**
 * Auto-deslizamiento constante y lineal (px por milisegundo) con rAF.
 * Se pausa al tocar/arrastrar con el dedo y reanuda suave al soltar.
 * Si `loop` es true, el contenido debe estar DUPLICADO: envuelve en la mitad
 * (scrollWidth/2) para un loop infinito sin corte.
 */
export function useAutoScroll(speed = 0.03, loop = true) {
  const ref = useRef<HTMLDivElement>(null)
  const paused = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let pos = el.scrollLeft
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      const max = el.scrollWidth - el.clientWidth
      if (paused.current) {
        pos = el.scrollLeft
      } else if (max > 4) {
        pos += speed * dt
        const wrapAt = loop ? el.scrollWidth / 2 : max
        if (pos >= wrapAt) pos -= wrapAt
        el.scrollLeft = pos
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const pause = () => { paused.current = true }
    const resume = () => { paused.current = false }
    el.addEventListener('pointerdown', pause)
    el.addEventListener('pointerup', resume)
    el.addEventListener('pointercancel', resume)
    el.addEventListener('pointerleave', resume)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('touchend', resume, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('pointerup', resume)
      el.removeEventListener('pointercancel', resume)
      el.removeEventListener('pointerleave', resume)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('touchend', resume)
    }
  }, [speed])

  return ref
}
