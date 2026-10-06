import { Icon } from './Icon'
import type { UserAnalyticsRow } from '../lib/cloud'

interface MetricDef {
  key: keyof UserAnalyticsRow
  label: string
  icon: string
  fmt: (v: number) => string
}

const METRICS: MetricDef[] = [
  { key: 'usageSeconds', label: 'Tiempo en la app', icon: 'clock', fmt: (v) => `${Math.round(v / 60)} min` },
  { key: 'clients', label: 'Clientes', icon: 'clients', fmt: (v) => String(v) },
  { key: 'sessions', label: 'Sesiones', icon: 'calendar', fmt: (v) => String(v) },
  { key: 'shares', label: 'Compartidos', icon: 'share', fmt: (v) => String(v) },
  { key: 'reviewsPos', label: 'Reseñas +8', icon: 'star', fmt: (v) => String(v) },
  { key: 'payments', label: 'Pagos', icon: 'wallet', fmt: (v) => String(v) },
]

export function AnalyticsView({ rows }: { rows: UserAnalyticsRow[] }) {
  const byUsage = [...rows].sort((a, b) => Number(b.usageSeconds) - Number(a.usageSeconds))
  const mvp = byUsage[0]

  return (
    <div className="anx">
      <div className="anx-head">
        <div><span className="eyebrow">RENDIMIENTO</span><h2>Analítica de usuarios</h2></div>
        <span className="anx-count">{rows.length} entrenadores</span>
      </div>

      {mvp ? (
        <div className="anx-mvp">
          <span className="anx-mvp-crown">🥇</span>
          <div className="anx-mvp-info">
            <span className="eyebrow">MEJOR RENDIMIENTO</span>
            <b>{mvp.name}</b>
            <small>{Math.round(Number(mvp.usageSeconds) / 60)} min de uso · {mvp.clients} clientes · {mvp.sessions} sesiones</small>
          </div>
          <span className="anx-mvp-tag">#1</span>
        </div>
      ) : null}

      <div className="anx-grid">
        {METRICS.map((m) => {
          const sorted = [...rows].sort((a, b) => Number(b[m.key] ?? 0) - Number(a[m.key] ?? 0))
          const max = Number(sorted[0]?.[m.key] ?? 0) || 1
          return (
            <section className="anx-card" key={String(m.key)}>
              <header className="anx-card-head">
                <span className="anx-card-ic"><Icon name={m.icon} /></span>
                <h3>{m.label}</h3>
              </header>
              <div className="anx-list">
                {sorted.slice(0, 8).map((r, i) => {
                  const val = Number(r[m.key] ?? 0)
                  const pct = Math.max(4, Math.round((val / max) * 100))
                  return (
                    <div className={`anx-row rank-${i + 1}`} key={r.id}>
                      <span className={`anx-pos ${i === 0 ? 'gold' : i < 3 ? 'top' : ''}`}>{i + 1}</span>
                      <div className="anx-row-body">
                        <div className="anx-row-top">
                          <b>{r.name}</b>
                          <span className="anx-val">{m.fmt(val)}</span>
                        </div>
                        <div className="anx-bar"><i style={{ width: `${pct}%` }} /></div>
                      </div>
                    </div>
                  )
                })}
                {!sorted.length ? <p className="anx-empty">Sin datos aún.</p> : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
