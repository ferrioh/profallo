import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { GYMS, PASS_MIN, login as doLogin, signup as doSignup } from '../lib/auth'

const SLIDES = [
  'assets/trainer-hero-v2.png',
  'assets/home-athlete.png',
  'assets/coach.png',
]

export function PublicHome() {
  const { enter, go, toast } = useApp()
  const [mode, setMode] = useState<'menu' | 'login' | 'signup' | 'waiting'>('login')
  const [error, setError] = useState('')
  const [slide, setSlide] = useState(0)
  const [captcha, setCaptcha] = useState(() => ({ a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) }))
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [robot, setRobot] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000)
    return () => window.clearInterval(timer)
  }, [])

  function refreshCaptcha() {
    setCaptcha({ a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) })
    setCaptchaAnswer('')
    setRobot(false)
  }

  function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const res = doLogin(x.email ?? '', x.password ?? '')
    if (!res.ok) { setError(res.error ?? 'No se pudo iniciar sesión.'); return }
    toast(`Hola, ${res.account?.name}.`)
    enter()
    go('inicio')
  }

  function onSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const res = doSignup({
      name: x.name ?? '',
      email: x.email ?? '',
      password: x.password ?? '',
      confirm: x.confirm ?? '',
      phone: x.phone ?? '',
      idNumber: x.idNumber ?? '',
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
        <div className="public-brand"><span className="brand-mark">p<span>↗</span></span>profallo<span className="brand-dot">.</span></div>
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
              <label>Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com" /></label>
              <label>Contraseña<input name="password" type="password" required autoComplete="current-password" placeholder="Tu contraseña" /></label>
              {error ? <p className="entry-error">{error}</p> : null}
              <button className="simple-access-primary" type="submit">Entrar <Icon name="arrow" /></button>
            </form>
            <button className="simple-access-secondary" type="button" onClick={() => { setError(''); setMode('signup') }}>No tengo cuenta, crear una</button>
            <button className="entry-back" type="button" onClick={() => { setError(''); setMode('menu') }}>‹ Volver</button>
          </section>
        ) : mode === 'signup' ? (
          <section className="simple-access" aria-labelledby="signup-title">
            <span className="simple-access-kicker">CREAR CUENTA</span>
            <h1 id="signup-title">Crea tu espacio<span>.</span></h1>
            <form className="entry-form" onSubmit={onSignup}>
              <label>Nombre completo<input name="name" required minLength={3} maxLength={80} autoComplete="name" placeholder="Tu nombre y apellido" /></label>
              <label>Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com" /></label>
              <div className="entry-row">
                <label>Contraseña<input name="password" type="password" required minLength={PASS_MIN} autoComplete="new-password" placeholder={`Mínimo ${PASS_MIN}`} /></label>
                <label>Repetir contraseña<input name="confirm" type="password" required minLength={PASS_MIN} autoComplete="new-password" placeholder="Repite la clave" /></label>
              </div>
              <div className="entry-row">
                <label>Teléfono<input name="phone" type="tel" required pattern="^[+]?[\d\s()-]{7,20}$" placeholder="+58 412 000 0000" /></label>
                <label>Cédula<input name="idNumber" required pattern="^[A-Za-z0-9-]{5,20}$" placeholder="V-00000000" /></label>
              </div>
              <label>Gimnasio donde trabajas
                <select name="gym" required defaultValue="">
                  <option value="" disabled>Selecciona tu gimnasio</option>
                  {GYMS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label>Instagram<input name="instagram" placeholder="@tuusuario" maxLength={60} /></label>
              <div className="entry-captcha">
                <label className="entry-robot">
                  <input type="checkbox" checked={robot} onChange={(e) => setRobot(e.target.checked)} />
                  <span>No soy un robot</span>
                </label>
                <label className="entry-math">¿Cuánto es {captcha.a} + {captcha.b}?<input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} inputMode="numeric" placeholder="Respuesta" /></label>
              </div>
              {error ? <p className="entry-error">{error}</p> : null}
              <button className="simple-access-primary" type="submit">Crear cuenta <Icon name="arrow" /></button>
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
