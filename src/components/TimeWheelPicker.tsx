import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

type Mode = 'clock' | 'duration' | 'rest'

function WheelColumn({ label, value, min = 0, max, onChange, format = (n: number) => String(n).padStart(2, '0') }: {
  label: string
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  format?: (value: number) => string
}) {
  const touchStart = useRef<number | null>(null)
  return <div className="time-wheel-column" role="spinbutton" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} onKeyDown={e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.max(min, value - 1)) }
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.min(max, value + 1)) }
  }} onWheel={e => onChange(Math.min(max, Math.max(min, value + (e.deltaY > 0 ? 1 : -1))))} onTouchStart={e => { touchStart.current = e.touches[0].clientY }} onTouchEnd={e => {
    if (touchStart.current === null) return
    const steps = Math.round((touchStart.current - e.changedTouches[0].clientY) / 34)
    if (steps) onChange(Math.min(max, Math.max(min, value + steps)))
    touchStart.current = null
  }}>
    {[-2, -1, 0, 1, 2].map(offset => {
      const item = value + offset
      return item < min || item > max
        ? <span className="time-wheel-empty" key={offset} aria-hidden="true" />
        : <button type="button" key={offset} className={offset === 0 ? 'selected' : ''} onClick={() => onChange(item)} tabIndex={-1} aria-hidden="true">{format(item)}</button>
    })}
  </div>
}

export function TimeWheelPicker({ mode, value, onSave, onClose }: {
  mode: Mode
  value: string | number
  onSave: (value: string | number) => void
  onClose: () => void
}) {
  const initial = mode === 'clock'
    ? (() => { const [h, m] = String(value).split(':').map(Number); return { first: ((h + 11) % 12) + 1, second: m || 0, period: h >= 12 ? 1 : 0 } })()
    : { first: Math.floor(Number(value) / 60), second: Number(value) % 60, period: 0 }
  const [first, setFirst] = useState(initial.first)
  const [second, setSecond] = useState(initial.second)
  const [period, setPeriod] = useState(initial.period)

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onEscape, true)
    return () => window.removeEventListener('keydown', onEscape, true)
  }, [onClose])

  const total = first * 60 + second
  const invalid = mode === 'duration' ? total < 10 || total > 300 : mode === 'rest' ? total > 600 : false
  const save = () => {
    if (invalid) return
    if (mode === 'clock') {
      const hour24 = first % 12 + (period ? 12 : 0)
      onSave(`${String(hour24).padStart(2, '0')}:${String(second).padStart(2, '0')}`)
    } else onSave(total)
  }

  return <div className="time-wheel-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="time-wheel-dialog" role="dialog" aria-modal="true" aria-label={mode === 'clock' ? 'Elegir hora' : mode === 'duration' ? 'Duración de la rutina' : 'Descanso del ejercicio'}>
      <div className="time-wheel-head"><button type="button" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button><strong>{mode === 'clock' ? 'Hora' : mode === 'duration' ? 'Duración' : 'Descanso'}</strong><button type="button" onClick={save} disabled={invalid}>Guardar</button></div>
      <div className="time-wheel-body">
        <span className="time-wheel-selection" aria-hidden="true" />
        <WheelColumn label={mode === 'rest' ? 'Minutos' : 'Horas'} value={first} min={mode === 'clock' ? 1 : 0} max={mode === 'clock' ? 12 : mode === 'duration' ? 5 : 10} onChange={setFirst} format={mode === 'clock' ? n => String(n) : undefined} />
        <WheelColumn label={mode === 'rest' ? 'Segundos' : 'Minutos'} value={second} max={59} onChange={setSecond} />
        {mode === 'clock' && <div className="time-wheel-column period" role="group" aria-label="AM o PM">
          {period === 0 ? <><span /><span /><button type="button" className="selected" onClick={() => setPeriod(0)}>AM</button><button type="button" onClick={() => setPeriod(1)}>PM</button><span /></> : <><span /><button type="button" onClick={() => setPeriod(0)}>AM</button><button type="button" className="selected" onClick={() => setPeriod(1)}>PM</button><span /><span /></>}
        </div>}
      </div>
      <p>{mode === 'clock' ? 'Hora de inicio' : mode === 'duration' ? 'Horas y minutos' : 'Minutos y segundos'}</p>
    </section>
  </div>
}
