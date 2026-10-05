export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function encode(canvas: HTMLCanvasElement, quality: number): string {
  let out = ''
  try { out = canvas.toDataURL('image/webp', quality) } catch { out = '' }
  if (out.startsWith('data:image/webp')) return out
  return canvas.toDataURL('image/jpeg', quality)
}

/** Reduce cualquier imagen a un tamaño máximo y la comprime a WebP (o JPEG). */
export function fitImage(img: HTMLImageElement, maxSize: number, quality = 0.72): string {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(img, 0, 0, w, h)
  return encode(c, quality)
}

/** Recorta en cuadrado (avatares) según zoom/desplazamiento y comprime. */
export function cropSquare(
  img: HTMLImageElement,
  opts: { zoom: number; offX: number; offY: number; preview: number; out: number; quality?: number },
): string {
  const { zoom, offX, offY, preview, out, quality = 0.82 } = opts
  const bw = img.naturalWidth
  const bh = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = out
  c.height = out
  const ctx = c.getContext('2d')
  if (!ctx) return ''
  const base = Math.max(out / bw, out / bh)
  const scale = base * zoom
  const dw = bw * scale
  const dh = bh * scale
  const k = out / preview
  const dx = (out - dw) / 2 + offX * k
  const dy = (out - dh) / 2 + offY * k
  ctx.drawImage(img, dx, dy, dw, dh)
  return encode(c, quality)
}
