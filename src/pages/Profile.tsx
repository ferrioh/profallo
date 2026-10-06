import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useApp } from '../context/AppContext'
import { Icon, type IconName } from '../components/Icon'
import { PageHead } from '../components/ui'
import { Verified } from '../components/Layout'
import { CoachStage } from './Dashboard'
import { ImageEditor } from '../components/ImageEditor'
import { fileToDataUrl } from '../lib/image'
import { planOf, trialDaysLeft } from '../lib/plans'
import { logout } from '../lib/auth'
import { cloudSignOut, cloudChangePassword, cloudLatestBackup } from '../lib/cloud'
import { PasswordInput } from '../components/PasswordInput'
import { socialUrl } from '../lib/social'

const CURRENCIES = ['USD', 'EUR', 'VES']

export function ProfilePage() {
  const { data, stats, commit, toast, openModal, leave, cloudEnabled, cloudUser, replaceData } = useApp()
  const photoInput = useRef<HTMLInputElement>(null)
  const [openOpt, setOpenOpt] = useState<string | null>(null)
  const [editSrc, setEditSrc] = useState<string | null>(null)
  const count = data.sessions.filter((x) => x.status === 'Completada').length
  const plan = planOf(data.profile.membership)
  const totalExercises = data.routines.reduce((n, r) => n + r.exercises.length, 0)
  const categories = new Set(data.routines.map((r) => r.category)).size

  function handleLogout() {
    if (cloudEnabled) void cloudSignOut()
    else logout()
    leave()
  }

  async function changePhoto(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Sube una imagen.'); return }
    try { setEditSrc(await fileToDataUrl(file)) } catch { toast('No se pudo abrir la imagen.') }
  }

  function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (!x.name.trim()) { toast('Escribe tu nombre.'); return }
    commit((d) => {
      d.profile = {
        ...d.profile,
        name: x.name.trim(),
        specialty: x.specialty.trim(),
        currency: x.currency,
        email: (x.email ?? '').trim(),
        phone: (x.phone ?? '').trim(),
        idNumber: (x.idNumber ?? '').trim(),
        instagram: (x.instagram ?? '').trim(),
        tiktok: (x.tiktok ?? '').trim(),
      }
    })
    toast('Perfil actualizado.')
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const x = Object.fromEntries(new FormData(form)) as Record<string, string>
    if (!cloudEnabled) { toast('Disponible con tu cuenta en la nube.'); return }
    if ((x.next ?? '').length < 8) { toast('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (x.next !== x.confirm) { toast('Las contraseñas nuevas no coinciden.'); return }
    const res = await cloudChangePassword(data.profile.email ?? '', x.current ?? '', x.next ?? '')
    if (!res.ok) { toast(res.error ?? 'No se pudo cambiar la contraseña.'); return }
    toast('Contraseña actualizada.')
    form.reset()
  }

  async function restoreBackup() {
    if (!cloudEnabled || !cloudUser) { toast('Disponible con tu cuenta en la nube.'); return }
    if (!window.confirm('¿Restaurar el último respaldo? Reemplazará tus datos actuales.')) return
    const backup = await cloudLatestBackup(cloudUser)
    if (!backup) { toast('No hay respaldos disponibles.'); return }
    replaceData(backup)
    toast('Respaldo restaurado.')
  }

  const SUPPORT_NUMBER = '584221126199'
  const supportText = `Hola necesito ayuda +${SUPPORT_NUMBER}. Soy ${data.profile.name}${data.profile.idNumber ? ` · Cédula ${data.profile.idNumber}` : ''}${data.profile.email ? ` · ${data.profile.email}` : ''}${data.profile.phone ? ` · Tel ${data.profile.phone}` : ''}`
  const waHref = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(supportText)}`

  const toggle = (k: string) => setOpenOpt((prev) => (prev === k ? null : k))

  function Option({ id, icon, label, meta, children }: { id: string; icon: IconName; label: string; meta?: string; children: ReactNode }) {
    const open = openOpt === id
    return (
      <section className={`profile-option ${open ? 'open' : ''}`}>
        <button className="profile-option-head" type="button" onClick={() => toggle(id)} aria-expanded={open}>
          <span className="profile-option-icon"><Icon name={icon} /></span>
          <span className="profile-option-title">{label}</span>
          {meta ? <span className="profile-option-meta">{meta}</span> : null}
          <span className="profile-option-chev"><Icon name={open ? 'chevronUp' : 'chevronDown'} /></span>
        </button>
        {open ? <div className="profile-option-body">{children}</div> : null}
      </section>
    )
  }

  return (
    <>
      <PageHead
        k="TU PERFIL / PROFALLO."
        title={
          <>
            {data.profile.name}
            {data.profile.verified ? <Verified /> : null}
          </>
        }
        sub="Tu identidad y lo que estás construyendo con tu equipo."
        actions={
          <button className="button glass-button" onClick={handleLogout}>
            <Icon name="close" /> Cerrar sesión
          </button>
        }
      />
      <CoachStage full />
      <div className="profile-photo-action">
        <input ref={photoInput} type="file" accept="image/*" hidden onChange={e => changePhoto(e.target.files?.[0])} />
        <button className="button" onClick={() => photoInput.current?.click()}><Icon name="edit" /> Cambiar foto</button>
        {data.profile.photo ? <button className="button" onClick={() => setEditSrc(data.profile.photo ?? null)}><Icon name="crop" /> Editar foto</button> : null}
        <span className="trial-note">{plan.id === 'premium' ? 'Premium activo' : `Prueba gratis: ${trialDaysLeft(data.profile.trialStart)} días`}</span>
      </div>

      <div className="profile-options">
        <Option id="nombre" icon="edit" label="Cambiar nombre y datos" meta={data.profile.name}>
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <div className="full">
                <label htmlFor="pName">Nombre del entrenador</label>
                <input id="pName" name="name" defaultValue={data.profile.name} required maxLength={80} />
              </div>
              <div className="full">
                <label htmlFor="pSpecialty">Especialidad</label>
                <input id="pSpecialty" name="specialty" defaultValue={data.profile.specialty} maxLength={120} />
              </div>
              <div>
                <label htmlFor="pCurrency">Moneda</label>
                <select id="pCurrency" name="currency" defaultValue={data.profile.currency}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pPhone">WhatsApp / Teléfono</label>
                <input id="pPhone" name="phone" defaultValue={data.profile.phone} maxLength={40} placeholder="+58 422 112 6199" />
              </div>
              <div>
                <label htmlFor="pId">Cédula / Documento</label>
                <input id="pId" name="idNumber" defaultValue={data.profile.idNumber} maxLength={40} />
              </div>
              <div className="full">
                <label htmlFor="pEmail">Correo electrónico</label>
                <input id="pEmail" name="email" type="email" defaultValue={data.profile.email} maxLength={120} placeholder="tucorreo@ejemplo.com" />
              </div>
              <div>
                <label htmlFor="pInstagram">Instagram</label>
                <input id="pInstagram" name="instagram" defaultValue={data.profile.instagram} maxLength={80} placeholder="@usuario" />
              </div>
              <div>
                <label htmlFor="pTiktok">TikTok</label>
                <input id="pTiktok" name="tiktok" defaultValue={data.profile.tiktok} maxLength={80} placeholder="@usuario" />
              </div>
            </div>
            <div className="form-foot">
              <button className="button primary" type="submit">Guardar <Icon name="check" /></button>
            </div>
          </form>
        </Option>

        <Option id="clave" icon="eye" label="Cambiar contraseña">
          <form onSubmit={changePassword}>
            <div className="form-grid">
              <div className="full">
                <label htmlFor="pOldPass">Contraseña actual</label>
                <PasswordInput id="pOldPass" name="current" required autoComplete="current-password" placeholder="Tu contraseña actual" />
              </div>
              <div>
                <label htmlFor="pNewPass">Nueva contraseña</label>
                <PasswordInput id="pNewPass" name="next" required minLength={8} autoComplete="new-password" placeholder="Mínimo 8" />
              </div>
              <div>
                <label htmlFor="pNewPass2">Repetir nueva</label>
                <PasswordInput id="pNewPass2" name="confirm" required minLength={8} autoComplete="new-password" placeholder="Repite la nueva" />
              </div>
            </div>
            <div className="form-foot">
              <button className="button primary" type="submit">Cambiar contraseña <Icon name="check" /></button>
            </div>
          </form>
        </Option>

        <Option id="impacto" icon="chart" label="Tu impacto">
          <div className="impact-numbers">
            <div><b>{stats.active}</b><span>clientes activos</span></div>
            <div><b>{count}</b><span>sesiones completadas</span></div>
            <div><b>{data.routines.length}</b><span>rutinas diseñadas</span></div>
          </div>
        </Option>

        <Option id="rutinas" icon="dumbbell" label="Métricas de rutinas" meta={`${data.routines.length} creadas`}>
          <div className="impact-numbers">
            <div><b>{data.routines.length}</b><span>rutinas creadas</span></div>
            <div><b>{totalExercises}</b><span>ejercicios en total</span></div>
            <div><b>{categories}</b><span>enfoques distintos</span></div>
          </div>
        </Option>

        <Option id="respaldo" icon="download" label="Respaldo y restauración" meta="Salvavidas">
          <div className="legal-text">
            <p>Tus datos se respaldan automáticamente en la nube (se guardan los 5 más recientes). Si algo se borra, puedes restaurar el último respaldo.</p>
            <button className="button primary" type="button" onClick={restoreBackup}><Icon name="up" /> Restaurar último respaldo</button>
          </div>
        </Option>

        <Option id="legal" icon="eye" label="Uso y privacidad">
          <div className="legal-text">
            <h4>Términos de uso</h4>
            <p>Profallo es una herramienta de gestión para entrenadores. Eres responsable de la información que registras y de su uso con tus clientes.</p>
            <h4>Privacidad</h4>
            <p>Tus datos y los de tus clientes se guardan en este dispositivo. No se comparten con terceros ni se venden. Puedes exportar un respaldo o eliminarlos cuando quieras.</p>
          </div>
        </Option>

        <Option id="soporte" icon="whatsapp" label="Soporte">
          <div className="legal-text">
            <p>¿Necesitas ayuda o quieres una función nueva? Escríbeme directo por WhatsApp.</p>
            <a className="whatsapp-btn" href={waHref} target="_blank" rel="noopener noreferrer">
              <span className="whatsapp-icon"><Icon name="whatsapp" /></span>
              <span>Escribir por WhatsApp</span>
            </a>
          </div>
        </Option>
      </div>

      <section className="card white profile-membership">
        <div className="section-line">
          <div>
            <span className="eyebrow">TU MEMBRESÍA</span>
            <h2>
              {plan.name}
              {data.profile.verified ? ' · Verificado' : ''}
            </h2>
          </div>
          <span className={`admin-plan-badge ${plan.id}`}>
            {plan.price === 0 ? 'Gratis' : `$${plan.price}/mes`}
          </span>
        </div>
        <p>{plan.tagline}</p>
        {plan.id === 'free' ? (
          <p className="trial-note">Te quedan <b>{trialDaysLeft(data.profile.trialStart)}</b> días de prueba gratis con todo incluido.</p>
        ) : null}
        <button className="button primary" onClick={() => openModal({ kind: 'membership' })}>
          <Icon name="up" /> {plan.id === 'premium' ? 'Gestionar membresía' : 'Hacer Premium'}
        </button>
      </section>

      <footer className="profile-social">
        <div className="profile-social-icons">
          <a className="social-icon" href={socialUrl('instagram', data.profile.instagram) || '#'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" onClick={(e) => { if (!data.profile.instagram) e.preventDefault() }}>
            <Icon name="instagram" />
          </a>
          <a className="social-icon" href={socialUrl('tiktok', data.profile.tiktok) || '#'} target="_blank" rel="noopener noreferrer" aria-label="TikTok" onClick={(e) => { if (!data.profile.tiktok) e.preventDefault() }}>
            <Icon name="tiktok" />
          </a>
        </div>
        <p className="profile-copyright">© Profallo by Ferrioh 2026</p>
      </footer>
      {editSrc ? (
        <ImageEditor
          src={editSrc}
          onCancel={() => setEditSrc(null)}
          onSave={(dataUrl) => {
            commit((d) => { d.profile.photo = dataUrl })
            setEditSrc(null)
            toast('Foto actualizada.')
          }}
        />
      ) : null}
    </>
  )
}
