import { useApp } from '../context/AppContext'

export function Toast() {
  const { toastMessage } = useApp()
  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      className={`pointer-events-none select-none ${
        toastMessage ? 'show' : ''
      }`}
    >
      <span className="block">{toastMessage ?? ''}</span>
    </div>
  )
}
