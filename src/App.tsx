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
import { cloudSignOut } from './lib/cloud'
import { Icon } from './components/Icon'

export default function App() {
  const { view, entered, data, leave, cloudEnabled, cloudUser, cloudProfile, cloudReady } = useApp()
  useAuthVersion()

  if (location.hash.startsWith('#ficha=')) return <PublicFicha />

  // Con Supabase activo, se exige sesión en la nube (ignora la sesión local vieja).
  const isIn = cloudEnabled ? !!cloudUser : entered
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

  const account = currentAccount()
  const blocked = cloudEnabled
    ? !!cloudProfile && cloudProfile.status !== 'approved'
    : !!account && account.role !== 'admin' && account.status !== 'approved'
  const rejected = cloudEnabled
    ? cloudProfile?.status === 'rejected'
    : account?.status === 'rejected'

  if (blocked) {
    return (
      <div className="verify-wrap">
        <div className="verify-overlay">
          <div className="verify-card">
            <span className="entry-confirm-icon">{rejected ? <Icon name="close" /> : <Icon name="check" />}</span>
            <h1>{rejected ? 'Acceso denegado' : 'Usuario registrado'}</h1>
            <p>
              {rejected
                ? 'El administrador denegó tu acceso.'
                : <>Tu cuenta está <b>esperando verificación</b>. El administrador debe permitir tu acceso.</>}
            </p>
            {cloudEnabled ? <p className="form-hint">Sesión: {data.profile.email || '—'}</p> : null}
            <button className="button primary" onClick={() => { if (cloudEnabled) void cloudSignOut(); else logout(); leave() }}>Cerrar sesión</button>
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

  return app
}
