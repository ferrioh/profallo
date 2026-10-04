import { useRef, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { exportClients, exportData } from '../lib/backup'
import { validData } from '../lib/storage'

const CURRENCIES = ['USD', 'EUR', 'VES']

export function SettingsPage() {
  const { data, commit, toast, openModal } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  function onProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (!x.name.trim()) {
      toast('Escribe el nombre del entrenador.')
      return
    }
    commit((d) => {
      d.profile = {
        ...d.profile,
        name: x.name.trim(),
        specialty: x.specialty.trim(),
        currency: x.currency,
      }
    })
    toast('Perfil actualizado.')
  }

  async function onImport(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    try {
      if (file.size > 8 * 1024 * 1024)
        throw new Error('El respaldo supera el tamaño permitido (8 MB).')
      const candidate = JSON.parse(await file.text())
      if (!validData(candidate))
        throw new Error('El archivo no es un respaldo válido de ProTrainer.')
      openModal({ kind: 'import-confirm', candidate })
    } catch (err) {
      toast((err as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <PageHead
        k="TU ESPACIO, A TU MANERA."
        title={
          <>
            Ajustes y respaldos<span style={{ color: 'var(--lime)' }}>.</span>
          </>
        }
        sub="Personaliza tu perfil y conserva una copia de tus registros."
      />
      <div className="settings-grid">
        <section className="card white">
          <h3>Perfil del entrenador</h3>
          <form id="profileForm" onSubmit={onProfileSubmit}>
            <div className="form-grid">
              <div className="full">
                <label htmlFor="coachInput">Nombre del entrenador</label>
                <input
                  id="coachInput"
                  name="name"
                  defaultValue={data.profile.name}
                  required
                  maxLength={80}
                />
              </div>
              <div className="full">
                <label htmlFor="specialtyInput">Especialidad</label>
                <input
                  id="specialtyInput"
                  name="specialty"
                  defaultValue={data.profile.specialty}
                  maxLength={120}
                />
              </div>
              <div>
                <label htmlFor="currencyInput">Moneda</label>
                <select
                  id="currencyInput"
                  name="currency"
                  defaultValue={data.profile.currency}
                >
                  {CURRENCIES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-foot">
              <button className="button dark" type="submit">
                Guardar perfil <Icon name="check" />
              </button>
            </div>
          </form>
        </section>
        <section className="card white">
          <h3>Tus datos, bajo tu control</h3>
          <p>
            Los registros se guardan en este navegador. Exporta un respaldo para
            conservarlos o llevarlos a otro equipo.
          </p>
          <div className="backup-actions">
            <button className="button dark" onClick={() => exportData(data)}>
              <Icon name="arrow" />
              Exportar respaldo JSON
            </button>
            <button
              className="button light"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="arrow" />
              Importar respaldo
            </button>
            <button
              className="button light"
              onClick={() => {
                exportClients(data)
                toast('Lista de clientes exportada.')
              }}
            >
              <Icon name="arrow" />
              Exportar clientes CSV
            </button>
          </div>
          <div className="alert-info">
            Aplicación local para un entrenador. Sin servidor, cuentas ni
            sincronización entre dispositivos. Los datos de ejemplo son
            ficticios. Guarda los respaldos en un lugar privado.
          </div>
          <button
            className="button light"
            style={{ marginTop: 20 }}
            onClick={() => openModal({ kind: 'start-empty' })}
          >
            Empezar sin datos de ejemplo
          </button>
        </section>
      </div>
      <input
        ref={fileRef}
        type="file"
        id="importFile"
        accept="application/json,.json"
        hidden
        onChange={(e) => onImport(e.target.files)}
      />
    </>
  )
}
