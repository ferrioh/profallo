import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { clientPhotos, initials, progressFor } from '../lib/utils'
import type { ClientFilter } from '../types'

const FILTERS: Array<[ClientFilter, string]> = [
  ['activos', 'Activos'],
  ['todos', 'Todos'],
  ['archivo', 'Archivo'],
]

export function ClientsPage() {
  const { data, ui, patchUi, money } = useApp()
  const actions = useActions()

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
        actions={
          <button className="button primary" onClick={actions.newClient}>
            <Icon name="plus" />
            Añadir cliente
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" />
          <input
            id="clientSearch"
            aria-label="Buscar clientes"
            placeholder="Buscar por nombre u objetivo…"
            value={ui.query}
            onChange={(e) => patchUi({ query: e.target.value })}
          />
        </div>
        <div className="filter-tabs">
          {FILTERS.map(([v, t]) => (
            <button
              key={v}
              onClick={() => patchUi({ clientFilter: v })}
              className={ui.clientFilter === v ? 'active' : ''}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="client-grid" id="clientGrid">
        {clients.map((c) => {
          const photo = clientPhotos[c.id]
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
                  aria-label={`Ver ficha de ${c.name}`}
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
                  <b>{progressFor(data, c.id)}%</b>
                </span>
                <span>
                  <small>PLAN MENSUAL</small>
                  <b>{money(c.fee)}</b>
                </span>
                <button
                  className="button dark small"
                  onClick={() => actions.clientDetail(c.id)}
                >
                  Ver ficha
                </button>
              </div>
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
