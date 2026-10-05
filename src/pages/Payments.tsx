import { useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { useActions } from '../hooks/useActions'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { PageHead } from '../components/ui'
import { findClient, iso, longDate, month, paidStatus, parseDate, TODAY, exportPaymentsPdf } from '../lib/utils'
import type { PaymentFilter } from '../types'

const FILTERS: Array<[PaymentFilter, string]> = [
  ['todos', 'Todos'], ['pendiente', 'Pendientes'], ['pagado', 'Pagados'], ['vencido', 'Vencidos'],
]

export function PaymentsPage() {
  const { data, ui, patchUi, money, commit, toast } = useApp()
  const actions = useActions()
  const [editing, setEditing] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const allMonth = data.payments.filter(p => month(p.due) === ui.expenseMonth)
  const items = allMonth.filter(p => (!selectedDay || p.due === selectedDay) && (ui.paymentFilter === 'todos' || paidStatus(p).toLowerCase() === ui.paymentFilter)).sort((a,b) => a.due.localeCompare(b.due))
  const received = allMonth.filter(p => p.paid).reduce((n,p) => n + Number(p.amount), 0)
  const pending = allMonth.filter(p => !p.paid).reduce((n,p) => n + Number(p.amount), 0)
  const overdue = allMonth.filter(p => paidStatus(p) === 'Vencido').length
  const firstDay = parseDate(`${ui.expenseMonth}-01`)
  const offset = (firstDay.getDay() + 6) % 7
  const days = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((offset + days) / 7) * 7
  function changeMonth(n: number) { const d = parseDate(`${ui.expenseMonth}-01`); d.setMonth(d.getMonth() + n); patchUi({expenseMonth: month(iso(d))}); setSelectedDay(null) }

  function saveMonth() {
    if (!exportPaymentsPdf(data, ui.expenseMonth)) toast('Permite las ventanas emergentes para guardar el PDF.')
    else toast('Elige "Guardar como PDF" en el diálogo de impresión.')
  }

  function save(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>
    const amount = Number(x.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !x.due) { toast('Indica un importe y una fecha válidos.'); return }
    commit(d => { const p = d.payments.find(item => item.id === id); if (p) { p.amount = amount; p.due = x.due; p.paid = x.paid === 'yes'; p.paidDate = p.paid ? (p.paidDate || TODAY) : ''; p.method = x.method; p.note = x.note.trim() } })
    setEditing(null)
    toast('Pago actualizado.')
  }

  return <>
    <PageHead k="TUS COBROS, EN ORDEN." title={<>Pagos<span style={{color:'var(--lime)'}}>.</span></>} sub="Ve lo recibido, encuentra pendientes y edita cada registro aquí mismo." actions={<><button className="button" onClick={saveMonth}><Icon name="download" /> Registro del mes</button><button className="button primary" onClick={actions.newPayment}><Icon name="plus" /> Nuevo pago</button></>} />
    <section className="payment-overview" aria-label="Resumen de pagos del mes">
      <div className="payment-summary featured"><span>Recibido este mes</span><strong>{money(received)}</strong><small>{allMonth.filter(p => p.paid).length} pagos registrados</small><div className="payment-progress"><i style={{width: `${received + pending ? received / (received + pending) * 100 : 0}%`}} /></div></div>
      <div className="payment-summary"><span>Por cobrar</span><strong>{money(pending)}</strong><small>{allMonth.filter(p => !p.paid).length} pendientes</small></div>
      <div className="payment-summary"><span>Vencidos</span><strong>{overdue}</strong><small>{overdue === 1 ? 'Pago por revisar' : 'Pagos por revisar'}</small></div>
    </section>
    <section className="payment-calendar calendar-dark calm-calendar" aria-label="Calendario de pagos">
      <div className="payment-calendar-head"><div><span className="eyebrow">VENCIMIENTOS DEL MES</span><h2>{longDate(`${ui.expenseMonth}-01`, {month:'long',year:'numeric'})}</h2></div><div className="calendar-controls"><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Mes anterior">‹</button><button className="button light small" onClick={() => {patchUi({expenseMonth:month(TODAY)});setSelectedDay(null)}}>Este mes</button><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Mes siguiente">›</button></div></div>
      <div className="payment-calendar-legend"><span><i className="payment-calendar-dot due" /> Pendiente</span><span><i className="payment-calendar-dot paid" /> Pagado</span></div>
      <div className="calendar-month">{['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map(x => <div key={x} className={`weekday ${x === 'SÁB' ? 'saturday' : ''}`}>{x}</div>)}{Array.from({length:cells},(_,i) => { const n=i-offset+1; if(n<1||n>days) return <div className="month-cell empty" key={`empty-${i}`} aria-hidden="true" />; const day=`${ui.expenseMonth}-${String(n).padStart(2,'0')}`; const due=allMonth.filter(p => p.due===day); return <button key={day} className={`month-cell ${day===TODAY?'today':''} ${selectedDay===day?'selected':''} ${i%7===5?'saturday':''}`} aria-label={`${longDate(day)}: ${due.length} pagos`} aria-pressed={selectedDay===day} onClick={() => setSelectedDay(selectedDay===day?null:day)}><strong>{n}</strong>{due.length>0 && <span className="calendar-day-dots" aria-hidden="true">{due.some(p=>!p.paid)&&<i className="payment-calendar-dot due" />}{due.some(p=>p.paid)&&<i className="payment-calendar-dot paid" />}</span>}</button>})}</div>
      <p className="calendar-help">{selectedDay ? `Mostrando pagos del ${longDate(selectedDay)}.` : 'Selecciona un día para ver sus pagos.'} {selectedDay && <button onClick={() => setSelectedDay(null)}>Ver todo el mes</button>}</p>
    </section>
    <div className="payment-controls"><div className="payment-filters" role="group" aria-label="Filtrar pagos">{FILTERS.map(([v,t]) => <button key={v} className={ui.paymentFilter === v ? 'active' : ''} onClick={() => patchUi({paymentFilter:v})} aria-pressed={ui.paymentFilter === v}>{t}</button>)}</div></div>
    <section className="payment-list" aria-label="Registros de pago">{items.map(p => { const client = findClient(data,p.client); const open = editing === p.id; return <article className={`payment-item ${open ? 'editing' : ''}`} key={p.id}><div className="payment-item-main"><Avatar client={client} /><div className="payment-person"><strong>{client.name}</strong><span>Vence {longDate(p.due)}{p.paid && p.paidDate ? ` · Recibido ${longDate(p.paidDate)}` : ''}</span></div><div className="payment-item-amount"><strong>{money(p.amount)}</strong><span className={`payment-status ${paidStatus(p).toLowerCase()}`}>{paidStatus(p)}</span></div><div className="payment-item-actions">{!p.paid && <button className="quick-receive" onClick={() => { commit(d => { const target = d.payments.find(x => x.id === p.id); if (target) { target.paid = true; target.paidDate = TODAY } }); toast('Pago marcado como recibido.') }}>Marcar recibido</button>}<button className="payment-edit" onClick={() => setEditing(open ? null : p.id)} aria-expanded={open} aria-label={`Editar pago de ${client.name}`}><Icon name="edit" /> <span>{open ? 'Cerrar' : 'Editar'}</span></button></div></div>{open && <form className="payment-inline-form" onSubmit={e => save(e,p.id)}><label>Importe<input name="amount" type="number" min="0.01" step="0.01" defaultValue={p.amount} required /></label><label>Vencimiento<input name="due" type="date" defaultValue={p.due} required /></label><label>Estado<select name="paid" defaultValue={p.paid ? 'yes' : 'no'}><option value="no">Pendiente</option><option value="yes">Pagado</option></select></label><label>Método<select name="method" defaultValue={p.method}><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Otro</option></select></label><label className="payment-note">Nota<input name="note" defaultValue={p.note} maxLength={300} /></label><div className="payment-form-actions"><button type="button" className="button" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="button primary">Guardar cambios</button></div></form>}</article> })}{!items.length && <div className="payment-empty"><h2>Sin pagos en esta vista</h2><p>Cambia el mes o el filtro para encontrar otros registros.</p><button className="button primary" onClick={actions.newPayment}>Crear pago</button></div>}</section>
    <p className="payment-footnote">Registro local de cobros. No procesa transferencias ni cargos bancarios.</p>
  </>
}
