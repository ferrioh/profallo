import { useApp } from './context/AppContext'
import { Sidebar, Shell } from './components/Layout'
import { ModalHost } from './components/Modals'
import { Toast } from './components/Toast'
import { Dashboard } from './pages/Dashboard'
import { ClientsPage } from './pages/Clients'
import { CalendarPage } from './pages/Calendar'
import { PaymentsPage } from './pages/Payments'
import { RoutinesPage } from './pages/Routines'
import { ProgressPage } from './pages/Progress'
import { SettingsPage } from './pages/Settings'
import { ProfilePage } from './pages/Profile'

export default function App() {
  const { view } = useApp()

  const page =
    view === 'clientes' ? (
      <ClientsPage />
    ) : view === 'calendario' ? (
      <CalendarPage />
    ) : view === 'pagos' ? (
      <PaymentsPage />
    ) : view === 'rutinas' ? (
      <RoutinesPage />
    ) : view === 'progreso' ? (
      <ProgressPage />
    ) : view === 'ajustes' ? (
      <SettingsPage />
    ) : view === 'perfil' ? (
      <ProfilePage />
    ) : (
      <Dashboard />
    )

  return (
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
}
