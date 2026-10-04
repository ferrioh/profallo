import { useApp } from '../context/AppContext'

export function Toast() {
  const { toastMessage } = useApp()
  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      className={toastMessage ? 'show' : ''}
    >
      {toastMessage ?? ''}
    </div>
  )
}
