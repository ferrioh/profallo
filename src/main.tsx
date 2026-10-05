import { createRoot } from 'react-dom/client'
import './styles/protrainer.css'
import './styles/modern.css'
import './styles/refresh.css'
import './styles/entry-simple.css'
import './styles/time-wheel.css'
import './styles/body-guide.css'
import './index.css'
import App from './App'
import { AppProvider } from './context/AppContext'

// Soporta /admin (ruta) redirigiendo a #admin (hash del SPA).
if (/\/admin\/?$/i.test(window.location.pathname)) {
  const base = window.location.pathname.replace(/\/admin\/?$/i, '')
  window.location.replace(`${window.location.origin}${base}/#admin`)
}

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <App />
  </AppProvider>,
)
