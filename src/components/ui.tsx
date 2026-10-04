import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

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

export function StatCard({
  label,
  value,
  note,
  ic,
}: {
  label: string
  value: ReactNode
  note: ReactNode
  ic: IconName
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        {label}
        <Icon name={ic} />
      </div>
      <div className="stat-bottom">
        <b>{value}</b>
        <small>{note}</small>
      </div>
    </div>
  )
}

export function LineChart({
  values,
  cls = 'metric-chart',
}: {
  values: number[]
  cls?: string
}) {
  if (!values.length) {
    return (
      <div className="empty-state">Añade mediciones para ver la evolución.</div>
    )
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)
  const x = (i: number) => 15 + (i * 330) / Math.max(values.length - 1, 1)
  const y = (v: number) => 130 - ((v - min) * 100) / range
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg
      className={cls}
      viewBox="0 0 360 160"
      role="img"
      aria-label={`Gráfico: ${values.join(', ')}`}
    >
      <defs>
        <linearGradient id="area">
          <stop stopColor="#c5ff30" stopOpacity={0.8} />
          <stop offset="1" stopColor="#c5ff30" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d="M15 45H345 M15 90H345 M15 130H345"
        stroke="#e6ecdf"
        strokeDasharray="3 4"
      />
      <polygon
        points={`15,150 ${pts} ${values.length > 1 ? 345 : 15},150`}
        fill="url(#area)"
      />
      <polyline
        points={pts}
        fill="none"
        stroke="#9fda18"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="#202a17">
          <title>{v}</title>
        </circle>
      ))}
    </svg>
  )
}
