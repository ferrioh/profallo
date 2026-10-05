import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from './Icon'
import { cropSquare, loadImage } from '../lib/image'

const PREVIEW = 280
const OUT = 512

export function ImageEditor({
  src,
  onCancel,
  onSave,
}: {
  src: string
  onCancel: () => void
  onSave: (dataUrl: string) => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    loadImage(src).then(setImg).catch(() => setImg(null))
  }, [src])

  function dims(z: number) {
    if (!img) return { dw: 0, dh: 0 }
    const base = Math.max(PREVIEW / img.naturalWidth, PREVIEW / img.naturalHeight)
    const s = base * z
    return { dw: img.naturalWidth * s, dh: img.naturalHeight * s }
  }

  function clamp(o: { x: number; y: number }, z: number) {
    const { dw, dh } = dims(z)
    const mx = Math.max(0, (dw - PREVIEW) / 2)
    const my = Math.max(0, (dh - PREVIEW) / 2)
    return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) }
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !img) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, PREVIEW, PREVIEW)
    const { dw, dh } = dims(zoom)
    ctx.drawImage(img, (PREVIEW - dw) / 2 + off.x, (PREVIEW - dh) / 2 + off.y, dw, dh)
  }, [img, zoom, off])

  function down(e: ReactPointerEvent<HTMLCanvasElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { x: e.clientX, y: e.clientY }
    setOff((o) => clamp({ x: o.x + dx, y: o.y + dy }, zoom))
  }
  function up() {
    dragRef.current = null
  }

  function save() {
    if (!img) return
    onSave(cropSquare(img, { zoom, offX: off.x, offY: off.y, preview: PREVIEW, out: OUT }))
  }

  return (
    <div className="image-editor-backdrop" onClick={onCancel}>
      <div className="image-editor" onClick={(e) => e.stopPropagation()}>
        <h3>Ajustar foto</h3>
        <p className="form-hint">Arrastra para centrar y usa el zoom. Se guardará liviana (WebP).</p>
        <canvas
          ref={canvasRef}
          width={PREVIEW}
          height={PREVIEW}
          className="image-editor-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
        <label className="image-editor-zoom">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value)
              setZoom(z)
              setOff((o) => clamp(o, z))
            }}
          />
        </label>
        <div className="form-foot">
          <button className="button light" type="button" onClick={onCancel}>Cancelar</button>
          <button className="button primary" type="button" onClick={save} disabled={!img}>
            <Icon name="check" /> Guardar foto
          </button>
        </div>
      </div>
    </div>
  )
}
