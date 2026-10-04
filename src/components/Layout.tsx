import type { ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import type { View } from '../types'
import { Icon, type IconName } from './Icon'
import { initials } from '../lib/utils'

export const NAV: Array<[View, string, IconName]> = [
  ['inicio', 'Visión general', 'grid'],
  ['clientes', 'Clientes', 'users'],
  ['calendario', 'Calendario', 'calendar'],
  ['rutinas', 'Rutinas', 'dumbbell'],
  ['pagos', 'Pagos', 'wallet'],
  ['progreso', 'Progreso', 'chart'],
]

export const PAGE_LABELS: Record<string, string> = {
  inicio: 'Visión general',
  clientes: 'Clientes',
  calendario: 'Calendario',
  rutinas: 'Rutinas',
  pagos: 'Pagos',
  progreso: 'Progreso',
  ajustes: 'Ajustes y respaldos',
  perfil: 'Perfil del entrenador',
}

export function Verified() {
  return (
    <span
      className="verified"
      title="Distintivo visual del perfil"
      aria-label="Distintivo de verificado"
    >
      <Icon name="check" />
    </span>
  )
}

export function Sidebar() {
  const { data, view, go, stats } = useApp()
  return (
    <aside className="sidebar">
      <a className="brand" href="#inicio">
        <span className="brand-mark">
          p<span>↗</span>
        </span>
        protrainer
        <span className="brand-dot">.</span>
      </a>
      <div className="workspace">
        TU ESPACIO DE ENTRENAMIENTO
        <span className="demo">
          {data.demo ? 'DEMO LOCAL' : 'ESPACIO LOCAL'}
        </span>
      </div>
      <nav aria-label="Navegación principal" id="nav">
        {NAV.map(([v, t, ic]) => (
          <button
            key={v}
            className={`nav-button ${view === v ? 'active' : ''}`}
            onClick={() => go(v)}
            title={t}
            aria-current={view === v ? 'page' : undefined}
          >
            <Icon name={ic} />
            <span>{t}</span>
            {v === 'clientes' ? (
              <span className="nav-count">{stats.active}</span>
            ) : null}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="small-caps">
          MENOS GESTIÓN.
          <br />
          MÁS EVOLUCIÓN.
        </div>
        <div className="orbit-mini">↗</div>
        <button className="nav-button" onClick={() => go('ajustes')}>
          <Icon name="settings" />
          Ajustes y respaldos
        </button>
        <div
          className="coach"
          role="button"
          tabIndex={0}
          aria-label="Ver perfil del entrenador"
          onClick={() => go('perfil')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              go('perfil')
            }
          }}
        >
          <span className="avatar lime" id="coachAvatar">
            <img src="assets/coach.png" alt="Foto del entrenador" />
          </span>
          <div>
            <b id="coachName">
              {data.profile.name}
              <Verified />
            </b>
            <small>Personal trainer</small>
          </div>
          <span className="online" title="Aplicación local" />
        </div>
      </div>
    </aside>
  )
}

export function Topbar() {
  const { view, go, storageAvailable, patchUi } = useApp()
  const label = PAGE_LABELS[view] ?? 'Visión general'
  return (
    <header className="topbar">
      <div className="breadcrumb">
        WORKSPACE <span>/</span> <b id="pageLabel">{label}</b>
      </div>
      <div className="top-actions">
        <span className="local-status">
          <i />
          {storageAvailable ? 'Guardado local' : 'Sin guardado persistente'}
        </span>
        <button
          className="icon-button"
          id="searchOpen"
          onClick={() => go('clientes')}
          aria-label="Buscar clientes"
        >
          <Icon name="search" />
        </button>
        <button
          className="icon-button"
          id="notifications"
          onClick={() => {
            patchUi({ paymentFilter: 'vencido' })
            go('pagos')
          }}
          aria-label="Ver pagos pendientes"
        >
          <Icon name="bell" />
          <i className="notification-dot" />
        </button>
        <button
          className="avatar tiny"
          id="headerAvatar"
          onClick={() => go('perfil')}
          aria-label="Abrir perfil del entrenador"
        >
          <img src="assets/coach.png" alt="Foto del entrenador" />
        </button>
      </div>
    </header>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Topbar />
      <main id="content" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer">
        <span>PROTRAINER / TRAIN SMART. COACH BETTER.</span>
        <span>Hecho para tu siguiente nivel ↗</span>
      </footer>
    </div>
  )
}

export function ClientAvatarFallback(name: string) {
  return <span className="avatar lime">{initials(name)}</span>
}
