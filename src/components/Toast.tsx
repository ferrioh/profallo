import { Icon } from './Icon'
import { useApp } from '../context/AppContext'

export function Toast() {
  const { toastMessage } = useApp()
  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      className={`pointer-events-none select-none ${toastMessage ? 'show' : ''}`}
    >
      <span className="toast-ic"><Icon name="check" /></span>
      <span className="toast-txt" key={toastMessage ?? ''}>{toastMessage ?? ''}</span>
      {toastMessage ? <span className="toast-bar" key={`b-${toastMessage}`} /> : null}
    </div>
  )
}
