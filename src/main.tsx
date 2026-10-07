import { createRoot } from 'react-dom/client'
import './styles/protrainer.css'
import './styles/modern.css'
import './styles/refresh.css'
import './styles/glass-surface.css'
import './styles/entry-simple.css'
import './styles/time-wheel.css'
import './styles/body-guide.css'
import './index.css'
import './styles/login.css'
import App from './App'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/ErrorBoundary'

// Soporta /admin (ruta) redirigiendo a #admin (hash del SPA).
if (/\/admin\/?$/i.test(window.location.pathname)) {
  const base = window.location.pathname.replace(/\/admin\/?$/i, '')
  window.location.replace(`${window.location.origin}${base}/#admin`)
}

// Muestra cualquier error no controlado (también promesas) para poder diagnosticar.
function showGlobalError(msg: string) {
  try {
    let el = document.getElementById('globalError')
    if (!el) {
      el = document.createElement('div')
      el.id = 'globalError'
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#7a1f1f;color:#fff;padding:10px 14px;font:12px/1.4 monospace;white-space:pre-wrap;max-height:45vh;overflow:auto'
      document.body.appendChild(el)
    }
    el.textContent += `Error: ${msg}\n`
  } catch { /* ignore */ }
}
window.addEventListener('error', (e) => showGlobalError((e as ErrorEvent).message || 'error'))
window.addEventListener('unhandledrejection', (e) => {
  const r = (e as PromiseRejectionEvent).reason
  showGlobalError((r && (r.message || String(r))) || 'promesa rechazada')
})

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>,
)
