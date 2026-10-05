import { useId, type ReactNode } from 'react'

export function PageHead({
  k,
  title,
  sub,
  actions,
}: {
  k: string
  title: ReactNode
  sub: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{k}</span>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {actions ? <div className="head-actions">{actions}</div> : null}
    </div>
  )
}

export function LineChart({
  values,
  cls = 'metric-chart',
  unit = '',
}: {
  values: number[]
  cls?: string
  unit?: string
}) {
  const gradId = useId()
  if (!values.length) {
    return (
      <div className="empty-state">Añade mediciones para ver la evolución.</div>
    )
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)
  const n = values.length
  const x = (i: number) => (n === 1 ? 180 : 32 + (i * 296) / (n - 1))
  const y = (v: number) => 116 - ((v - min) * 82) / range
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`
  return (
    <svg
      className={cls}
      viewBox="0 0 360 150"
      role="img"
      aria-label={`Gráfico: ${values.join(', ')}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#d2ff62" stopOpacity={0.5} />
          <stop offset="1" stopColor="#d2ff62" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d="M32 34H328 M32 75H328 M32 116H328"
        stroke="#4a5058"
        strokeDasharray="3 5"
      />
      <polygon
        className="chart-area"
        points={`32,126 ${pts} ${n > 1 ? 328 : 32},126`}
        fill={`url(#${gradId})`}
      />
      <polyline
        className="chart-line"
        points={pts}
        fill="none"
        stroke="#d2ff62"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => (
        <g
          className="chart-point"
          key={i}
          style={{ animationDelay: `${180 + i * 110}ms` }}
        >
          <circle cx={x(i)} cy={y(v)} r={4.5} fill="#202a17" />
          <text className="chart-value" x={x(i)} y={y(v) - 12} textAnchor="middle">
            {fmt(v)}
          </text>
        </g>
      ))}
    </svg>
  )
}
