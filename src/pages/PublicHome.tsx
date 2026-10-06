import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { EntryLoader } from '../components/EntryLoader'
import { PasswordInput } from '../components/PasswordInput'
import { PASS_MIN, login as doLogin, signup as doSignup } from '../lib/auth'
import { cloudGetProfile, cloudResetPassword, cloudSignIn, cloudSignOut, cloudSignUp } from '../lib/cloud'

const SLIDES = [
  'assets/trainer-hero-v2.png',
  'assets/home-athlete.png',
  'assets/coach.png',
]

export function PublicHome() {
  const { enter, go, toast, cloudEnabled } = useApp()
  const [mode, setMode] = useState<'menu' | 'login' | 'signup' | 'waiting' | 'recover'>('login')
  const [error, setError] = useState('')
  const [slide, setSlide] = useState(0)
  const [phase, setPhase] = useState<'load' | 'out' | 'done'>('load')
  const [captcha, setCaptcha] = useState(() => ({ a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) }))
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [robot, setRobot] = useState(false)
  const [remember, setRemember] = useState(true)
  const [signingUp, setSigningUp] = useState(false)
  const savedEmail = (() => { try { return localStorage.getItem('profallo.email') || '' } catch { return '' } })()

  function persistEmail(email: string) {
    try {
      if (remember) localStorage.setItem('profallo.email', email.trim())
      else localStorage.removeItem('profallo.email')
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('out'), 1500)
    const t2 = window.setTimeout(() => setPhase('done'), 1950)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [])

  function refreshCaptcha() {
    setCaptcha({ a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) })
    setCaptchaAnswer('')
    setRobot(false)
  }

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (cloudEnabled) {
      const res = await cloudSignIn(x.email ?? '', x.password ?? '')
      if (!res.ok) { setError(res.error ?? 'No se pudo iniciar sesión.'); return }
      const uid = res.session?.user.id
      if (uid) {
        const prof = await cloudGetProfile(uid)
        if (prof?.status === 'rejected') {
          await cloudSignOut()
          setError('Tu acceso fue denegado por el administrador.')
          return
        }
      }
      persistEmail(x.email ?? '')
      toast('Bienvenido.')
      enter()
      go('inicio')
      return
    }
    const res = doLogin(x.email ?? '', x.password ?? '')
    if (!res.ok) { setError(res.error ?? 'No se pudo iniciar sesión.'); return }
    persistEmail(x.email ?? '')
    toast(`Hola, ${res.account?.name}.`)
    enter()
    go('inicio')
  }

  async function onRecover(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (!cloudEnabled) { setError('La recuperación está disponible con tu cuenta en la nube.'); return }
    const res = await cloudResetPassword((x.email ?? '').trim().toLowerCase())
    if (!res.ok) { setError(res.error ?? 'No se pudo enviar el correo.'); return }
    toast('Te enviamos un correo para restablecer tu contraseña.')
    setMode('login')
  }

  async function onSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const idNumber = `${x.idType || 'V'}-${(x.idNumber ?? '').replace(/\D/g, '')}`
    if (cloudEnabled) {
      if (!robot || Number(captchaAnswer) !== captcha.a + captcha.b) { setError('Confirma el captcha.'); refreshCaptcha(); return }
      if ((x.password ?? '').length < PASS_MIN) { setError(`La contraseña debe tener al menos ${PASS_MIN} caracteres.`); return }
      if (x.password !== x.confirm) { setError('Las contraseñas no coinciden.'); return }
      setSigningUp(true)
      const res = await cloudSignUp((x.email ?? '').trim().toLowerCase(), x.password ?? '', {
        name: x.name ?? '', phone: x.phone ?? '', idNumber, gym: '', instagram: x.instagram ?? '',
      })
      setSigningUp(false)
      if (!res.ok) { setError(res.error ?? 'No se pudo crear la cuenta.'); refreshCaptcha(); return }
      if (res.needsConfirmation) {
        toast('Revisa tu correo para confirmar la cuenta y luego inicia sesión.')
        setMode('login')
        return
      }
      // Sesión creada directamente (email auto‑confirmado).
      toast('Cuenta creada.')
      enter()
      go('inicio')
      return
    }
    const res = doSignup({
      name: x.name ?? '',
      email: x.email ?? '',
      password: x.password ?? '',
      confirm: x.confirm ?? '',
      phone: x.phone ?? '',
      idNumber,
      gym: x.gym ?? '',
      instagram: x.instagram ?? '',
      captchaOk: robot && Number(captchaAnswer) === captcha.a + captcha.b,
    })
    if (!res.ok) {
      setError(res.error ?? 'No se pudo crear la cuenta.')
      refreshCaptcha()
      return
    }
    setMode('waiting')
  }

  function finish() {
    enter()
    go('inicio')
  }

  return (
    <div className="simple-entry">
      {phase !== 'done' ? (
        <EntryLoader out={phase === 'out'} />
      ) : null}
      <div className="entry-bg" aria-hidden="true">
        {SLIDES.map((src, i) => (
          <div key={src} className={`entry-bg-slide ${i === slide ? 'active' : ''}`} style={{ backgroundImage: `url(${src})` }} />
        ))}
        <div className="entry-bg-shade" />
      </div>
      <div className="entry-slides" aria-hidden="true">
        {SLIDES.map((src, i) => <span key={src} className={i === slide ? 'active' : ''} />)}
      </div>
      <header className="simple-entry-header">
        <div className="public-brand"><span className="brand-mark">p</span>profallo<span className="brand-dot">.</span></div>
      </header>
      <main className="simple-entry-main">
        {mode === 'menu' ? (
          <section className="simple-access" aria-labelledby="entry-title">
            <span className="simple-access-kicker">PROFALLO</span>
            <h1 id="entry-title">Tu progreso, en tus manos<span>.</span></h1>
            <p>Entrena, organiza y cobra. Todo en un solo lugar.</p>
            <button className="simple-access-primary" type="button" onClick={() => { setError(''); setMode('login') }}>Iniciar sesión <Icon name="arrow" /></button>
            <button className="simple-access-secondary" type="button" onClick={() => { setError(''); setMode('signup') }}>Crear cuenta</button>
          </section>
        ) : mode === 'login' ? (
          <section className="simple-access" aria-labelledby="login-title">
            <span className="simple-access-kicker">INICIAR SESIÓN</span>
            <h1 id="login-title">Bienvenido de vuelta<span>.</span></h1>
            <form className="entry-form" onSubmit={onLogin}>
              <label>Correo electrónico<input name="email" type="email" required autoComplete="email" defaultValue={savedEmail} placeholder="tucorreo@ejemplo.com" /></label>
              <label>Contraseña<PasswordInput name="password" required autoComplete="current-password" placeholder="Tu contraseña" /></label>
              <label className="entry-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>Recordar usuario</span></label>
              <button className="entry-forgot" type="button" onClick={() => { setError(''); setMode('recover') }}>¿Olvidaste tu contraseña?</button>
              {error ? <p className="entry-error">{error}</p> : null}
              <button className="simple-access-primary" type="submit">Entrar <Icon name="arrow" /></button>
            </form>
            <button className="simple-access-secondary" type="button" onClick={() => { setError(''); setMode('signup') }}>No tengo cuenta, crear una</button>
            <button className="entry-back" type="button" onClick={() => { setError(''); setMode('menu') }}>‹ Volver</button>
          </section>
        ) : mode === 'recover' ? (
          <section className="simple-access" aria-labelledby="recover-title">
            <span className="simple-access-kicker">RECUPERAR CLAVE</span>
            <h1 id="recover-title">Recupera tu cuenta<span>.</span></h1>
            <form className="entry-form" onSubmit={onRecover}>
              <label>Correo electrónico<input name="email" type="email" required autoComplete="email" defaultValue={savedEmail} placeholder="tucorreo@ejemplo.com" /></label>
              <p className="entry-hint">Te enviaremos un correo para restablecer tu contraseña.</p>
              {error ? <p className="entry-error">{error}</p> : null}
              <button className="simple-access-primary" type="submit">Enviar enlace <Icon name="arrow" /></button>
            </form>
            <button className="entry-back" type="button" onClick={() => { setError(''); setMode('login') }}>‹ Volver a iniciar sesión</button>
          </section>
        ) : mode === 'signup' ? (
          <section className="simple-access" aria-labelledby="signup-title">
            <span className="simple-access-kicker">CREAR CUENTA</span>
            <h1 id="signup-title">Crea tu espacio<span>.</span></h1>
            <form className="entry-form" onSubmit={onSignup}>
              <label>Nombre completo<input name="name" required minLength={3} maxLength={80} autoComplete="name" placeholder="Tu nombre y apellido" /></label>
              <label>Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com" /></label>
              <div className="entry-row">
                <label>Contraseña<PasswordInput name="password" required minLength={PASS_MIN} autoComplete="new-password" placeholder={`Mínimo ${PASS_MIN}`} /></label>
                <label>Repetir contraseña<PasswordInput name="confirm" required minLength={PASS_MIN} autoComplete="new-password" placeholder="Repite la clave" /></label>
              </div>
              <div className="entry-row">
                <label>Teléfono<input name="phone" type="tel" required pattern="^[+]?[\d\s()-]{7,20}$" placeholder="+58 412 000 0000" /></label>
                <label>Cédula
                  <div className="entry-id">
                    <select name="idType" defaultValue="V" aria-label="Tipo de cédula">
                      <option value="V">V</option>
                      <option value="E">E</option>
                      <option value="R">R</option>
                    </select>
                    <input name="idNumber" required inputMode="numeric" pattern="\d{5,10}" placeholder="12345678" />
                  </div>
                </label>
              </div>
              <label>Instagram<input name="instagram" placeholder="@tuusuario" maxLength={60} /></label>
              <div className="entry-captcha">
                <label className="entry-robot">
                  <input type="checkbox" checked={robot} onChange={(e) => setRobot(e.target.checked)} />
                  <span>No soy un robot</span>
                </label>
                <label className="entry-math">¿Cuánto es {captcha.a} + {captcha.b}?<input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} inputMode="numeric" placeholder="Respuesta" /></label>
              </div>
              {error ? <p className="entry-error">{error}</p> : null}
              <button className="simple-access-primary" type="submit" disabled={signingUp}>{signingUp ? 'Creando cuenta…' : 'Crear cuenta'} <Icon name="arrow" /></button>
            </form>
            <button className="simple-access-secondary" type="button" onClick={() => { setError(''); setMode('login') }}>Ya tengo cuenta, iniciar sesión</button>
            <button className="entry-back" type="button" onClick={() => { setError(''); setMode('menu') }}>‹ Volver</button>
          </section>
        ) : (
          <section className="simple-access entry-waiting" role="status" aria-live="polite">
            <span className="entry-confirm-icon"><Icon name="check" /></span>
            <h1>Usuario registrado</h1>
            <p>Tu cuenta está <b>esperando verificación</b>. El administrador debe permitir tu acceso.</p>
            <button className="simple-access-primary" type="button" onClick={finish}>Entrar <Icon name="arrow" /></button>
          </section>
        )}
      </main>
    </div>
  )
}
