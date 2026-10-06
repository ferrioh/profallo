import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { PLANS, PREMIUM_PRICE, TRIAL_DAYS, planOf, trainerStatus, trialDaysLeft } from '../lib/plans'
import { isSupabaseEnabled } from '../lib/supabase'
import {
  listMembershipPayments,
  listTrainers,
  recordMembershipPayment,
  setTrainerMembership,
  setTrainerRole,
  setTrainerTrial,
  type MembershipPaymentRow,
  type TrainerRow,
} from '../lib/backend'
import { addDays, iso, longDate, month, parseDate, TODAY } from '../lib/utils'
import { currentAccount, setAccountRole, setAccountStatus, useAccounts, useAuthVersion } from '../lib/auth'
import {
  cloudApprovePremium,
  cloudDeleteAccount,
  cloudGetAppSettings,
  cloudListBackups,
  cloudListPremiumRequests,
  cloudRestoreBackup,
  type BackupRow,
  cloudListProfiles,
  cloudRejectPremium,
  cloudSaveAppSettings,
  cloudSetProfileRole,
  cloudSetProfileStatus,
  type AppSettings,
  type CloudProfileRow,
  type PremiumRequestRow,
} from '../lib/cloud'
import type { Trainer } from '../types'

type Tab = 'resumen' | 'cuentas' | 'socios' | 'premium' | 'pagos' | 'respaldo' | 'redes'

const TABS: Array<[Tab, string, string]> = [
  ['resumen', 'Resumen', 'grid'],
  ['cuentas', 'Cuentas', 'users'],
  ['socios', 'Premium', 'star'],
  ['premium', 'Pagos', 'wallet'],
  ['pagos', 'Datos de pago', 'wallet'],
  ['respaldo', 'Respaldos', 'download'],
  ['redes', 'Redes', 'share'],
]

