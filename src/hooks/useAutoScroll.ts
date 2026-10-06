import { useEffect, useRef } from 'react'

/**
 * Carrusel profesional:
 * - Auto-deslizamiento constante y lineal (px/ms).
 * - Arrastre con el dedo en tiempo real (sigue el dedo).
 * - Inercia al soltar (según la fuerza) que decae y vuelve suave al auto.
 * - Loop infinito si `loop` (el contenido debe estar DUPLICADO; envuelve en la mitad).
 * El contenedor debe tener `overflow-x: hidden; touch-action: pan-y` (sin scrollbar).
 */
export function useAutoScroll(speed = 0.03, loop = true) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let last = performance.now()
    let pos = el.scrollLeft
    let dragging = false
    let startX = 0
    let startPos = 0
    let velocity = 0
    let prevX = 0
    let prevT = 0

    const wrap = (v: number) => {
      if (!loop) {
        const max = Math.max(0, el.scrollWidth - el.clientWidth)
        return Math.max(0, Math.min(max, v))
      }
      const w = el.scrollWidth / 2
      if (w <= 0) return v
      while (v >= w) v -= w
      while (v < 0) v += w
      return v
    }

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      if (!dragging) {
        if (Math.abs(velocity) > speed) {
          pos = wrap(pos + velocity * dt)
          velocity *= 0.94
        } else {
          velocity = 0
          pos = wrap(pos + speed * dt)
        }
        el.scrollLeft = pos
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const down = (e: PointerEvent) => {
      dragging = true
      startX = e.clientX
      startPos = el.scrollLeft
      pos = el.scrollLeft
      velocity = 0
      prevX = e.clientX
      prevT = performance.now()
      try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      pos = wrap(startPos - (e.clientX - startX))
      el.scrollLeft = pos
      const t = performance.now()
      const dtv = t - prevT
      if (dtv > 0) velocity = Math.max(-3, Math.min(3, -(e.clientX - prevX) / dtv))
      prevX = e.clientX
      prevT = t
    }
    const up = () => {
      if (!dragging) return
      dragging = false
      velocity = Math.max(-3, Math.min(3, velocity))
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [speed, loop])

  return ref
}
