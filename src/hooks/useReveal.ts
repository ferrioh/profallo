import { useEffect } from 'react'

export function useReveal(dep?: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    if (!els.length) return
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in-view'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    els.forEach((el) => {
      if (!el.classList.contains('in-view')) io.observe(el)
    })
    return () => io.disconnect()
  }, [dep])
}
