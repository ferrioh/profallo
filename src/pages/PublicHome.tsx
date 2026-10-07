import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { EntryLoader } from '../components/EntryLoader'
import { RotatingText } from '../components/RotatingText'
import { APP_VERSION } from '../version.generated'
import { PasswordInput } from '../components/PasswordInput'
import GlassSurface from '../components/GlassSurface'
import { PASS_MIN, login as doLogin, signup as doSignup } from '../lib/auth'
import { cloudGetProfile, cloudGetPublicSlides, cloudResetPassword, cloudSignIn, cloudSignOut, cloudSignUp } from '../lib/cloud'

const SLIDES = [
  'assets/trainer-hero-v2.png',
  'assets/home-athlete.png',
  'assets/coach.png',
]

const MOTTOS = [
  'La constancia, no la motivación, es lo que transforma.',
  'Cada serie cuenta. Cada cliente importa.',
  'Sé el entrenador que te habría cambiado la vida.',
  'El progreso se entrena todos los días.',
  'Grandes resultados nacen de pequeños hábitos.',
]

export function PublicHome() {
  const { enter, go, toast, cloudEnabled } = useApp()
  const [mode, setMode] = useState<'menu' | 'login' | 'signup' | 'waiting' | 'recover'>('menu')
  const [error, setError] = useState('')
  const [slide, setSlide] = useState(0)
  const [slides, setSlides] = useState<string[]>(SLIDES)
  const [phase, setPhase] = useState<'load' | 'out' | 'done'>('load')
  const [captcha, setCaptcha] = useState(() => ({ a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) }))
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [robot, setRobot] = useState(false)
  const [signingUp, setSigningUp] = useState(false)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({ name: '', email: '', password: '', confirm: '' })
  const savedEmail = (() => { try { return localStorage.getItem('profallo.email') || '' } catch { return '' } })()

  function goSignup() { setError(''); setStep(0); setMode('signup') }

  function persistEmail(email: string) {
    try { localStorage.setItem('profallo.email', email.trim()) } catch { /* ignore */ }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % (slides.length || 1)), 6000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  useEffect(() => {
    if (!cloudEnabled) return
    let alive = true
    cloudGetPublicSlides().then((s) => { if (alive && s.length) setSlides(s) })
    return () => { alive = false }
  }, [cloudEnabled])

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

  function step1Next(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if ((x.sName ?? '').trim().length < 3) { setError('Escribe tu nombre completo.'); return }
    if ((x.sPass ?? '').length < PASS_MIN) { setError(`La contraseña debe tener al menos ${PASS_MIN} caracteres.`); return }
    if (x.sPass !== x.sConfirm) { setError('Las contraseñas no coinciden.'); return }
    setDraft({ name: (x.sName ?? '').trim(), email: (x.sEmail ?? '').trim().toLowerCase(), password: x.sPass ?? '', confirm: x.sConfirm ?? '' })
    setStep(1)
  }

  async function onSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const idNumber = `${x.idType || 'V'}-${(x.idNumber ?? '').replace(/\D/g, '')}`
    const name = draft.name, email = draft.email, password = draft.password
    if (cloudEnabled) {
      if (!robot || Number(captchaAnswer) !== captcha.a + captcha.b) { setError('Confirma el captcha.'); refreshCaptcha(); return }
      setSigningUp(true)
      const res = await cloudSignUp(email, password, {
        name, phone: x.phone ?? '', idNumber, gym: '', instagram: x.instagram ?? '',
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
      name,
      email,
      password,
      confirm: draft.confirm,
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
        {slides.map((src, i) => (
          <div key={src} className={`entry-bg-slide ${i === slide ? 'active' : ''}`} style={{ backgroundImage: `url(${src})` }} />
        ))}
        <div className="entry-bg-shade" />
      </div>
      <div className="entry-slides" aria-hidden="true">
        {slides.map((src, i) => <span key={src} className={i === slide ? 'active' : ''} />)}
      </div>
      <header className="simple-entry-header">
        <div className="public-brand"><span className="brand-mark">p</span>profallo<span className="brand-dot">.</span></div>
      </header>
      <main className="simple-entry-main">
        {mode === 'menu' ? (
          <section className="entry-intro">
            <p className="entry-motto"><RotatingText phrases={MOTTOS} interval={20000} /></p>
            <div className="entry-start-wrap">
              <button className="entry-start" type="button" aria-label="Iniciar sesión" onClick={() => { setError(''); setMode('login') }}>
                Iniciar <Icon name="arrow" />
              </button>
            </div>
            <span className="entry-version">PROFALLO v{APP_VERSION}</span>
          </section>
        ) : mode === 'login' || mode === 'signup' ? (
          <GlassSurface className="auth-glass" width="100%" height="auto" borderRadius={26} backgroundOpacity={0.05} brightness={42} opacity={0.9} displace={0.7} distortionScale={-140}>
            <section className="simple-access auth-sheet">
            <div key={mode} className="auth-form-anim">
              {mode === 'login' ? (
                <form className="entry-form" onSubmit={onLogin}>
                  <header className="login-head">
                    <h1>Bienvenido de nuevo<span>.</span></h1>
                    <p>Inicia sesión para continuar tu evolución.</p>
                  </header>
                  <label className="login-field">Correo electrónico<input name="email" type="email" required autoComplete="email" defaultValue={savedEmail} placeholder="tucorreo@ejemplo.com" /></label>
                  <label className="login-field">Contraseña<PasswordInput name="password" required autoComplete="current-password" placeholder="Tu contraseña" /></label>
                  <button className="login-forgot" type="button" onClick={() => { setError(''); setMode('recover') }}>¿Olvidaste tu contraseña?</button>
                  {error ? <p className="entry-error">{error}</p> : null}
                  <button className="simple-access-primary" type="submit">Entrar <Icon name="arrow" /></button>
                  <div className="login-or"><span>o</span></div>
                  <button className="login-option" type="button" onClick={goSignup}>
                    <span className="login-option-l"><Icon name="user" />Crear cuenta</span><Icon name="arrow" />
                  </button>
                </form>
              ) : step === 0 ? (
                <form className="entry-form" onSubmit={step1Next}>
                  <header className="login-head">
                    <h1>Crea tu cuenta<span>.</span></h1>
                    <p>Paso 1 de 2 · Tus datos de acceso.</p>
                  </header>
                  <label className="login-field">Nombre completo<input name="sName" required minLength={3} maxLength={80} autoComplete="name" placeholder="Tu nombre y apellido" /></label>
                  <label className="login-field">Correo electrónico<input name="sEmail" type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com" /></label>
                  <div className="entry-row">
                    <label className="login-field">Contraseña<PasswordInput name="sPass" required minLength={PASS_MIN} autoComplete="new-password" placeholder={`Mínimo ${PASS_MIN}`} /></label>
                    <label className="login-field">Repetir contraseña<PasswordInput name="sConfirm" required minLength={PASS_MIN} autoComplete="new-password" placeholder="Repite la clave" /></label>
                  </div>
                  <button className="simple-access-primary" type="submit">Continuar <Icon name="arrow" /></button>
                  <div className="login-or"><span>o</span></div>
                  <button className="login-option" type="button" onClick={() => { setError(''); setMode('login') }}>
                    <span className="login-option-l"><Icon name="user" />Ya tengo cuenta</span><Icon name="arrow" />
                  </button>
                </form>
              ) : (
                <form className="entry-form" onSubmit={onSignup}>
                  <header className="login-head">
                    <h1>Tus datos<span>.</span></h1>
                    <p>Paso 2 de 2 · Completa tu perfil.</p>
                  </header>
                  <div className="entry-row">
                    <label className="login-field">Teléfono<input name="phone" type="tel" required pattern="^[+]?[\d\s()-]{7,20}$" placeholder="+58 412 000 0000" /></label>
                    <label className="login-field">Cédula
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
                  <label className="login-field">Instagram<input name="instagram" placeholder="@tuusuario" maxLength={60} /></label>
                  <div className="entry-captcha">
                    <label className="entry-robot">
                      <input type="checkbox" checked={robot} onChange={(e) => setRobot(e.target.checked)} />
                      <span>No soy un robot</span>
                    </label>
                    <label className="entry-math">¿Cuánto es {captcha.a} + {captcha.b}?<input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} inputMode="numeric" placeholder="Respuesta" /></label>
                  </div>
                  {error ? <p className="entry-error">{error}</p> : null}
                  <button className="simple-access-primary" type="submit" disabled={signingUp}>{signingUp ? 'Creando cuenta…' : 'Crear cuenta'} <Icon name="arrow" /></button>
                  <button className="entry-back" type="button" onClick={() => { setError(''); setStep(0) }}>‹ Atrás</button>
                </form>
              )}
            </div>
            </section>
          </GlassSurface>
        ) : mode === 'recover' ? (
          <section className="simple-access auth-sheet" aria-labelledby="recover-title">
            <div className="auth-form-anim">
              <header className="login-head">
                <h1 id="recover-title">Recuperar contraseña<span>.</span></h1>
                <p>Te enviaremos un enlace a tu correo.</p>
              </header>
              <form className="entry-form" onSubmit={onRecover}>
                <label className="login-field">Correo electrónico<input name="email" type="email" required autoComplete="email" defaultValue={savedEmail} placeholder="tucorreo@ejemplo.com" /></label>
                {error ? <p className="entry-error">{error}</p> : null}
                <button className="simple-access-primary" type="submit">Enviar enlace <Icon name="arrow" /></button>
                <div className="login-or"><span>o</span></div>
                <button className="login-option" type="button" onClick={() => { setError(''); setMode('login') }}>
                  <span className="login-option-l"><Icon name="user" />Iniciar sesión</span><Icon name="arrow" />
                </button>
              </form>
            </div>
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
