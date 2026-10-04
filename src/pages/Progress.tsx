import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead, LineChart } from '../components/ui'
import { findClient, findRoutine, longDate, progressFor } from '../lib/utils'

export function ProgressPage() {
  const { data, ui, patchUi } = useApp()
  const actions = useActions()
  const active = data.clients.filter((c) => !c.archived)
  const client = findClient(data, ui.progressClient)
  const ms = data.measurements
    .filter((m) => m.client === client.id)
    .sort((a, b) => a.date.localeCompare(b.date))
  const last = ms.at(-1)
  const first = ms[0]
  const routine = findRoutine(data, client.routine)
  const delta =
    last && first ? (last.weight - first.weight).toFixed(1) : null

  return (
    <>
      <PageHead
        k="PROGRESO MÁS ALLÁ DEL PESO."
        title={
          <>
            Pequeños pasos. Grandes cambios
            <span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Mediciones y observaciones para seguir cada proceso."
        actions={
          <button className="button primary" onClick={actions.newMeasurement}>
            <Icon name="plus" />
            Añadir medición
          </button>
        }
      />
      <div className="toolbar">
        <label style={{ color: '#b9c4b3', margin: 0 }}>
          Cliente{' '}
          <select
            id="progressSelect"
            style={{ width: 260, marginLeft: 10 }}
            value={client.id}
            onChange={(e) => patchUi({ progressClient: e.target.value })}
          >
            {active.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <span className="subtle">{ms.length} mediciones registradas</span>
      </div>
      <div className="main-grid">
        <section className="card white">
          <div className="card-head">
            <div>
              <span className="eyebrow" style={{ color: '#687b59' }}>
                EVOLUCIÓN DEL PESO
              </span>
              <h2>{last ? `${last.weight} kg` : 'Sin mediciones'}</h2>
            </div>
            <span className="pill green">
              {delta
                ? `${delta} kg desde inicio`
                : 'Punto de partida'}
            </span>
          </div>
          <LineChart values={ms.map((m) => Number(m.weight))} />
          <div className="metric-labels">
            <span>{ms.length ? longDate(ms[0].date) : 'Inicio'}</span>
            <span>{ms.length ? longDate(ms[ms.length - 1].date) : 'Hoy'}</span>
          </div>
          <div className="mini-summary">
            <div>
              Cintura<b>{last?.waist ? `${last.waist} cm` : '—'}</b>
            </div>
            <div>
              Grasa corporal<b>{last?.fat ? `${last.fat}%` : '—'}</b>
            </div>
            <div>
              Asistencia<b>{progressFor(data, client.id)}%</b>
            </div>
          </div>
          <span className="chart-legend">
            <i />
            Peso registrado · kg
          </span>
        </section>
        <section className="card">
          <div className="detail-title">
            <Avatar client={client} />
            <div>
              <h2>{client.name}</h2>
              <p className="subtle" style={{ marginTop: 5 }}>
                {client.goal}
              </p>
            </div>
          </div>
          <span className="eyebrow">OBSERVACIONES DEL ENTRENADOR</span>
          <p className="notes">
            {client.notes || 'Añade observaciones en la ficha del cliente.'}
          </p>
          <div style={{ marginTop: 24 }}>
            <span className="eyebrow">RUTINA ASIGNADA</span>
            <h3>{routine?.name || 'Sin rutina asignada'}</h3>
          </div>
          <button
            className="button small"
            style={{ marginTop: 24 }}
            onClick={() => actions.clientDetail(client.id)}
          >
            Abrir ficha <Icon name="arrow" />
          </button>
        </section>
      </div>
      <div className="card white table-wrap" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h3>Historial de mediciones</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>FECHA</th>
              <th>PESO</th>
              <th>CINTURA</th>
              <th>GRASA</th>
              <th>OBSERVACIÓN</th>
            </tr>
          </thead>
          <tbody>
            {[...ms].reverse().map((m) => (
              <tr key={m.id}>
                <td>{longDate(m.date)}</td>
                <td>{m.weight} kg</td>
                <td>{m.waist ? `${m.waist} cm` : '—'}</td>
                <td>{m.fat ? `${m.fat}%` : '—'}</td>
                <td>{m.note}</td>
              </tr>
            ))}
            {!ms.length ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  Todavía no hay mediciones.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
