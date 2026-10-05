import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from './Icon'
import { PLANS, PREMIUM_PRICE, TRIAL_DAYS } from '../lib/plans'
import { TODAY, uid } from '../lib/utils'

const METHODS = ['Transferencia', 'Tarjeta', 'Efectivo', 'Otro']

export function Paywall() {
  const { commit, leave } = useApp()
  const [method, setMethod] = useState('Transferencia')
  const premium = PLANS.premium

  function pay() {
    commit((d) => {
      d.profile.membership = 'premium'
      d.profile.verified = true
      if (!d.membershipPayments) d.membershipPayments = []
      d.membershipPayments.unshift({
        id: uid(),
        amount: PREMIUM_PRICE,
        date: TODAY,
        period: TODAY.slice(0, 7),
        method,
      })
      if (d.trainers && d.profile.email) {
        const me = d.trainers.find((t) => t.email === d.profile.email)
        if (me) {
          me.membership = 'premium'
          me.verified = true
        }
      }
    })
  }

  return (
    <div className="paywall">
      <div className="paywall-card">
        <span className="verified verified-xl"><Icon name="check" /></span>
        <span className="eyebrow">PRUEBA FINALIZADA</span>
        <h1>Tus {TRIAL_DAYS} días gratis terminaron.</h1>
        <p className="paywall-sub">
          Disfrutaste todo incluido. Para seguir usando Profallo activa <b>Premium</b> por{' '}
          <b>${PREMIUM_PRICE} USD/mes</b>.
        </p>
        <ul className="plan-features big paywall-benefits">
          {premium.features.map((f) => (
            <li key={f}><Icon name="check" /> {f}</li>
          ))}
        </ul>
        <label className="paywall-method">
          Método de pago
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button className="button primary paywall-pay" onClick={pay}>
          <Icon name="check" /> Pagar ${PREMIUM_PRICE} y activar Premium
        </button>
        <button className="paywall-leave" onClick={leave}>Salir por ahora</button>
      </div>
    </div>
  )
}
