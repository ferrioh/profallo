import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead } from '../components/ui'
import { clientPhotos, findRoutine, initials, progressFor } from '../lib/utils'
import type { Client } from '../types'

function moveBefore(list: Client[], fromId: string, toId: string): Client[] {
  if (fromId === toId) return list
  const from = list.findIndex((c) => c.id === fromId)
  if (from < 0) return list
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  const to = next.findIndex((c) => c.id === toId)
  if (to < 0) return list
  next.splice(to, 0, moved)
  return next
}

export function ClientsPage() {
  const { data, ui, commit, money, toast } = useApp()
  const actions = useActions()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [dragOrder, setDragOrder] = useState<Client[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)
  const rectsRef = useRef<Map<string, DOMRect>>(new Map())

  const base = dragOrder ?? data.clients
  const clients = base.filter((c) => {
    const inFilter =
      ui.clientFilter === 'todos' || ui.clientFilter === 'archivo'
        ? ui.clientFilter === 'todos' || c.archived
        : !c.archived
    const haystack = `${c.name} ${c.goal} ${c.email}`.toLowerCase()
    return inFilter && haystack.includes(ui.query.toLowerCase())
  })

  // FLIP: anima el movimiento de las fichas al reordenar/filtrar/cambiar de vista.
  useLayoutEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('#clientGrid [data-client-id]')
    nodes.forEach((el) => {
      const id = el.dataset.clientId
      if (!id) return
      const next = el.getBoundingClientRect()
      const prev = rectsRef.current.get(id)
      if (prev && (Math.abs(prev.top - next.top) > 0.5 || Math.abs(prev.left - next.left) > 0.5)) {
        const dx = prev.left - next.left
        const dy = prev.top - next.top
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0,0)' }],
          { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' },
        )
      }
      rectsRef.current.set(id, next)
    })
  })

  function onHandleDown(id: string, e: ReactPointerEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    dragRef.current = id
    setDraggingId(id)
    setDragOrder(data.clients.slice())
  }

  function onHandleMove(e: ReactPointerEvent<HTMLElement>) {
    if (!dragRef.current) return
    e.preventDefault()
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-client-id]') as HTMLElement | null
    const overId = under?.dataset.clientId
    if (!overId || overId === dragRef.current) return
    const fromId = dragRef.current
    setDragOrder((prev) => moveBefore(prev ?? data.clients, fromId, overId))
  }

  function onHandleUp() {
    const id = dragRef.current
    if (!id) return
    dragRef.current = null
    setDraggingId(null)
    const order = dragOrder
    setDragOrder(null)
    if (order) {
      const withOrder = order.map((c, i) => ({ ...c, order: i }))
      commit((d) => { d.clients = withOrder })
      toast('Orden guardado.')
    }
  }

  function handle(id: string) {
    return (
      <span
        className="cli-drag"
        role="button"
        tabIndex={0}
        aria-label="Arrastrar para reordenar"
        title="Arrastra para reordenar"
        onPointerDown={(e) => onHandleDown(id, e)}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
      >
        <Icon name="grip" />
      </span>
    )
  }

  return (
    <>
      <PageHead
        k="PERSONAS ANTES QUE NÚMEROS."
        title={
          <>
            Tu equipo<span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Fichas, objetivos, rutinas y evolución de cada cliente."
      />
      <div className="routine-create">
        <button className="routine-create-btn" onClick={actions.newClient} aria-label="Añadir cliente">
          <Icon name="plus" />
        </button>
        <span>Añadir cliente</span>
      </div>
      <div className="client-overview" aria-label="Resumen de clientes">
        <div><span>Clientes activos</span><strong>{data.clients.filter(c => !c.archived).length}</strong><small>En tu equipo</small></div>
        <div><span>Con rutina</span><strong>{data.clients.filter(c => !c.archived && c.routine).length}</strong><small>Plan asignado</small></div>
      </div>
      <div className="toolbar client-toolbar">
        <div className="layout-toggle">
          <button type="button" className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} aria-label="Cuadrícula"><Icon name="grid" /></button>
          <button type="button" className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')} aria-label="Lista"><Icon name="list" /></button>
        </div>
      </div>
      <div className={layout === 'grid' ? 'client-grid' : 'client-list'} id="clientGrid">
        {clients.map((c, i) => {
          const photo = c.photo || clientPhotos[c.id]
          const attendance = progressFor(data, c.id)
          const routine = findRoutine(data, c.routine)
          const delay = { animationDelay: `${Math.min(i, 12) * 0.045}s` }
          if (layout === 'list') {
            return (
              <article className={`client-list-item cli-anim${draggingId === c.id ? ' dragging' : ''}`} key={c.id} data-client-id={c.id} style={delay}>
                {handle(c.id)}
                <Avatar client={c} />
                <div className="cli-main">
                  <b>{c.name}</b>
                  <small>{c.goal || '—'} · {routine?.name || 'Sin rutina'}</small>
                </div>
                <div className="cli-meta"><b>{attendance}%</b><small>Asistencia</small></div>
                <div className="cli-actions">
                  <button type="button" onClick={() => actions.clientDetail(c.id)} aria-label={`Ver ${c.name}`}><Icon name="arrow" /></button>
                  <button type="button" onClick={() => actions.editClient(c.id)} aria-label={`Editar ${c.name}`}><Icon name="edit" /></button>
                </div>
              </article>
            )
          }
          return (
            <article className={`client-card modern-client cli-anim${draggingId === c.id ? ' dragging' : ''}`} key={c.id} data-client-id={c.id} style={delay}>
              <div className={`client-cover ${photo ? 'with-photo' : ''}`}>
                {photo ? (
                  <img src={photo} alt={c.name} loading="lazy" />
                ) : (
                  <span>{initials(c.name)}</span>
                )}
                <div className="client-cover-shade" />
                <span className={`pill ${c.archived ? 'orange' : 'green'}`}>
                  {c.archived ? 'Archivado' : c.plan}
                </span>
                <button
                  className="client-cover-open glass-button"
                  onClick={() => actions.clientDetail(c.id)}
                  aria-label={`Abrir perfil de ${c.name}`}
                >
                  <Icon name="up" />
                </button>
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.goal}</p>
                </div>
              </div>
              <div className="client-snapshot">
                <span>
                  <small>ASISTENCIA</small>
                  <b>{attendance}%</b>
                </span>
                <span>
                  <small>PLAN MENSUAL</small>
                  <b>{money(c.fee)}</b>
                </span>
              </div>
              <div className="client-card-progress"><div className="wide-track" role="progressbar" aria-label={`Asistencia de ${c.name}`} aria-valuenow={attendance} aria-valuemin={0} aria-valuemax={100}><i style={{width: `${attendance}%`}} /></div></div>
              <div className="client-card-plan"><span>Rutina actual</span><strong>{routine?.name || 'Sin rutina asignada'}</strong></div>
              <div className="client-card-actions"><button onClick={() => actions.clientDetail(c.id)}>Ver perfil <Icon name="arrow" /></button><button onClick={() => actions.editClient(c.id)}>Editar <Icon name="edit" /></button></div>
            </article>
          )
        })}
        {!clients.length ? (
          <div className="card white empty-state">
            Añade un cliente o cambia la búsqueda.
          </div>
        ) : null}
      </div>
    </>
  )
}
