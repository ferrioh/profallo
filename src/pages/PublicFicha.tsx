import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { readShareFicha, longDate, type ShareFichaPayload } from '../lib/utils'

export function PublicFicha() {
  const [ficha, setFicha] = useState<ShareFichaPayload | null>(() => readShareFicha(location.hash))

  useEffect(() => {
    const onHash = () => setFicha(readShareFicha(location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (!ficha) {
    return (
      <div className="public-ficha">
        <div className="ficha-card">
          <h1>Ficha no disponible</h1>
          <p className="muted">El link no es válido o está incompleto.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="public-ficha">
      <div className="ficha-card">
        <div className="ficha-brand"><span className="brand-mark">p</span>profallo</div>
        <span className="eyebrow">FICHA DEL CLIENTE</span>
        <h1>{ficha.n}</h1>
        <p className="muted">{ficha.g}{ficha.gym ? ` · ${ficha.gym}` : ''}</p>

        <h2><Icon name="dumbbell" /> Próximo entrenamiento</h2>
        {ficha.next ? (
          <div className="ficha-next">
            <b>{ficha.next.title}</b>
            <span>{longDate(ficha.next.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {ficha.next.time} ({ficha.next.duration} min)</span>
            {ficha.next.routine ? <small>Rutina: {ficha.next.routine}</small> : null}
          </div>
        ) : (
          <p className="muted">Sin sesión programada.</p>
        )}

        <h2><Icon name="chart" /> Peso y evolución</h2>
        <div className="ficha-weight">{ficha.w} <small>kg</small></div>
        {ficha.ms.length ? (
          <table className="ficha-table">
            <thead><tr><th>Fecha</th><th>Peso</th><th>Cintura</th><th>Grasa</th></tr></thead>
            <tbody>
              {ficha.ms.map((m) => (
                <tr key={m.d}><td>{longDate(m.d)}</td><td>{m.w} kg</td><td>{m.wa ?? '—'} cm</td><td>{m.f ?? '—'}%</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Aún no hay mediciones.</p>
        )}

        <h2><Icon name="edit" /> Información y notas</h2>
        <p className="ficha-notes">{ficha.notes || 'Sin observaciones.'}</p>

        <footer className="ficha-foot">Preparado por {ficha.coach} · Profallo</footer>
      </div>
    </div>
  )
}
