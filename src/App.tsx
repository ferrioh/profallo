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
import { currentAccount, logout, useAuthVersion } from './lib/auth'
import { Icon } from './components/Icon'

export default function App() {
  const { view, entered, data, leave } = useApp()
  useAuthVersion()

  if (location.hash.startsWith('#ficha=')) return <PublicFicha />

  if (!entered) return <PublicHome />

  const account = currentAccount()
  const pending = !!account && account.role !== 'admin' && account.status === 'pending'

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
    ) : view === 'admin' ? (
      <AdminPage />
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

  if (pending) {
    return (
      <div className="verify-wrap">
        <div className="verify-blur" aria-hidden="true">{app}</div>
        <div className="verify-overlay">
          <div className="verify-card">
            <span className="entry-confirm-icon"><Icon name="check" /></span>
            <h1>Usuario registrado</h1>
            <p>Tu cuenta está <b>esperando verificación</b>. El administrador debe permitir tu acceso para poder usar la app.</p>
            <button className="button primary" onClick={() => { logout(); leave() }}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    )
  }

  return app
}