export function AdminPage() {
  const { data, commit, money, toast, cloudEnabled, cloudProfile } = useApp()
  useAuthVersion()
  const account = currentAccount()
  const isAdmin = cloudEnabled
    ? cloudProfile?.role === 'admin'
    : (account?.role ?? data.profile.role) === 'admin'
  const accounts = useAccounts()
  const [tab, setTab] = useState<Tab>('resumen')
  const [cloudAccounts, setCloudAccounts] = useState<CloudProfileRow[] | null>(null)
  const [premiumReqs, setPremiumReqs] = useState<PremiumRequestRow[] | null>(null)
  const [paySettings, setPaySettings] = useState<AppSettings>({ pay_pagomovil: '', pay_binance: '', pay_zelle: '', backup_enabled: true })
  const [remote, setRemote] = useState<TrainerRow[] | null>(null)
  const [backups, setBackups] = useState<BackupRow[] | null>(null)
  const [membershipPays, setMembershipPays] = useState<MembershipPaymentRow[]>([])
  const [premMonth, setPremMonth] = useState(month(TODAY))
  const nowMonth = month(TODAY)
  const cloudList = cloudAccounts ?? []
  const freeAccs = cloudList.filter((a) => a.membership !== 'premium')
  const premAccs = cloudList.filter((a) => a.membership === 'premium')

  useEffect(() => {
    if (!cloudEnabled) return
    let alive = true
    cloudListProfiles().then((rows) => { if (alive) setCloudAccounts(rows) })
    cloudListPremiumRequests().then((rows) => { if (alive) setPremiumReqs(rows) })
    cloudGetAppSettings().then((s) => { if (alive && s) setPaySettings(s) })
    cloudListBackups().then((rows) => { if (alive) setBackups(rows) })
    listMembershipPayments().then((rows) => { if (alive) setMembershipPays(rows ?? []) })
    return () => { alive = false }
  }, [cloudEnabled])

  useEffect(() => {
    if (!isSupabaseEnabled || !isAdmin) return
    let alive = true
    listTrainers().then((rows) => { if (alive) setRemote(rows) })
    return () => { alive = false }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <section className="admin-locked card white">
        <h2>Acceso restringido</h2>
        <p>Solo el administrador puede ver este panel.</p>
      </section>
    )
  }

  const trainers: Trainer[] = remote
    ? remote.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email ?? '',
        specialty: r.specialty ?? '',
        membership: r.membership,
        verified: r.verified,
        role: r.role,
        activeClients: 0,
        joined: (r.created_at ?? '').slice(0, 10),
        trialStart: r.trial_start ?? undefined,
      }))
    : data.trainers ?? []

  const premiumCount = trainers.filter((t) => t.membership === 'premium').length
  const trialCount = trainers.filter((t) => trainerStatus(t) === 'trial').length
  const expiredCount = trainers.filter((t) => trainerStatus(t) === 'expired').length
  const totalClients = trainers.reduce((n, t) => n + Number(t.activeClients || 0), 0)
  const monthlyRevenue = premiumCount * PREMIUM_PRICE

  /* ---------- Calendario de pagos Premium ---------- */
  const lastPay = new Map<string, string>()
  membershipPays.forEach((p) => {
    if (!p.paid_date) return
    const cur = lastPay.get(p.trainer_id)
    if (!cur || p.paid_date > cur) lastPay.set(p.trainer_id, p.paid_date)
  })
  const dueList: Array<{ id: string; name: string; due: string; plan: 'free' | 'premium' }> = (cloudEnabled
    ? (cloudAccounts ?? []).map((a) => ({ id: a.id, name: a.name, start: a.trial_start ?? TODAY, membership: a.membership }))
    : trainers.map((t) => ({ id: t.id, name: t.name, start: t.trialStart ?? TODAY, membership: t.membership }))
  ).map((t) => {
    const due = t.membership === 'premium'
      ? addDays(lastPay.get(t.id) || t.start, 30)
      : addDays(t.start, TRIAL_DAYS)
    return { id: t.id, name: t.name, due, plan: t.membership }
  })

  const first = parseDate(`${premMonth}-01`)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  const dueByDay = new Map<string, typeof dueList>()
  dueList.forEach((d) => {
    if (month(d.due) !== premMonth) return
    const arr = dueByDay.get(d.due) ?? []
    arr.push(d)
    dueByDay.set(d.due, arr)
  })
  const monthDue = dueList.filter((d) => month(d.due) === premMonth).sort((a, b) => a.due.localeCompare(b.due))

  function changePremMonth(n: number) {
    const d = parseDate(`${premMonth}-01`)
    d.setMonth(d.getMonth() + n)
    setPremMonth(month(iso(d)))
  }

  /* ---------- Acciones ---------- */
  function togglePlan(t: Trainer) {
    const next: 'free' | 'premium' = t.membership === 'premium' ? 'free' : 'premium'
    if (remote) {
      setTrainerMembership(t.id, next).then((ok) => {
        if (!ok) { toast('No se pudo actualizar en Supabase.'); return }
        if (next === 'premium') recordMembershipPayment(t.id, nowMonth)
        setRemote((prev) => prev?.map((r) => (r.id === t.id ? { ...r, membership: next, verified: next === 'premium' } : r)) ?? null)
        toast(next === 'premium' ? 'Premium activado y cobro registrado.' : 'Cambiado a plan Normal.')
      })
      return
    }
    commit((d) => {
      const target = (d.trainers ?? []).find((x) => x.id === t.id)
      if (target) { target.membership = next; target.verified = next === 'premium' }
    })
    toast(next === 'premium' ? `Premium activado · ${money(PREMIUM_PRICE)}/mes.` : 'Cambiado a plan Normal.')
  }

  function toggleRole(t: Trainer) {
    const next: 'trainer' | 'admin' = t.role === 'admin' ? 'trainer' : 'admin'
    if (remote) {
      setTrainerRole(t.id, next).then((ok) => {
        if (ok) setRemote((prev) => prev?.map((r) => (r.id === t.id ? { ...r, role: next } : r)) ?? null)
      })
      return
    }
    commit((d) => {
      const target = (d.trainers ?? []).find((x) => x.id === t.id)
      if (target) target.role = next
    })
  }

  function resetTrial(t: Trainer) {
    if (remote) {
      setTrainerTrial(t.id, TODAY).then((ok) => {
        if (ok) setRemote((prev) => prev?.map((r) => (r.id === t.id ? { ...r, trial_start: TODAY } : r)) ?? null)
      })
      return
    }
    commit((d) => {
      const target = (d.trainers ?? []).find((x) => x.id === t.id)
      if (target) target.trialStart = TODAY
    })
    toast(`Prueba reiniciada · ${TRIAL_DAYS} días.`)
  }

  function setCloudStatus(id: string, status: CloudProfileRow['status']) {
    cloudSetProfileStatus(id, status).then((ok) => {
      if (ok) setCloudAccounts((prev) => prev?.map((a) => (a.id === id ? { ...a, status } : a)) ?? null)
      toast(status === 'approved' ? 'Acceso permitido.' : 'Acceso denegado.')
    })
  }

  function setCloudRole(id: string, role: CloudProfileRow['role']) {
    cloudSetProfileRole(id, role).then((ok) => {
      if (ok) setCloudAccounts((prev) => prev?.map((a) => (a.id === id ? { ...a, role } : a)) ?? null)
      toast('Rol actualizado.')
    })
  }

  function deleteCloudAccount(id: string, name: string) {
    if (!window.confirm(`¿Eliminar la cuenta de ${name}? Se borrarán sus datos.`)) return
    cloudDeleteAccount(id).then((ok) => {
      if (!ok) { toast('No se pudo eliminar la cuenta.'); return }
      setCloudAccounts((prev) => prev?.filter((a) => a.id !== id) ?? null)
      toast('Cuenta eliminada.')
    })
  }

  function restoreBackup(b: BackupRow, name: string) {
    if (!window.confirm(`¿Restaurar el respaldo de ${name}? Se sobrescribirán sus datos actuales.`)) return
    cloudRestoreBackup(b.id).then((ok) => {
      toast(ok ? 'Respaldo restaurado.' : 'No se pudo restaurar el respaldo.')
    })
  }

  function approvePremium(req: PremiumRequestRow) {
    cloudApprovePremium(req).then((ok) => {
      if (!ok) { toast('No se pudo aprobar.'); return }
      setPremiumReqs((prev) => prev?.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r)) ?? null)
      toast('Pago aprobado. Premium activado.')
    })
  }

  function rejectPremium(id: string) {
    cloudRejectPremium(id).then((ok) => {
      if (ok) setPremiumReqs((prev) => prev?.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)) ?? null)
      toast('Solicitud rechazada.')
    })
  }

  function savePaySettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const s = { pay_pagomovil: x.pay_pagomovil ?? '', pay_binance: x.pay_binance ?? '', pay_zelle: x.pay_zelle ?? '', backup_enabled: x.backup_enabled === 'on' }
    cloudSaveAppSettings(s).then((ok) => {
      if (ok) { setPaySettings(s); toast('Datos de pago guardados.') }
      else toast('No se pudieron guardar los datos de pago.')
    })
  }

  function saveSocial(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    commit((d) => {
      d.profile.instagram = (x.instagram ?? '').trim()
      d.profile.tiktok = (x.tiktok ?? '').trim()
    })
    toast('Enlaces de la empresa guardados.')
  }

  return (
    <div className="admin-page">
      <PageHead
        k="CONTROL DE ENTRENADORES Y COBROS."
        title={<>Panel de administración<span style={{ color: 'var(--lime)' }}>.</span></>}
        sub="Gestiona los entrenadores, sus cuentas y los cobros de la membresía."
      />

      <div className="admin-source">
        <i className={isSupabaseEnabled ? 'online' : 'offline'} />
        {isSupabaseEnabled ? 'Conectado a Supabase' : 'Modo local (demo). Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'}
      </div>

      <nav className="admin-tabs" aria-label="Secciones del panel">
        {TABS.map(([id, label, ic]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon name={ic} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      {tab === 'resumen' ? (
        <>
          <div className="admin-stats">
            <div><span>Entrenadores</span><strong>{trainers.length}</strong><small>Registrados</small></div>
            <div><span>Premium</span><strong>{premiumCount}</strong><small>Con membresía activa</small></div>
            <div><span>En prueba</span><strong>{trialCount}</strong><small>Dentro de los {TRIAL_DAYS} días</small></div>
            <div><span>Prueba vencida</span><strong>{expiredCount}</strong><small>Deben pagar Premium</small></div>
            <div><span>Ingreso mensual</span><strong>{money(monthlyRevenue)}</strong><small>{premiumCount} × {money(PREMIUM_PRICE)}</small></div>
            <div><span>Clientes totales</span><strong>{totalClients}</strong><small>En todas las cuentas</small></div>
          </div>
          <div className="membership-grid admin-plans">
            {(['free', 'premium'] as const).map((id) => {
              const plan = PLANS[id]
              return (
                <article className={`plan-card ${id === 'premium' ? 'premium' : ''}`} key={id}>
                  <span className="plan-tag">{id === 'premium' ? 'PREMIUM' : 'NORMAL'}</span>
                  <h3>{plan.name}</h3>
                  <div className="plan-price">{plan.price === 0 ? 'Gratis' : `$${plan.price}`}{plan.price > 0 ? <small>/mes</small> : null}</div>
                  <ul className="plan-features">{plan.features.map((f) => <li key={f}><Icon name="check" /> {f}</li>)}</ul>
                </article>
              )
            })}
          </div>
        </>
      ) : null}

      {tab === 'cuentas' ? (
        <>
          <section className="admin-trainers">
            <div className="section-line">
              <div><span className="eyebrow">CUENTAS Y ACCESOS</span><h2>Cuentas (prueba)</h2></div>
              <span>{freeAccs.length} cuentas · {cloudEnabled ? cloudList.filter((a) => a.status === 'pending').length : accounts.filter((a) => a.status === 'pending').length} pendientes</span>
            </div>
            <div className="admin-list">
              {cloudEnabled
                ? freeAccs.map((a) => (
                    <article className="admin-trainer" key={a.id}>
                      <div className="admin-trainer-main">
                        <span className={`admin-avatar ${a.status === 'approved' ? 'premium' : ''}`}>{(a.name || '?').slice(0, 2).toUpperCase()}</span>
                        <div>
                          <b>{a.name} {a.role === 'admin' ? <span className="verified" title="Administrador"><Icon name="check" /></span> : null}</b>
                          <small>{a.email ?? 'Sin correo'}</small>
                          <small>Estado: {a.status === 'approved' ? 'acceso permitido' : a.status === 'pending' ? 'pendiente' : 'denegado'}</small>
                        </div>
                      </div>
                      <div className="admin-trainer-meta">
                        <span className={`admin-status ${a.status === 'approved' ? 'premium' : a.status === 'pending' ? 'trial' : 'expired'}`}>
                          {a.status === 'approved' ? 'Acceso permitido' : a.status === 'pending' ? 'Pendiente' : 'Denegado'}
                        </span>
                        {a.membership === 'premium' ? (
                          <span className="admin-status premium">Premium</span>
                        ) : trialDaysLeft(a.trial_start ?? undefined) > 0 ? (
                          <span className="admin-status trial">Le faltan {trialDaysLeft(a.trial_start ?? undefined)} días</span>
                        ) : (
                          <span className="admin-status expired">Prueba vencida</span>
                        )}
                      </div>
                      <div className="admin-trainer-actions">
                        {a.status !== 'approved' ? <button className="button primary" onClick={() => setCloudStatus(a.id, 'approved')}>Permitir acceso</button> : null}
                        {a.status !== 'rejected' ? <button className="button light" onClick={() => setCloudStatus(a.id, 'rejected')}>Denegar</button> : null}
                        <button className="button light" onClick={() => setCloudRole(a.id, a.role === 'admin' ? 'trainer' : 'admin')}>
                          {a.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                        </button>
                        <button className="button light" onClick={() => deleteCloudAccount(a.id, a.name)}>Eliminar</button>
                      </div>
                    </article>
                  ))
                : accounts.map((a) => (
                    <article className="admin-trainer" key={a.id}>
                      <div className="admin-trainer-main">
                        <span className={`admin-avatar ${a.status === 'approved' ? 'premium' : ''}`}>{a.name.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <b>{a.name} {a.role === 'admin' ? <span className="verified" title="Administrador"><Icon name="check" /></span> : null}</b>
                          <small>{a.email} · {a.gym || 'Sin gimnasio'}{a.instagram ? ` · ${a.instagram}` : ''}</small>
                          <small>Tel {a.phone || '—'} · Cédula {a.idNumber || '—'}</small>
                        </div>
                      </div>
                      <div className="admin-trainer-meta">
                        <span className={`admin-status ${a.status === 'approved' ? 'premium' : a.status === 'pending' ? 'trial' : 'expired'}`}>
                          {a.status === 'approved' ? 'Acceso permitido' : a.status === 'pending' ? 'Pendiente' : 'Denegado'}
                        </span>
                      </div>
                      <div className="admin-trainer-actions">
                        {a.status !== 'approved' ? <button className="button primary" onClick={() => { setAccountStatus(a.id, 'approved'); toast('Acceso permitido.') }}>Permitir acceso</button> : null}
                        {a.status !== 'rejected' ? <button className="button light" onClick={() => { setAccountStatus(a.id, 'rejected'); toast('Acceso denegado.') }}>Denegar</button> : null}
                        <button className="button light" onClick={() => { setAccountRole(a.id, a.role === 'admin' ? 'trainer' : 'admin'); toast('Rol actualizado.') }}>
                          {a.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                        </button>
                      </div>
                    </article>
                  ))}
              {cloudEnabled
                ? ((cloudAccounts ?? []).length ? null : <div className="admin-empty card white">Aún no hay cuentas registradas.</div>)
                : (accounts.length ? null : <div className="admin-empty card white">Aún no hay cuentas registradas.</div>)}
            </div>
          </section>

          <section className="admin-trainers">
            <div className="section-line">
              <div><span className="eyebrow">ENTRENADORES</span><h2>Membresías</h2></div>
              <span>{trainers.length} en total</span>
            </div>
            <div className="admin-list">
              {trainers.map((t) => {
                const plan = planOf(t.membership)
                const status = trainerStatus(t)
                return (
                  <article className="admin-trainer" key={t.id}>
                    <div className="admin-trainer-main">
                      <span className={`admin-avatar ${t.membership === 'premium' ? 'premium' : ''}`}>{t.name.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <b>{t.name}{t.verified ? <span className="verified" title="Entrenador verificado"><Icon name="check" /></span> : null}</b>
                        <small>{t.email || 'Sin correo'} · {t.specialty || 'Entrenador'}</small>
                      </div>
                    </div>
                    <div className="admin-trainer-meta">
                      <span className={`admin-plan-badge ${t.membership}`}>{plan.name}</span>
                      <span className={`admin-status ${status}`}>{status === 'premium' ? 'Premium' : status === 'trial' ? `Prueba · ${trialDaysLeft(t.trialStart)} d` : 'Prueba vencida'}</span>
                      <span>{t.activeClients || '—'} clientes</span>
                    </div>
                    <div className="admin-trainer-actions">
                      <button className={t.membership === 'premium' ? 'button light' : 'button primary'} onClick={() => togglePlan(t)}>
                        {t.membership === 'premium' ? 'Pasar a Normal' : `Hacer Premium $${PREMIUM_PRICE}`}
                      </button>
                      <button className="button light" onClick={() => resetTrial(t)}>Reiniciar prueba</button>
                      <button className="button light" onClick={() => toggleRole(t)}>{t.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>
                    </div>
                  </article>
                )
              })}
              {!trainers.length ? <div className="admin-empty card white">Aún no hay entrenadores registrados.</div> : null}
            </div>
          </section>
        </>
      ) : null}

      {tab === 'socios' ? (
        <section className="admin-trainers">
          <div className="section-line">
            <div><span className="eyebrow">CUENTAS PREMIUM</span><h2>Premium</h2></div>
            <span>{premAccs.length} premium</span>
          </div>
          <div className="admin-list">
            {premAccs.map((a) => (
              <article className="admin-trainer" key={a.id}>
                <div className="admin-trainer-main">
                  <span className="admin-avatar premium">{(a.name || '?').slice(0, 2).toUpperCase()}</span>
                  <div>
                    <b>{a.name} {a.role === 'admin' ? <span className="verified" title="Administrador"><Icon name="check" /></span> : null}</b>
                    <small>{a.email ?? 'Sin correo'}</small>
                    {a.trial_start ? <small>Desde {a.trial_start}</small> : null}
                  </div>
                </div>
                <div className="admin-trainer-meta">
                  <span className="admin-status premium">Premium</span>
                  <span className={`admin-status ${a.status === 'approved' ? 'premium' : a.status === 'pending' ? 'trial' : 'expired'}`}>
                    {a.status === 'approved' ? 'Acceso permitido' : a.status === 'pending' ? 'Pendiente' : 'Denegado'}
                  </span>
                </div>
                <div className="admin-trainer-actions">
                  {a.status !== 'approved' ? <button className="button primary" onClick={() => setCloudStatus(a.id, 'approved')}>Permitir acceso</button> : null}
                  {a.status !== 'rejected' ? <button className="button light" onClick={() => setCloudStatus(a.id, 'rejected')}>Denegar</button> : null}
                  <button className="button light" onClick={() => deleteCloudAccount(a.id, a.name)}>Eliminar</button>
                </div>
              </article>
            ))}
            {!premAccs.length ? <div className="admin-empty card white">Aún no hay cuentas Premium.</div> : null}
          </div>
        </section>
      ) : null}

      {tab === 'premium' ? (
        <>
          <section className="admin-trainers">
            <div className="section-line">
              <div><span className="eyebrow">SOLICITUDES PREMIUM</span><h2>Pagos por verificar</h2></div>
              <span>{(premiumReqs ?? []).filter((r) => r.status === 'pending').length} pendientes</span>
            </div>
            <div className="admin-list">
              {(premiumReqs ?? []).map((r) => (
                <article className="admin-trainer" key={r.id}>
                  <div className="admin-trainer-main">
                    {r.capture ? (
                      <a className="capture-thumb" href={r.capture} target="_blank" rel="noopener noreferrer"><img src={r.capture} alt="Comprobante" /></a>
                    ) : (
                      <span className="admin-avatar">{r.method.slice(0, 2).toUpperCase()}</span>
                    )}
                    <div>
                      <b>{r.name || 'Entrenador'}</b>
                      <small>{r.method === 'pagomovil' ? 'Pago Móvil' : 'Binance'} · ${r.amount} · Ref: {r.reference || '—'}</small>
                      <small>{r.email || ''} · {r.phone || ''} · Cédula {r.id_number || '—'}</small>
                    </div>
                  </div>
                  <div className="admin-trainer-meta">
                    <span className={`admin-status ${r.status === 'approved' ? 'premium' : r.status === 'pending' ? 'trial' : 'expired'}`}>
                      {r.status === 'approved' ? 'Aprobado' : r.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                  <div className="admin-trainer-actions">
                    {r.status === 'pending' ? <button className="button primary" onClick={() => approvePremium(r)}>Aprobar Premium</button> : null}
                    {r.status === 'pending' ? <button className="button light" onClick={() => rejectPremium(r.id)}>Rechazar</button> : null}
                  </div>
                </article>
              ))}
              {!(premiumReqs ?? []).length ? <div className="admin-empty card white">Sin solicitudes todavía.</div> : null}
            </div>
          </section>

          <section className="admin-social">
            <div className="section-line">
              <div><span className="eyebrow">CALENDARIO PREMIUM</span><h2>Quiénes deben pagar</h2></div>
              <div className="calendar-controls">
                <button className="icon-button" onClick={() => changePremMonth(-1)} aria-label="Mes anterior">‹</button>
                <button className="button light small" onClick={() => setPremMonth(month(TODAY))}>Hoy</button>
                <button className="icon-button" onClick={() => changePremMonth(1)} aria-label="Mes siguiente">›</button>
              </div>
            </div>
            <h3 className="admin-cal-title">{longDate(`${premMonth}-01`, { month: 'long', year: 'numeric' })}</h3>
            <div className="admin-cal">
              {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => <div className="admin-cal-wd" key={d}>{d}</div>)}
              {Array.from({ length: cells }, (_, i) => {
                const n = i - offset + 1
                if (n < 1 || n > daysInMonth) return <div className="admin-cal-cell empty" key={`e${i}`} />
                const day = `${premMonth}-${String(n).padStart(2, '0')}`
                const due = dueByDay.get(day) ?? []
                return (
                  <div className={`admin-cal-cell ${day === TODAY ? 'today' : ''} ${due.length ? 'has' : ''}`} key={day}>
                    <strong>{n}</strong>
                    {due.length ? <span className="admin-cal-dot">{due.length}</span> : null}
                  </div>
                )
              })}
            </div>
            <div className="admin-due-list">
              {monthDue.length ? monthDue.map((d) => (
                <div className="admin-due" key={d.id}>
                  <span className={`admin-due-dot ${d.plan}`} />
                  <b>{d.name}</b>
                  <small>{longDate(d.due, { day: 'numeric', month: 'short' })} · {d.plan === 'premium' ? 'Renovación Premium' : 'Fin de prueba'}</small>
                  <span className="admin-due-amt">{money(PREMIUM_PRICE)}</span>
                </div>
              )) : <div className="admin-empty card white">Sin vencimientos este mes.</div>}
            </div>
          </section>
        </>
      ) : null}

      {tab === 'pagos' ? (
        <section className="admin-social">
          <div className="section-line"><div><span className="eyebrow">PAGOS</span><h2>Datos para recibir el pago</h2></div></div>
          <form onSubmit={savePaySettings}>
            <div className="form-grid">
              <div className="full"><label>Pago Móvil</label><textarea name="pay_pagomovil" defaultValue={paySettings.pay_pagomovil} rows={2} placeholder="Banco, teléfono y cédula del titular" /></div>
              <div className="full"><label>Binance</label><textarea name="pay_binance" defaultValue={paySettings.pay_binance} rows={2} placeholder="Email / Wallet y red (BEP20, etc.)" /></div>
              <div className="full"><label>Zelle</label><textarea name="pay_zelle" defaultValue={paySettings.pay_zelle} rows={2} placeholder="Email y nombre del titular" /></div>
              <div className="full">
                <label className="pay-backup-toggle">
                  <input type="checkbox" name="backup_enabled" defaultChecked={paySettings.backup_enabled} />
                  <span>Respaldo automático de datos (salvavidas) activado</span>
                </label>
              </div>
            </div>
            <div className="form-foot"><button className="button primary" type="submit">Guardar datos de pago <Icon name="check" /></button></div>
          </form>
        </section>
      ) : null}

      {tab === 'respaldo' ? (
        <section className="admin-trainers">
          <div className="section-line">
            <div><span className="eyebrow">SALVAVIDAS</span><h2>Respaldos automáticos</h2></div>
            <span>{(backups ?? []).length} respaldos</span>
          </div>
          <div className="admin-list">
            {(backups ?? []).map((b) => {
              const acc = (cloudAccounts ?? []).find((a) => a.id === b.trainer_id)
              const name = acc?.name ?? acc?.email ?? b.trainer_id
              return (
                <article className="admin-trainer" key={b.id}>
                  <div className="admin-trainer-main">
                    <span className="admin-avatar">{(name || '?').slice(0, 2).toUpperCase()}</span>
                    <div>
                      <b>{name}</b>
                      <small>{new Date(b.created_at).toLocaleString('es')}</small>
                    </div>
                  </div>
                  <div className="admin-trainer-actions">
                    <button className="button primary" onClick={() => restoreBackup(b, name)}>Restaurar</button>
                  </div>
                </article>
              )
            })}
            {!(backups ?? []).length ? <div className="admin-empty card white">Aún no hay respaldos registrados.</div> : null}
          </div>
        </section>
      ) : null}

      {tab === 'redes' ? (
        <section className="admin-social">
          <div className="section-line"><div><span className="eyebrow">REDES DE LA EMPRESA</span><h2>Enlaces del perfil</h2></div></div>
          <form onSubmit={saveSocial}>
            <div className="form-grid">
              <div className="full"><label>Instagram (URL)</label><input name="instagram" defaultValue={data.profile.instagram} placeholder="https://instagram.com/tu-usuario" maxLength={200} /></div>
              <div className="full"><label>TikTok (URL)</label><input name="tiktok" defaultValue={data.profile.tiktok} placeholder="https://tiktok.com/@tu-usuario" maxLength={200} /></div>
            </div>
            <div className="form-foot"><button className="button primary" type="submit">Guardar enlaces <Icon name="check" /></button></div>
          </form>
        </section>
      ) : null}
    </div>
  )
}
