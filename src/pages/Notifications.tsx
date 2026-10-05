import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { buildNotifications, timeAgo, type AppNotification } from '../lib/notifications'
import { month } from '../lib/utils'
import type { AppData } from '../types'

function ensure(d: AppData) {
  if (!d.notificationState) d.notificationState = { deleted: [], muted: [], read: [] }
  return d.notificationState
}

const TONE: Record<string, string> = { lime: 'accent', amber: 'white', red: 'red', slate: 'smoke' }

function SwipeRow({
  tone,
  muted,
  onDelete,
  onOpen,
  children,
}: {
  tone: string
  muted?: boolean
  onDelete: () => void
  onOpen: () => void
  children: ReactNode
}) {
  const [dx, setDx] = useState(0)
  const start = useRef<number | null>(null)
  const dragged = useRef(false)
  const THRESHOLD = 96

  function down(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    start.current = e.clientX
    dragged.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (start.current == null) return
    const delta = e.clientX - start.current
    if (Math.abs(delta) > 6) dragged.current = true
    setDx(Math.max(Math.min(0, delta), -150))
  }
  function up() {
    if (start.current == null) return
    const shouldDelete = dx < -THRESHOLD
    start.current = null
    setDx(0)
    if (shouldDelete) onDelete()
  }

  return (
    <div className="notif-swipe">
      <span className="notif-trash" aria-hidden="true"><Icon name="trash" /> Eliminar</span>
      <div
        className={`notif-item tone-${tone} ${muted ? 'is-muted' : ''}`}
        style={{
          transform: `translateX(${dx}px)`,
          transition: start.current != null ? 'none' : 'transform .36s cubic-bezier(.22,1,.36,1)',
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => { if (!dragged.current) onOpen() }}
      >
        {children}
      </div>
    </div>
  )
}

export function NotificationsPage() {
  const { data, commit, toast, goBack, patchUi, go } = useApp()
  const actions = useActions()
  const [menuId, setMenuId] = useState<string | null>(null)
  const items = buildNotifications(data)
  const current = items.find((n) => n.id === menuId) ?? null

  function remove(id: string) {
    commit((d) => {
      const s = ensure(d)
      if (!s.deleted.includes(id)) s.deleted.push(id)
    })
    setMenuId(null)
    toast('Notificación borrada.')
  }
  function mute(id: string) {
    commit((d) => {
      const s = ensure(d)
      if (!s.muted.includes(id)) s.muted.push(id)
    })
    setMenuId(null)
    toast('Notificación silenciada.')
  }
  function copy(n: { title: string; body: string }) {
    const text = `${n.title} — ${n.body}`
    const clip = navigator.clipboard
    if (clip) {
      clip.writeText(text).then(
        () => toast('Notificación copiada.'),
        () => toast('No se pudo copiar.'),
      )
    } else {
      toast('No se pudo copiar en este navegador.')
    }
    setMenuId(null)
  }

  function openTarget(n: AppNotification) {
    if (!n.target) return
    if (n.target.kind === 'payment' && n.target.id) actions.editPayment(n.target.id)
    else if (n.target.kind === 'session' && n.target.date) {
      patchUi({ calendarDate: n.target.date, calendarMonth: month(n.target.date) })
      go('calendario')
    } else if (n.target.kind === 'premium') actions.openMembership()
  }

  return (
    <div className="notif-page">
      <button className="text-back" onClick={goBack}><Icon name="chevron" style={{ transform: 'rotate(180deg)' }} /> Volver</button>
      <PageHead
        k="TODO LO IMPORTANTE, EN UN SOLO LUGAR."
        title={<>Notificaciones<span style={{ color: 'var(--lime)' }}>.</span></>}
        sub="Toca para abrir. Desliza a la izquierda para borrar."
      />
      <div className="notif-list">
        {items.map((n) => (
          <SwipeRow
            key={n.id}
            tone={TONE[n.color] ?? 'smoke'}
            muted={n.muted}
            onDelete={() => remove(n.id)}
            onOpen={() => openTarget(n)}
          >
            <span className="notif-mark"><Icon name={n.icon} /></span>
            <div className="notif-copy">
              <b>{n.title}</b>
              <p>{n.body}</p>
            </div>
            {n.kind !== 'sesion' ? <span className="notif-time">{timeAgo(n.time)}</span> : null}
            <button className="notif-more" onClick={(e) => { e.stopPropagation(); setMenuId(n.id) }} aria-label="Más opciones">
              <Icon name="more" />
            </button>
          </SwipeRow>
        ))}
        {!items.length ? (
          <div className="notif-empty">
            <Icon name="bell" />
            <p>No tienes notificaciones.</p>
          </div>
        ) : null}
      </div>

      {current ? (
        <div className="notif-sheet-backdrop" onClick={() => setMenuId(null)}>
          <div className="notif-sheet" role="dialog" aria-label="Opciones de la notificación" onClick={(e) => e.stopPropagation()}>
            <span className="notif-sheet-handle" aria-hidden="true" />
            <p className="notif-sheet-title">{current.title}</p>
            <button onClick={() => openTarget(current)}><Icon name="arrow" /> Abrir</button>
            <button onClick={() => copy(current)}><Icon name="copy" /> Copiar</button>
            <button onClick={() => mute(current.id)}><Icon name="bell" /> Silenciar</button>
            <button onClick={() => { setMenuId(null); toast('Notificación reportada.') }}><Icon name="report" /> Reportar</button>
            <button className="danger" onClick={() => remove(current.id)}><Icon name="trash" /> Borrar notificación</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
