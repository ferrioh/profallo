import { Suspense, lazy } from 'react'
import { useApp } from './context/AppContext'
import { Sidebar, Shell } from './components/Layout'
import { Toast } from './components/Toast'
import { Paywall } from './components/Paywall'
import { membershipLocked } from './lib/plans'
import { Dashboard } from './pages/Dashboard'
import { ClientsPage } from './pages/Clients'
import { CalendarPage } from './pages/Calendar'
import { PaymentsPage } from './pages/Payments'
import { RoutinesPage } from './pages/Routines'
import { SettingsPage } from './pages/Settings'
import { ProfilePage } from './pages/Profile'
import { ClientProfilePage } from './pages/ClientProfile'
import { PublicFicha } from './pages/PublicFicha'
import { NotificationsPage } from './pages/Notifications'
import { PublicHome } from './pages/PublicHome'
import { PublicTrainer } from './pages/PublicTrainer'
import { PublicClient } from './pages/PublicClient'
import { currentAccount, useAuthVersion } from './lib/auth'
import { EntryLoader } from './components/EntryLoader'

// Chunks diferidos: el panel de admin y los modales solo se descargan si se usan.
const AdminPage = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminPage })))
const AdminLogin = lazy(() => import('./pages/AdminLogin').then((m) => ({ default: m.AdminLogin })))
const ModalHost = lazy(() => import('./components/Modals').then((m) => ({ default: m.ModalHost })))

function AppLoader() {
  return <EntryLoader />
}

export default function App() {
  const { view, entered, data, cloudEnabled, cloudUser, cloudProfile, cloudReady } = useApp()
  useAuthVersion()

  if (location.hash.startsWith('#ficha=')) return <PublicFicha />

  // Semana de entrenamiento del cliente (link corto): profallo.vercel.app/c/<codigo>
  const cm = location.pathname.match(/^\/c\/([^/]+)\/?$/)
  if (cm) return <PublicClient code={decodeURIComponent(cm[1])} />

  // Ficha pública del entrenador: profallo.vercel.app/<usuario>
  const slug = location.pathname.replace(/^\/+|\/+$/g, '')
  if (slug && slug !== 'admin' && !slug.includes('/') && !slug.includes('.')) {
    return <PublicTrainer username={slug} />
  }

  const isIn = cloudEnabled ? !!cloudUser : entered

  // Mientras se resuelve la sesión y los datos de la nube, mostramos la pantalla de carga.
  if (cloudEnabled && !cloudReady) {
    return <AppLoader />
  }

  // Ruta de administración: login de admin dedicado + panel.
  if (view === 'admin') {
    const adminSession = cloudEnabled
      ? cloudProfile?.role === 'admin'
      : (currentAccount()?.role ?? data.profile.role) === 'admin'
    return adminSession
      ? <Suspense fallback={<AppLoader />}><AdminPage /></Suspense>
      : <Suspense fallback={<AppLoader />}><AdminLogin signedIn={cloudEnabled ? !!cloudUser : false} /></Suspense>
  }

  if (!isIn) return <PublicHome />

  // Al terminar los 15 días de prueba, se debe pagar Premium para seguir.
  if (membershipLocked(data.profile)) {
    return (
      <>
        <Paywall />
        <Toast />
      </>
    )
  }

  const page =
    view === 'clientes' ? (
      <ClientsPage />
    ) : view === 'calendario' ? (
      <CalendarPage />
    ) : view === 'pagos' ? (
      <PaymentsPage />
    ) : view === 'rutinas' ? (
      <RoutinesPage />
    ) : view === 'ajustes' ? (
      <SettingsPage />
    ) : view === 'perfil' ? (
      <ProfilePage />
    ) : view === 'cliente-perfil' ? (
      <ClientProfilePage />
    ) : view === 'notificaciones' ? (
      <NotificationsPage />
    ) : (
      <Dashboard />
    )

  const app = (
    <>
      <a className="skip" href="#content">
        Ir al contenido
      </a>
      <Sidebar />
      <Shell>
        <div key={view} className="page-anim">
          {page}
        </div>
      </Shell>
      <Suspense fallback={null}>
        <ModalHost />
      </Suspense>
      <Toast />
    </>
  )

  return app
}
