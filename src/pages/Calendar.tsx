import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { Agenda } from '../components/Agenda'
import { iso, longDate, month, parseDate, TODAY } from '../lib/utils'

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

export function CalendarPage() {
  const { data, ui, patchUi, money } = useApp()
  const actions = useActions()

  const first = parseDate(`${ui.calendarMonth}-01`)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((offset + days) / 7) * 7
  const monthSessions = data.sessions.filter(s => month(s.date) === ui.calendarMonth && s.status !== 'Cancelada').length
  const daySessions = data.sessions.filter(s => s.date === ui.calendarDate && s.status !== 'Cancelada')
  const dayClients = new Set(daySessions.map(s => s.client)).size
  const monthTitle = longDate(`${ui.calendarMonth}-01`, { month: 'long', year: 'numeric' })
  const dayTitle = longDate(ui.calendarDate, {weekday: 'long', day: 'numeric', month: 'long'})

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
          <button className="button primary" onClick={() => actions.newSession()}>
            <Icon name="plus" />
            Nueva sesión
          </button>
        }
      />
      <div className="calendar-layout calm-calendar">
        <div className="card calendar-dark calendar-main">
          <div className="card-head">
            <div><span className="eyebrow">VISTA MENSUAL</span><h2 className="calendar-title">
              {monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)}
            </h2></div>
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
          <div className="calendar-month-summary"><span><i className="session-dot" /> {monthSessions} sesiones</span></div>
          <div className="calendar-month">
            {WEEKDAYS.map((x) => (
              <div className={`weekday ${x === 'SÁB' ? 'saturday' : ''}`} key={x}>
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
              return (
                <button
                  key={day}
                  className={`month-cell ${
                    day === TODAY ? 'today' : ''
                  } ${day === ui.calendarDate ? 'selected' : ''} ${((i % 7) === 5) ? 'saturday' : ''}`}
                  onClick={() => actions.selectDay(day)}
                  aria-label={`${longDate(day)}: ${ses.length} sesiones`}
                  aria-pressed={day === ui.calendarDate}
                >
                  <strong>{n}</strong>
                  {ses.length ? <span className="calendar-day-dots" aria-hidden="true"><i className="session-dot" /></span> : null}
                </button>
              )
            })}
          </div>
          <p className="calendar-help">Selecciona un día para ver sus actividades.</p>
        </div>
        <div className="card calendar-dark calendar-agenda">
          <span className="eyebrow">AGENDA DEL DÍA</span>
          <h2>{dayTitle.charAt(0).toUpperCase() + dayTitle.slice(1)}</h2>
          <div className="calendar-day-stats" aria-label="Resumen del día">
            <div><Icon name="calendar" /><strong>{daySessions.length}</strong><span>Sesiones</span></div>
            <div><Icon name="users" /><strong>{dayClients}</strong><span>Clientes</span></div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Agenda
              day={ui.calendarDate}
              data={data}
              money={money}
              onOpen={(kind, id) => {
                if (kind === 'payment') actions.editPayment(id)
                else actions.focusSession(id)
              }}
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
