import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { PLANS, PREMIUM_PRICE, TRIAL_DAYS, planOf, trainerStatus, trialDaysLeft } from '../lib/plans'
import { isSupabaseEnabled } from '../lib/supabase'
import {
  listTrainers,
  recordMembershipPayment,
  setTrainerMembership,
  setTrainerRole,
  setTrainerTrial,
  type TrainerRow,
} from '../lib/backend'
import { month, TODAY } from '../lib/utils'
import { currentAccount, setAccountRole, setAccountStatus, useAccounts, useAuthVersion } from '../lib/auth'
import {
  cloudListProfiles,
  cloudSetProfileRole,
  cloudSetProfileStatus,
  type CloudProfileRow,
} from '../lib/cloud'
import type { Trainer } from '../types'

export function AdminPage() {
  const { data, commit, money, toast, cloudEnabled, cloudProfile } = useApp()
  useAuthVersion()
  const account = currentAccount()
  const isAdmin = cloudEnabled
    ? cloudProfile?.role === 'admin'
    : (account?.role ?? data.profile.role) === 'admin'
  const accounts = useAccounts()
  const [cloudAccounts, setCloudAccounts] = useState<CloudProfileRow[] | null>(null)
  const [remote, setRemote] = useState<TrainerRow[] | null>(null)
  const nowMonth = month(TODAY)

  useEffect(() => {
    if (!cloudEnabled) return
    let alive = true
    cloudListProfiles().then((rows) => { if (alive) setCloudAccounts(rows) })
    return () => { alive = false }
  }, [cloudEnabled])

  useEffect(() => {
    if (!isSupabaseEnabled || !isAdmin) return
    let alive = true
    listTrainers().then((rows) => {
      if (alive) setRemote(rows)
    })
    return () => {
      alive = false
    }
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

  function togglePlan(t: Trainer) {
    const next: 'free' | 'premium' = t.membership === 'premium' ? 'free' : 'premium'
    if (remote) {
      setTrainerMembership(t.id, next).then((ok) => {
        if (!ok) {
          toast('No se pudo actualizar en Supabase.')
          return
        }
        if (next === 'premium') recordMembershipPayment(t.id, nowMonth)
        setRemote((prev) => prev?.map((r) => (r.id === t.id ? { ...r, membership: next, verified: next === 'premium' } : r)) ?? null)
        toast(next === 'premium' ? 'Premium activado y cobro registrado.' : 'Cambiado a plan Normal.')
      })
      return
    }
    commit((d) => {
      const target = (d.trainers ?? []).find((x) => x.id === t.id)
      if (target) {
        target.membership = next
        target.verified = next === 'premium'
      }
    })
    toast(
      next === 'premium'
        ? `Premium activado · ${money(PREMIUM_PRICE)}/mes.`
        : 'Cambiado a plan Normal (3 clientes).',
    )
  }

  function toggleRole(t: Trainer) {
    const next: 'trainer' | 'admin' = t.role === 'admin' ? 'trainer' : 'admin'
    if (remote) {
      setTrainerRole(t.id, next).then((ok) => {
        if (ok)
          setRemote((prev) => prev?.map((r) => (r.id === t.id ? { ...r, role: next } : r)) ?? null)
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

  function saveSocial(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    commit((d) => {
      d.profile.instagram = (x.instagram ?? '').trim()
      d.profile.tiktok = (x.tiktok ?? '').trim()
    })
    toast('Enlaces de la empresa guardados.')
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

  return (
    <div className="admin-page">
      <PageHead
        k="CONTROL DE ENTRENADORES Y COBROS."
        title={
          <>
            Panel de administración<span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Gestiona los entrenadores, su plan y los cobros de la membresía."
      />

      <div className="admin-source">
        <i className={isSupabaseEnabled ? 'online' : 'offline'} />
        {isSupabaseEnabled
          ? 'Conectado a Supabase'
          : 'Modo local (demo). Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para producción.'}
      </div>

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
              <div className="plan-price">
                {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                {plan.price > 0 ? <small>/mes</small> : null}
              </div>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}><Icon name="check" /> {f}</li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>

      <section className="admin-social">
        <div className="section-line">
          <div><span className="eyebrow">REDES DE LA EMPRESA</span><h2>Enlaces del perfil</h2></div>
        </div>
        <form onSubmit={saveSocial}>
          <div className="form-grid">
            <div className="full">
              <label>Instagram (URL)</label>
              <input name="instagram" defaultValue={data.profile.instagram} placeholder="https://instagram.com/tu-usuario" maxLength={200} />
            </div>
            <div className="full">
              <label>TikTok (URL)</label>
              <input name="tiktok" defaultValue={data.profile.tiktok} placeholder="https://tiktok.com/@tu-usuario" maxLength={200} />
            </div>
          </div>
          <div className="form-foot">
            <button className="button primary" type="submit">Guardar enlaces <Icon name="check" /></button>
          </div>
        </form>
      </section>

      <section className="admin-accounts">
        <div className="section-line">
          <div><span className="eyebrow">CUENTAS Y ACCESOS</span><h2>Solicitudes de registro</h2></div>
          <span>
            {cloudEnabled
              ? (cloudAccounts ?? []).filter((a) => a.status === 'pending').length
              : accounts.filter((a) => a.status === 'pending').length} pendientes
          </span>
        </div>
        <div className="admin-list">
          {cloudEnabled
            ? (cloudAccounts ?? []).map((a) => (
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
                  </div>
                  <div className="admin-trainer-actions">
                    {a.status !== 'approved' ? <button className="button primary" onClick={() => setCloudStatus(a.id, 'approved')}>Permitir acceso</button> : null}
                    {a.status !== 'rejected' ? <button className="button light" onClick={() => setCloudStatus(a.id, 'rejected')}>Denegar</button> : null}
                    <button className="button light" onClick={() => setCloudRole(a.id, a.role === 'admin' ? 'trainer' : 'admin')}>
                      {a.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
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
          <div><span className="eyebrow">ENTRENADORES</span><h2>Cuentas y membresías</h2></div>
          <span>{trainers.length} en total</span>
        </div>
        <div className="admin-list">
          {trainers.map((t) => {
            const plan = planOf(t.membership)
            const status = trainerStatus(t)
            return (
              <article className="admin-trainer" key={t.id}>
                <div className="admin-trainer-main">
                  <span className={`admin-avatar ${t.membership === 'premium' ? 'premium' : ''}`}>
                    {t.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <b>
                      {t.name}
                      {t.verified ? <span className="verified" title="Entrenador verificado"><Icon name="check" /></span> : null}
                    </b>
                    <small>{t.email || 'Sin correo'} · {t.specialty || 'Entrenador'}</small>
                  </div>
                </div>
                <div className="admin-trainer-meta">
                  <span className={`admin-plan-badge ${t.membership}`}>{plan.name}</span>
                  <span className={`admin-status ${status}`}>
                    {status === 'premium' ? 'Premium' : status === 'trial' ? `Prueba · ${trialDaysLeft(t.trialStart)} d` : 'Prueba vencida'}
                  </span>
                  <span>{t.activeClients || '—'} clientes</span>
                </div>
                <div className="admin-trainer-actions">
                  <button className={t.membership === 'premium' ? 'button light' : 'button primary'} onClick={() => togglePlan(t)}>
                    {t.membership === 'premium' ? 'Pasar a Normal' : `Hacer Premium $${PREMIUM_PRICE}`}
                  </button>
                  <button className="button light" onClick={() => resetTrial(t)}>
                    Reiniciar prueba
                  </button>
                  <button className="button light" onClick={() => toggleRole(t)}>
                    {t.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                  </button>
                </div>
              </article>
            )
          })}
          {!trainers.length ? (
            <div className="admin-empty card white">Aún no hay entrenadores registrados.</div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
