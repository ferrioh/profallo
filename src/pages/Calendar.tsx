import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { Agenda } from '../components/Agenda'
import { findClient, iso, longDate, month, parseDate, TODAY } from '../lib/utils'

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

export function CalendarPage() {
  const { data, ui, patchUi, money } = useApp()
  const actions = useActions()

  const first = parseDate(`${ui.calendarMonth}-01`)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((offset + days) / 7) * 7

  const changeMonth = (n: number) => {
    const d = parseDate(`${ui.calendarMonth}-01`)
    d.setMonth(d.getMonth() + n)
    patchUi({ calendarMonth: month(iso(d)) })
  }

  return (
    <>
      <PageHead
        k="CADA DÍA CUENTA."
        title={
          <>
            Tu calendario<span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Entrenamientos y vencimientos, sin perder nada de vista."
        actions={
          <>
            <button className="button" onClick={actions.newPayment}>
              <Icon name="plus" />
              Registrar pago
            </button>
            <button className="button primary" onClick={() => actions.newSession()}>
              <Icon name="plus" />
              Nueva sesión
            </button>
          </>
        }
      />
      <div className="calendar-layout">
        <div className="card white">
          <div className="card-head">
            <h2 className="calendar-title">
              {longDate(`${ui.calendarMonth}-01`, {
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <div className="calendar-controls">
              <button
                className="icon-button"
                onClick={() => changeMonth(-1)}
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <button
                className="button light small"
                onClick={() =>
                  patchUi({ calendarMonth: month(TODAY), calendarDate: TODAY })
                }
              >
                Hoy
              </button>
              <button
                className="icon-button"
                onClick={() => changeMonth(1)}
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>
          </div>
          <div className="calendar-month">
            {WEEKDAYS.map((x) => (
              <div className="weekday" key={x}>
                {x}
              </div>
            ))}
            {Array.from({ length: cells }, (_, i) => {
              const n = i - offset + 1
              if (n < 1 || n > days)
                return (
                  <div
                    className="month-cell empty"
                    aria-hidden="true"
                    key={`empty-${i}`}
                  />
                )
              const day = `${ui.calendarMonth}-${String(n).padStart(2, '0')}`
              const ses = data.sessions.filter(
                (s) => s.date === day && s.status !== 'Cancelada',
              )
              const pay = data.payments.filter(
                (p) => p.due === day && !p.paid,
              )
              return (
                <button
                  key={day}
                  className={`month-cell ${
                    day === TODAY ? 'today' : ''
                  } ${day === ui.calendarDate ? 'selected' : ''}`}
                  onClick={() => actions.selectDay(day)}
                  aria-label={`${longDate(day)}: ${ses.length} sesiones y ${pay.length} pagos`}
                >
                  <strong>{n}</strong>
                  {ses.slice(0, 2).map((s) => (
                    <span className="cal-event" key={s.id}>
                      {s.time}{' '}
                      <span className="event-name">
                        {findClient(data, s.client).name.split(' ')[0]}
                      </span>
                    </span>
                  ))}
                  {pay.length ? (
                    <span className="cal-event payment">
                      {money(
                        pay.reduce((acc, p) => acc + Number(p.amount), 0),
                      )}
                    </span>
                  ) : null}
                  {ses.length > 2 ? (
                    <span className="month-mobile">+{ses.length - 2}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <p className="form-hint" style={{ marginTop: 15 }}>
            Verde claro: sesiones · Oscuro: pagos por vencer. Selecciona un día
            para ver el detalle.
          </p>
        </div>
        <div className="card white">
          <span className="eyebrow" style={{ color: '#687d58' }}>
            {longDate(ui.calendarDate, { weekday: 'long' }).toUpperCase()}
          </span>
          <h2>{longDate(ui.calendarDate)}</h2>
          <div style={{ marginTop: 18 }}>
            <Agenda
              day={ui.calendarDate}
              data={data}
              money={money}
              onOpen={(kind, id) =>
                kind === 'payment'
                  ? actions.editPayment(id)
                  : actions.editSession(id)
              }
            />
          </div>
          <button
            className="button dark"
            style={{ marginTop: 18, width: '100%' }}
            onClick={() => actions.newSession(ui.calendarDate)}
          >
            <Icon name="plus" />
            Agendar aquí
          </button>
        </div>
      </div>
    </>
  )
}
