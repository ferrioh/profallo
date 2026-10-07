import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

/** Botón de guardado con estado: gris cuando no hay cambios, "Guardando…" al enviar
 *  y "Guardado" con animación al completar. Se reactiva al cambiar algo (canSave). */
export function SaveButton({
  onSave,
  canSave = true,
  label = 'Guardar',
  className = 'button primary',
}: {
  onSave: () => Promise<boolean> | boolean
  canSave?: boolean
  label?: string
  className?: string
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const busy = status === 'saving'
  const disabled = !canSave || busy

  return (
    <button
      type="button"
      className={`${className} save-btn${status === 'saved' ? ' saved' : ''}`}
      onClick={async () => {
        if (disabled) return
        setStatus('saving')
        const ok = await onSave()
        if (ok) {
          setStatus('saved')
          timer.current = window.setTimeout(() => setStatus('idle'), 1800)
        } else {
          setStatus('idle')
        }
      }}
      disabled={disabled}
    >
      {busy ? 'Guardando…' : status === 'saved' ? 'Guardado' : label}
      <Icon name="check" />
    </button>
  )
}
