import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead, StatCard } from '../components/ui'
import { findClient, longDate, month, paidStatus } from '../lib/utils'
import type { PaymentFilter } from '../types'

const FILTERS: Array<[PaymentFilter, string]> = [
  ['todos', 'Todos'],
  ['pendiente', 'Pendientes'],
  ['pagado', 'Pagados'],
  ['vencido', 'Vencidos'],
]

export function PaymentsPage() {
  const { data, ui, patchUi, stats, money } = useApp()
  const actions = useActions()

  const items = data.payments
    .filter(
      (p) =>
        month(p.due) === ui.expenseMonth &&
        (ui.paymentFilter === 'todos' ||
          paidStatus(p).toLowerCase() === ui.paymentFilter),
    )
    .sort((a, b) => a.due.localeCompare(b.due))

  return (
    <>
      <PageHead
        k="ORDEN EN TUS COBROS."
        title={
          <>
            Cada esfuerzo cuenta<span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Mensualidades, vencimientos y pagos registrados."
        actions={
          <button className="button primary" onClick={actions.newPayment}>
            <Icon name="plus" />
            Registrar pago
          </button>
        }
      />
      <div className="stats-row">
        <StatCard label="Cobrado este mes" value={money(stats.monthIncome)} note="Recibido" ic="wallet" />
        <StatCard label="Por cobrar" value={money(stats.pending)} note="Todos los meses" ic="clock" />
        <StatCard label="Pagos vencidos" value={stats.late} note="Revisar fechas" ic="calendar" />
        <StatCard label="Clientes activos" value={stats.active} note="Planes activos" ic="users" />
      </div>
      <div className="toolbar">
        <div className="filter-tabs">
          {FILTERS.map(([v, t]) => (
            <button
              key={v}
              onClick={() => patchUi({ paymentFilter: v })}
              className={ui.paymentFilter === v ? 'active' : ''}
            >
              {t}
            </button>
          ))}
        </div>
        <label style={{ margin: 0, color: '#b8c4b1' }}>
          Mes de vencimiento{' '}
          <input
            id="paymentMonth"
            type="month"
            aria-label="Mes de vencimiento"
            value={ui.expenseMonth}
            style={{ width: 175, marginLeft: 8 }}
            onChange={(e) => {
              if (e.target.value) patchUi({ expenseMonth: e.target.value })
            }}
          />
        </label>
      </div>
      <div className="card white table-wrap">
        <table>
          <thead>
            <tr>
              <th>CLIENTE</th>
              <th>IMPORTE</th>
              <th>VENCIMIENTO</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const client = findClient(data, p.client)
              return (
                <tr key={p.id}>
                  <td>
                    <div className="table-person">
                      <Avatar client={client} />
                      <span>{client.name}</span>
                    </div>
                  </td>
                  <td className="amount-cell">{money(p.amount)}</td>
                  <td>{longDate(p.due)}</td>
                  <td>
                    <span className={`pill ${p.paid ? 'green' : 'orange'}`}>
                      {paidStatus(p)}
                    </span>
                  </td>
                  <td>
                    {!p.paid ? (
                      <button
                        className="button dark small"
                        onClick={() => actions.receivePayment(p.id)}
                      >
                        Registrar recibido
                      </button>
                    ) : null}
                    <button
                      className="table-open"
                      onClick={() => actions.editPayment(p.id)}
                      aria-label={`Editar pago de ${client.name}`}
                    >
                      ↗
                    </button>
                  </td>
                </tr>
              )
            })}
            {!items.length ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  No hay pagos con este filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="subtle" style={{ marginTop: 15 }}>
        Este registro lleva el control de cobros; no procesa transferencias ni
        cargos bancarios.
      </p>
    </>
  )
}
