import type { AppData } from '../types'
import { addDays, longDate, parseDate, shortWeekday } from '../lib/utils'

export function WeekStrip({
  selected,
  data,
  onSelect,
}: {
  selected: string
  data: AppData
  onSelect: (day: string) => void
}) {
  const d = parseDate(selected)
  const monday = addDays(selected, -((d.getDay() + 6) % 7))
  return (
    <div className="calendar-week">
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i)
        const has =
          data.sessions.some((s) => s.date === day) ||
          data.payments.some((p) => p.due === day)
        return (
          <button
            key={day}
            className={`day-pill ${day === selected ? 'selected' : ''} ${
              has ? 'has-event' : ''
            }`}
            onClick={() => onSelect(day)}
            aria-label={`Ver ${longDate(day)}`}
            aria-pressed={day === selected}
          >
            <span>{shortWeekday(day)}</span>
            <strong>{parseDate(day).getDate()}</strong>
          </button>
        )
      })}
    </div>
  )
}
