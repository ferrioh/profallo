/** Convierte un usuario o URL de red social en un enlace completo. */
export function socialUrl(kind: 'instagram' | 'tiktok', value?: string): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const handle = raw.replace(/^@+/, '').replace(/\s+/g, '')
  return kind === 'instagram'
    ? `https://instagram.com/${handle}`
    : `https://tiktok.com/@${handle}`
}

/** Texto a mostrar de un usuario de red social (@usuario). */
export function socialHandle(value?: string): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const tail = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '').split('/').filter(Boolean).pop() ?? raw
  return `@${tail.replace(/^@+/, '')}`
}
