import { useApp } from './context/AppContext'
import { Sidebar, Shell } from './components/Layout'
import { ModalHost } from './components/Modals'
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
import { AdminPage } from './pages/Admin'
import { PublicHome } from './pages/PublicHome'
import { AdminLogin } from './pages/AdminLogin'
import { currentAccount, useAuthVersion } from './lib/auth'

export default function App() {
  const { view, entered, data, cloudEnabled, cloudUser, cloudProfile, cloudReady } = useApp()
  useAuthVersion()

  if (location.hash.startsWith('#ficha=')) return <PublicFicha />

  const isIn = cloudEnabled ? !!cloudUser : entered

  // Ruta de administración: login de admin dedicado + panel.
  if (view === 'admin') {
    if (cloudEnabled && cloudUser && !cloudReady) {
      return (
        <div className="verify-wrap">
          <div className="verify-overlay">
            <div className="verify-card">
              <span className="verify-spinner" aria-hidden="true" />
              <h1>Cargando…</h1>
            </div>
          </div>
        </div>
      )
    }
    const adminSession = cloudEnabled
      ? cloudProfile?.role === 'admin'
      : (currentAccount()?.role ?? data.profile.role) === 'admin'
    return adminSession ? <AdminPage /> : <AdminLogin />
  }

  if (!isIn) return <PublicHome />

  if (cloudEnabled && cloudUser && !cloudReady) {
    return (
      <div className="verify-wrap">
        <div className="verify-overlay">
          <div className="verify-card">
            <span className="verify-spinner" aria-hidden="true" />
            <h1>Cargando tu espacio…</h1>
            <p>Sincronizando con la nube.</p>
          </div>
        </div>
      </div>
    )
  }

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
      <Shell>{page}</Shell>
      <ModalHost />
      <Toast />
    </>
  )

  return app
}
