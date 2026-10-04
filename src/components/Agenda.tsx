import type { AppData } from '../types'
import { findClient } from '../lib/utils'
import { Icon } from './Icon'

interface AgendaEvent {
  id: string
  client: string
  title: string
  time: string
  kind: 'session' | 'payment'
  amount?: number
  duration?: number
  status?: string
}

export function Agenda({
  day,
  data,
  money,
  limit = 99,
  onOpen,
}: {
  day: string
  data: AppData
  money: (n: number | string) => string
  limit?: number
  onOpen: (kind: 'session' | 'payment', id: string) => void
}) {
  const events: AgendaEvent[] = [
    ...data.sessions
      .filter((s) => s.date === day && s.status !== 'Cancelada')
      .map((s) => ({
        id: s.id,
        client: s.client,
        title: s.title,
        time: s.time,
        duration: s.duration,
        status: s.status,
        kind: 'session' as const,
      })),
    ...data.payments
      .filter((p) => p.due === day && !p.paid)
      .map((p) => ({
        id: p.id,
        client: p.client,
        title: 'Vence mensualidad',
        time: 'Pago',
        amount: p.amount,
        kind: 'payment' as const,
      })),
  ].sort((a, b) => a.time.localeCompare(b.time))

  if (!events.length) {
    return (
      <div className="empty-state">
        Un poco de espacio libre.
        <br />
        Programa una sesión o un próximo pago.
      </div>
    )
  }

  return (
    <>
      {events.slice(0, limit).map((e) => {
        const client = findClient(data, e.client)
        return (
          <div className="agenda-item" key={`${e.kind}-${e.id}`}>
            <span className="agenda-time">{e.time}</span>
            <span className="agenda-marker" />
            <div>
              <b>{client.name}</b>
              <small>
                {e.title}
                {' · '}
                {e.kind === 'payment' ? (
                  money(e.amount ?? 0)
                ) : (
                  <>
                    {e.duration} min · {e.status}
                  </>
                )}
              </small>
            </div>
            <button
              className="icon-button"
              onClick={() => onOpen(e.kind, e.id)}
              aria-label={`Ver ${e.kind === 'payment' ? 'pago' : 'sesión'} de ${
                client.name
              }`}
            >
              <Icon name="chevron" />
            </button>
          </div>
        )
      })}
    </>
  )
}
