import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead } from '../components/ui'
import { clientPhotos, findRoutine, initials, progressFor } from '../lib/utils'

export function ClientsPage() {
  const { data, ui, money } = useApp()
  const actions = useActions()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')

  const clients = data.clients.filter((c) => {
    const inFilter =
      ui.clientFilter === 'todos' || ui.clientFilter === 'archivo'
        ? ui.clientFilter === 'todos' || c.archived
        : !c.archived
    const haystack = `${c.name} ${c.goal} ${c.email}`.toLowerCase()
    return inFilter && haystack.includes(ui.query.toLowerCase())
  })

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
        <span className="toolbar-title">Clientes</span>
        <div className="layout-toggle">
          <button type="button" className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} aria-label="Cuadrícula"><Icon name="grid" /></button>
          <button type="button" className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')} aria-label="Lista"><Icon name="list" /></button>
        </div>
      </div>
      <div className={layout === 'grid' ? 'client-grid' : 'client-list'} id="clientGrid">
        {clients.map((c) => {
          const photo = c.photo || clientPhotos[c.id]
          const attendance = progressFor(data, c.id)
          const routine = findRoutine(data, c.routine)
          if (layout === 'list') {
            return (
              <article className="client-list-item" key={c.id}>
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
            <article className="client-card modern-client" key={c.id}>
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
