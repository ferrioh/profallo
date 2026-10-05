import { useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { PasswordInput } from '../components/PasswordInput'
import { currentAccount, login as localLogin, useAuthVersion } from '../lib/auth'
import { cloudSignIn } from '../lib/cloud'

export function AdminLogin({ signedIn = false }: { signedIn?: boolean }) {
  const { cloudEnabled, go, toast } = useApp()
  useAuthVersion()
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)
  const savedEmail = (() => { try { return localStorage.getItem('profallo.admin.email') || '' } catch { return '' } })()

  function persistEmail(email: string) {
    try {
      if (remember) localStorage.setItem('profallo.admin.email', email.trim())
      else localStorage.removeItem('profallo.admin.email')
    } catch { /* ignore */ }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (cloudEnabled) {
      const res = await cloudSignIn(x.email ?? '', x.password ?? '')
      if (!res.ok) { setError(res.error ?? 'No se pudo iniciar sesión.'); return }
      persistEmail(x.email ?? '')
      return
    }
    const res = localLogin(x.email ?? '', x.password ?? '')
    if (!res.ok) { setError(res.error ?? 'No se pudo iniciar sesión.'); return }
    if (res.account?.role !== 'admin') { setError('Esta cuenta no es administrador.'); return }
    persistEmail(x.email ?? '')
    toast('Bienvenido, administrador.')
  }

  const account = currentAccount()
  const wrongAccount = signedIn || (!cloudEnabled && !!account && account.role !== 'admin')

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <span className="brand-mark">p</span>
        <span className="eyebrow">PANEL DE ADMINISTRACIÓN</span>
        <h1>Acceso de administrador</h1>
        <p className="muted">Entra con tu cuenta admin para gestionar entrenadores, cuentas y pagos.</p>
        {wrongAccount ? <p className="entry-error">Has iniciado con una cuenta que no es admin. Entra con la cuenta administradora.</p> : null}
        <label>Correo del administrador<input name="email" type="email" required autoComplete="email" defaultValue={savedEmail} placeholder="admin@tucorreo.com" /></label>
        <label>Contraseña<PasswordInput name="password" required autoComplete="current-password" placeholder="Tu contraseña" /></label>
        <label className="entry-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>Recordar usuario</span></label>
        {error ? <p className="entry-error">{error}</p> : null}
        <button className="button primary" type="submit"><Icon name="check" /> Entrar al panel</button>
        <button className="entry-back" type="button" onClick={() => go('inicio')}>‹ Volver a la app</button>
      </form>
    </div>
  )
}
