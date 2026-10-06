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
  setTrainerReferral,
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
  cloudDeleteAdminMessage,
  cloudListAdminMessages,
  cloudListBackups,
  cloudListPremiumRequests,
  cloudRestoreBackup,
  cloudSendAdminMessage,
  cloudUpdateAdminMessage,
  cloudUserAnalytics,
  type AdminMessage,
  type UserAnalyticsRow,
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

type Tab = 'resumen' | 'cuentas' | 'socios' | 'premium' | 'pagos' | 'mensajes' | 'accionistas' | 'analitica' | 'respaldo' | 'redes'

const TABS: Array<[Tab, string, string]> = [
  ['resumen', 'Resumen', 'grid'],
  ['cuentas', 'Cuentas', 'users'],
  ['socios', 'Premium', 'star'],
  ['premium', 'Pagos', 'wallet'],
  ['pagos', 'Datos de pago', 'wallet'],
  ['mensajes', 'Mensaje', 'bell'],
  ['accionistas', 'Accionistas', 'users'],
  ['analitica', 'Analítica', 'chart'],
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
  const [paySettings, setPaySettings] = useState<AppSettings>({ pay_pagomovil: '', pay_binance: '', pay_zelle: '', backup_enabled: true, shareholders: [] })
  const [analytics, setAnalytics] = useState<UserAnalyticsRow[] | null>(null)
  const [shareName, setShareName] = useState('')
  const [sharePercent, setSharePercent] = useState('')
  const [editingShareId, setEditingShareId] = useState<string | null>(null)
  const [remote, setRemote] = useState<TrainerRow[] | null>(null)
const [backups, setBackups] = useState<BackupRow[] | null>(null)
  const [sentMsgs, setSentMsgs] = useState<AdminMessage[] | null>(null)
  const [msgTo, setMsgTo] = useState('')
  const [msgText, setMsgText] = useState('')
  const [msgTitle, setMsgTitle] = useState('')
  const [msgLink, setMsgLink] = useState('')
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
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
    cloudListAdminMessages().then((rows) => { if (alive) setSentMsgs(rows) })
    cloudUserAnalytics().then((rows) => { if (alive) setAnalytics(rows) })
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
        referral: r.referral ?? false,
        activeClients: 0,
        joined: (r.created_at ?? '').slice(0, 10),
        trialStart: r.trial_start ?? undefined,
      }))
    : data.trainers ?? []

  const premiumCount = trainers.filter((t) => t.membership === 'premium' && !t.referral).length
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

  function toggleReferral(t: Trainer) {
    const next = !t.referral
    if (remote) {
      void (async () => {
        if (next && t.membership !== 'premium') {
          const ok = await setTrainerMembership(t.id, 'premium')
          if (!ok) { toast('No se pudo actualizar.'); return }
        }
        const ok2 = await setTrainerReferral(t.id, next)
        if (!ok2) { toast('No se pudo actualizar.'); return }
        setRemote((prev) => prev?.map((r) => (r.id === t.id ? { ...r, membership: next ? 'premium' : r.membership, referral: next } : r)) ?? null)
        toast(next ? 'Premium referencial (no cuenta en ganancias).' : 'Referencial quitado.')
      })()
      return
    }
    commit((d) => {
      const target = (d.trainers ?? []).find((x) => x.id === t.id)
      if (target) { target.referral = next; if (next) target.membership = 'premium' }
    })
    toast(next ? 'Premium referencial.' : 'Referencial quitado.')
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

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!msgTo) { toast('Selecciona un destinatario.'); return }
    if (!msgText.trim()) { toast('Escribe un mensaje.'); return }
    const target = msgTo === '__all__' ? null : msgTo
    if (editingMsgId) {
      const ok = await cloudUpdateAdminMessage(editingMsgId, { title: msgTitle, text: msgText, link: msgLink })
      if (!ok) { toast('No se pudo actualizar el mensaje.'); return }
      setEditingMsgId(null); setMsgText(''); setMsgTitle(''); setMsgLink('')
      cloudListAdminMessages().then((rows) => { if (rows) setSentMsgs(rows) })
      toast('Mensaje actualizado.')
      return
    }
    const ok = await cloudSendAdminMessage(target, msgText.trim(), msgTitle, msgLink)
    if (!ok) { toast('No se pudo enviar el mensaje.'); return }
    setMsgText(''); setMsgTitle(''); setMsgLink('')
    cloudListAdminMessages().then((rows) => { if (rows) setSentMsgs(rows) })
    toast('Mensaje enviado.')
  }

  function editMessage(m: AdminMessage) {
    setEditingMsgId(m.id)
    setMsgTo(m.trainer_id ?? '__all__')
    setMsgTitle(m.title ?? '')
    setMsgText(m.text)
    setMsgLink(m.link ?? '')
  }

  function deleteMessage(id: string) {
    if (!window.confirm('¿Eliminar este mensaje? Se quitará de las notificaciones.')) return
    cloudDeleteAdminMessage(id).then((ok) => {
      if (!ok) { toast('No se pudo eliminar el mensaje.'); return }
      setSentMsgs((prev) => (prev ?? []).filter((m) => m.id !== id))
      toast('Mensaje eliminado.')
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
    const s = { pay_pagomovil: x.pay_pagomovil ?? '', pay_binance: x.pay_binance ?? '', pay_zelle: x.pay_zelle ?? '', backup_enabled: x.backup_enabled === 'on', shareholders: paySettings.shareholders }
    cloudSaveAppSettings(s).then((ok) => {
      if (ok) { setPaySettings(s); toast('Datos de pago guardados.') }
      else toast('No se pudieron guardar los datos de pago.')
    })
  }

  function saveShareholders(list: AppSettings['shareholders']) {
    const next = { ...paySettings, shareholders: list }
    setPaySettings(next)
    cloudSaveAppSettings(next).then((ok) => { if (!ok) toast('No se pudieron guardar los accionistas.') })
  }

  function addShareholder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = shareName.trim()
    const percent = Number(sharePercent)
    if (!name || !Number.isFinite(percent) || percent <= 0) { toast('Escribe nombre y porcentaje.'); return }
    if (editingShareId) {
      saveShareholders(paySettings.shareholders.map((s) => s.id === editingShareId ? { ...s, name, percent } : s))
      setEditingShareId(null)
    } else {
      saveShareholders([...paySettings.shareholders, { id: `sh-${Date.now()}`, name, percent }])
    }
    setShareName(''); setSharePercent('')
    toast('Accionista guardado.')
  }

  function removeShareholder(id: string) {
    saveShareholders(paySettings.shareholders.filter((s) => s.id !== id))
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
                        {t.membership === 'premium' ? 'Quitar Premium' : `Hacer Premium $${PREMIUM_PRICE}`}
                      </button>
                      <button className={t.referral ? 'button primary' : 'button light'} onClick={() => toggleReferral(t)}>
                        {t.referral ? 'Referencial ✓' : 'Referencial'}
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

      {tab === 'mensajes' ? (
        <section className="admin-trainers">
          <div className="section-line">
            <div><span className="eyebrow">MENSAJE A ENTRENADORES</span><h2>Enviar mensaje</h2></div>
          </div>
          <form className="admin-msg-form" onSubmit={sendMessage}>
            <label>Destinatario
              <select value={msgTo} onChange={(e) => setMsgTo(e.target.value)}>
                <option value="">Selecciona un entrenador…</option>
                <option value="__all__">📣 Todos (everyone)</option>
                {cloudList.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.email ? ` · ${a.email}` : ''}</option>
                ))}
              </select>
            </label>
            <label>Encabezado (opcional)
              <input value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} maxLength={60} placeholder="Título grande del mensaje" />
            </label>
            <label>Mensaje
              <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} rows={3} maxLength={500} placeholder="Escribe el mensaje que verá en sus notificaciones" />
            </label>
            <label>Link (opcional)
              <input value={msgLink} onChange={(e) => setMsgLink(e.target.value)} maxLength={300} placeholder="https://…" />
            </label>
            <div className="form-foot">
              {editingMsgId ? <button className="button light" type="button" onClick={() => { setEditingMsgId(null); setMsgText(''); setMsgTitle(''); setMsgLink('') }}>Cancelar</button> : null}
              <button className="button primary" type="submit"><Icon name="bell" /> {editingMsgId ? 'Guardar cambios' : 'Enviar mensaje'}</button>
            </div>
          </form>

          <div className="section-line" style={{ marginTop: 24 }}>
            <div><span className="eyebrow">ENVIADOS</span><h2>Mensajes enviados</h2></div>
            <span>{(sentMsgs ?? []).length}</span>
          </div>
          <div className="admin-list">
            {(sentMsgs ?? []).map((m) => {
              const acc = cloudList.find((a) => a.id === m.trainer_id)
              return (
                <article className="admin-message" key={m.id}>
                  <span className="admin-msg-tag">PROFALLO</span>
                  {m.title ? <h4 className="admin-msg-title">{m.title}</h4> : null}
                  <p>{m.text}</p>
                  {m.link ? <a className="admin-msg-link" href={m.link} target="_blank" rel="noopener noreferrer">{m.link}</a> : null}
                  <small>{m.trainer_id ? (acc?.name ?? m.trainer_id) : 'Todos'} · {new Date(m.created_at).toLocaleString('es')}</small>
                  <div className="admin-msg-actions">
                    {m.id.startsWith('local-') ? null : <button className="button light" onClick={() => editMessage(m)}><Icon name="edit" /> Editar</button>}
                    <button className="button light" onClick={() => deleteMessage(m.id)}><Icon name="trash" /> Eliminar</button>
                  </div>
                </article>
              )
            })}
            {!(sentMsgs ?? []).length ? <div className="admin-empty card white">Aún no has enviado mensajes.</div> : null}
          </div>
        </section>
      ) : null}

      {tab === 'accionistas' ? (
        <section className="admin-trainers">
          <div className="section-line">
            <div><span className="eyebrow">REPARTO DE GANANCIAS</span><h2>Accionistas</h2></div>
            <span>Ganancia mensual: <b>{money(monthlyRevenue)}</b></span>
          </div>
          <form className="admin-msg-form" onSubmit={addShareholder} style={{ marginBottom: 20 }}>
  <div className="form-grid">
    <div><label>Nombre</label><input value={shareName} onChange={(e) => setShareName(e.target.value)} maxLength={60} required /></div>
    <div><label>Porcentaje (%)</label><input value={sharePercent} onChange={(e) => setSharePercent(e.target.value)} type="number" step="0.1" min="0.1" max="100" placeholder="30" required /></div>
  </div>
  <div className="form-foot">
    {editingShareId ? <button className="button light" type="button" onClick={() => { setEditingShareId(null); setShareName(''); setSharePercent('') }}>Cancelar</button> : null}
    <button className="button primary" type="submit">{editingShareId ? 'Guardar cambios' : 'Agregar accionista'}</button>
  </div>
</form>
          <div className="admin-list">
            {paySettings.shareholders.map((s) => (
  <article className="admin-message" key={s.id}>
    <div className="admin-share-row">
      <span className="admin-share-photo">
        {s.photo ? <img src={s.photo} alt={s.name} /> : <span className="admin-share-initial">{s.name.slice(0,1).toUpperCase()}</span>}
      </span>
      <div className="admin-share-info">
        <b>{s.name}</b>
        <small>{s.percent}% · {money((monthlyRevenue * s.percent) / 100)} este mes</small>
      </div>
    </div>
    <div className="admin-msg-actions">
      <button className="button light" onClick={() => { setEditingShareId(s.id); setShareName(s.name); setSharePercent(String(s.percent)) }}><Icon name="edit" /> Editar</button>
      <button className="button light" onClick={() => removeShareholder(s.id)}><Icon name="trash" /> Eliminar</button>
    </div>
  </article>
))}
            {!paySettings.shareholders.length ? <div className="admin-empty card white">Aún no hay accionistas. Agrega uno con su porcentaje.</div> : null}
          </div>
        </section>
      ) : null}

      {tab === 'analitica' ? (
        <section className="admin-trainers">
          <div className="section-line">
            <div><span className="eyebrow">MÉTRICAS</span><h2>Analítica de usuarios</h2></div>
            <span>{(analytics ?? []).length} entrenadores</span>
          </div>
          <div className="admin-list">
            {(analytics ?? []).map((a) => (
              <article className="admin-trainer" key={a.id}>
                <div className="admin-trainer-main">
                  <span className="admin-avatar">{a.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <b>{a.name}</b>
                    <small title="Correo">{a.email ?? '—'}</small>
                    <small>🕐 Uso: {Math.round(a.usageSeconds / 60)} min · Clientes {a.clients} · Routines {a.routines}</small>
                    <small title="Sesiones programadas, envíos de link compartido, pagos, reseñas totales y positivas">{a.sessions} ses · {a.shares} compartidos · {a.payments} pagos · {a.reviews} reseñas ({a.reviewsPos} +8)</small>
                  </div>
                </div>
              </article>
            ))}
            {!(analytics ?? []).length ? <div className="admin-empty card white">No hay datos aún.</div> : null}
          </div>
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
