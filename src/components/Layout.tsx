import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import type { View } from '../types'
import { Icon, type IconName } from './Icon'
import { initials } from '../lib/utils'
import { currentAccount, useAuthVersion } from '../lib/auth'
import { cloudSignOut } from '../lib/cloud'
import { buildNotifications, notificationStateOf } from '../lib/notifications'
import { cloudSubscribeAdminMessages, cloudMyAdminMessages, type AdminMessage } from '../lib/cloud'
import { playTick } from '../lib/sound'
import GlassSurface from './GlassSurface'

export const NAV: Array<[View, string, IconName]> = [
  ['inicio', 'Inicio', 'grid'],
  ['clientes', 'Clientes', 'clients'],
  ['calendario', 'Calendario', 'calendar'],
  ['rutinas', 'Rutinas', 'dumbbell'],
  ['pagos', 'Pagos', 'wallet'],
  ['perfil', 'Perfil', 'user'],
]

export const PAGE_LABELS: Record<string, string> = {
  inicio: 'Inicio',
  clientes: 'Clientes',
  calendario: 'Calendario',
  rutinas: 'Rutinas',
  pagos: 'Pagos',
  progreso: 'Progreso',
  ajustes: 'Ajustes y respaldos',
  perfil: 'Perfil del entrenador',
  'cliente-perfil': 'Perfil del cliente',
  notificaciones: 'Notificaciones',
  admin: 'Panel de administración',
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
  const { data, view, go, stats, leave, cloudEnabled, cloudProfile } = useApp()
  useAuthVersion()
  const admin = cloudEnabled
    ? cloudProfile?.role === 'admin'
    : (currentAccount()?.role ?? data.profile.role) === 'admin'
  const activeView = view === 'cliente-perfil' ? 'clientes' : view
  const navRef = useRef<HTMLElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })
  const dragRef = useRef<{ startX: number; target: number } | null>(null)
  const [dragDx, setDragDx] = useState(0)
  const [dragging, setDragging] = useState(false)

  function navIndex() {
    return NAV.findIndex(([v]) => v === activeView)
  }
  function navButtons() {
    const nav = navRef.current
    return nav ? Array.from(nav.querySelectorAll<HTMLElement>('.nav-button')) : []
  }
  function nearestIndex(clientX: number) {
    const btns = navButtons()
    let best = 0
    let bestD = Infinity
    btns.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      const d = Math.abs(clientX - (r.left + r.width / 2))
      if (d < bestD) { bestD = d; best = i }
    })
    return best
  }
  function dockBump(px: number | null, py: number | null) {
    const nav = navRef.current
    if (!nav) return
    const navRect = nav.getBoundingClientRect()
    const horizontal = navRect.width >= navRect.height
    navButtons().forEach((el) => {
      if (px == null || py == null) { el.style.setProperty('--s', '1'); return }
      // Usa offsetLeft/Top (no afectados por el scale) para evitar jitter.
      if (horizontal) {
        const center = navRect.left + el.offsetLeft + el.offsetWidth / 2
        el.style.setProperty('--s', Math.max(1, 1.5 - Math.abs(px - center) / 170).toFixed(3))
      } else {
        const center = navRect.top + el.offsetTop + el.offsetHeight / 2
        el.style.setProperty('--s', Math.max(1, 1.45 - Math.abs(py - center) / 150).toFixed(3))
      }
    })
  }
  function onNavDown(e: ReactPointerEvent<HTMLElement>) {
    dragRef.current = { startX: e.clientX, target: navIndex() }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onNavMove(e: ReactPointerEvent<HTMLElement>) {
    // Magnificación tipo Dock (también al pasar el mouse, sin arrastrar).
    dockBump(e.clientX, e.clientY)
    if (!dragRef.current) return
    // Movilidad libre: el píldora sigue el dedo sin saltos.
    const d = e.clientX - dragRef.current.startX
    const w = navRef.current?.clientWidth ?? 320
    setDragDx(Math.max(-w, Math.min(w, d)))
    // Tracker: recuerda el botón más cercano para dejarlo ahí al soltar.
    dragRef.current.target = nearestIndex(e.clientX)
  }
  function onNavLeave() {
    dockBump(null, null)
  }
  function onNavUp() {
    const target = dragRef.current?.target
    dragRef.current = null
    dockBump(null, null)
    // Pasar directo a la posición destino (mismo frame): evita el "flash" en la
    // posición anterior. Se mantiene la transición desactivada durante el pase.
    setDragDx(0)
    if (target != null) {
      const el = navButtons()[target]
      if (el) setPill({ left: el.offsetLeft + 3, width: Math.max(0, el.offsetWidth - 6), ready: true })
      const v = NAV[target]?.[0]
      if (v && v !== activeView) {
        playTick()
        go(v)
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(() => setDragging(false)))
  }

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const update = () => {
      const el = nav.querySelector<HTMLElement>('.nav-button.active')
      if (!el) {
        setPill((p) => ({ ...p, ready: false }))
        return
      }
      setPill({ left: el.offsetLeft + 3, width: Math.max(0, el.offsetWidth - 6), ready: true })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeView])

  return (
    <aside className="sidebar">
      <GlassSurface className="sidebar-glass" width="100%" height="100%" borderRadius={0} backgroundOpacity={0.06} brightness={36} opacity={0.9} blur={12} displace={1.1} distortionScale={-160} saturation={1.4} mixBlendMode="screen">
        <span />
      </GlassSurface>
      <a className="brand" href="#inicio">
        <span className="brand-mark">p</span>
        profallo
        <span className="brand-dot">.</span>
      </a>
      <div className="workspace">
        TU ESPACIO DE ENTRENAMIENTO
        <span className="demo">
          {data.demo ? 'DEMO LOCAL' : 'ESPACIO LOCAL'}
        </span>
      </div>
      <nav
        aria-label="Navegación principal"
        id="nav"
        ref={navRef}
        onPointerDown={onNavDown}
        onPointerMove={onNavMove}
        onPointerUp={onNavUp}
        onPointerCancel={onNavUp}
        onPointerLeave={onNavLeave}
      >
        <span
          className="nav-pill"
          aria-hidden="true"
          style={{
            left: pill.left,
            width: pill.width,
            opacity: pill.ready ? 1 : 0,
            transform: `translateY(-50%) translateX(${dragDx}px)`,
            transition: dragging ? 'none' : undefined,
          }}
        />
        {NAV.map(([v, t, ic]) => (
          <button
            key={v}
            className={`nav-button ${activeView === v ? 'active' : ''}`}
            onClick={() => { playTick(); go(v) }}
            title={t}
            data-label={t}
            aria-label={t}
            aria-current={activeView === v ? 'page' : undefined}
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
        {admin ? (
          <button className="nav-button" onClick={() => window.open(`${location.origin}${location.pathname}#admin`, '_blank', 'noopener')}>
            <Icon name="grid" />
            Panel de administración
          </button>
        ) : null}
        <button className="nav-button leave-button" onClick={() => { leave(); if (cloudEnabled) void cloudSignOut() }}>Salir al inicio público</button>
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
            <img src={data.profile.photo || 'assets/coach.png'} alt="Foto del entrenador" />
          </span>
          <div>
            <b id="coachName">
              {data.profile.name}
              {data.profile.verified ? <Verified /> : null}
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
  const { data, view, go, storageAvailable, cloudEnabled, cloudUser, cloudProfile, commit } = useApp()
  const admin = cloudEnabled ? cloudProfile?.role === 'admin' : data.profile.role === 'admin'
  const label = PAGE_LABELS[view] ?? 'Inicio'
  const notifications = buildNotifications(data)
  const readIds = new Set(notificationStateOf(data).read)
  const delIds = new Set(notificationStateOf(data).deleted)
  const [adminMsgs, setAdminMsgs] = useState<AdminMessage[]>([])

  useEffect(() => {
    if (!cloudEnabled || !cloudUser) return
    let alive = true
    const load = () => { cloudMyAdminMessages(cloudUser).then((m) => { if (alive) setAdminMsgs(m) }) }
    load()
    const unsub = cloudSubscribeAdminMessages(load)
    const id = window.setInterval(load, 20000)
    return () => { alive = false; unsub(); window.clearInterval(id) }
  }, [cloudEnabled, cloudUser])

  const msgUnread = adminMsgs.filter((m) => !readIds.has(`msg:${m.id}`) && !delIds.has(`msg:${m.id}`)).length
  const unread = notifications.filter((n) => !readIds.has(n.id)).length + msgUnread

  function openNotifications() {
    commit((d) => {
      const ns = notificationStateOf(d)
      const set = new Set(ns.read)
      notifications.forEach((n) => set.add(n.id))
      adminMsgs.forEach((m) => set.add(`msg:${m.id}`))
      d.notificationState = { ...ns, read: [...set] }
    })
    go('notificaciones')
  }
  return (
    <header className="topbar">
      <div className="breadcrumb">
        WORKSPACE <span>/</span> <b id="pageLabel">{label}</b>
      </div>
      <div className="top-actions">
        <span className="local-status">
          <i />
          {cloudEnabled
            ? cloudUser
              ? 'Guardado en la nube'
              : 'Sin sesión'
            : storageAvailable
              ? 'Guardado local'
              : 'Sin guardado persistente'}
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
          onClick={openNotifications}
          aria-label={unread ? `${unread} notificaciones` : 'Ver notificaciones'}
        >
          <Icon name="bell" />
          {unread > 0 ? <span className="notif-badge">{unread > 9 ? '9+' : unread}</span> : null}
        </button>
        {admin ? (
          <button
            className="icon-button"
            id="adminPanel"
            onClick={() => window.open(`${location.origin}${location.pathname}#admin`, '_blank', 'noopener')}
            aria-label="Panel de administración"
            title="Abrir panel de administración (nueva pestaña)"
          >
            <Icon name="grid" />
          </button>
        ) : null}
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
        <span>PROFALLO / TRAIN SMART. COACH BETTER.</span>
        <span>Hecho para tu siguiente nivel ↗</span>
      </footer>
    </div>
  )
}

export function ClientAvatarFallback(name: string) {
  return <span className="avatar lime">{initials(name)}</span>
}
