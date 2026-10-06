import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppData,
  ClientFilter,
  PaymentFilter,
  View,
} from '../types'
import { VIEWS } from '../types'
import { clone, loadData, loadDataFrom, persistTo } from '../lib/storage'
import { computeStats, money as fmtMoney, month, TODAY, type Stats } from '../lib/utils'
import { isSupabaseEnabled } from '../lib/supabase'
import {
  cloudAddUsage,
  cloudBackupNow,
  cloudEnsureProfile,
  cloudGetAppSettings,
  cloudGetSessionUserId,
  cloudOnAuth,
  loadCloudData,
  mergeLocalCloud,
  saveCloudData,
  type CloudProfileRow,
} from '../lib/cloud'

export type ModalState =
  | { kind: 'client-form'; id?: string }
  | { kind: 'session-form'; id?: string; date?: string }
  | { kind: 'payment-form'; id?: string; receive?: boolean }
  | { kind: 'routine-form'; id?: string }
  | { kind: 'measurement-form'; id?: string }
  | { kind: 'assign-routine'; id: string }
  | { kind: 'membership' }
  | { kind: 'start-empty' }
  | { kind: 'import-confirm'; candidate: AppData }

export interface UiState {
  query: string
  clientFilter: ClientFilter
  paymentFilter: PaymentFilter
  calendarDate: string
  calendarMonth: string
  progressClient: string
  selectedClient: string
  focusSession: string
  expenseMonth: string
}

interface AppContextValue {
  entered: boolean
  enter: () => void
  leave: () => void
  data: AppData
  storageAvailable: boolean
  ui: UiState
  patchUi: (patch: Partial<UiState>) => void
  view: View
  go: (view: View) => void
  goBack: () => void
  money: (n: number | string) => string
  stats: Stats
  commit: (mutator: (draft: AppData) => void) => void
  replaceData: (data: AppData) => void
  setStorageAvailable: (value: boolean) => void
  toastMessage: string | null
  toast: (message: string) => void
  modal: ModalState | null
  openModal: (modal: ModalState) => void
  closeModal: () => void
  cloudEnabled: boolean
  cloudUser: string | null
  cloudProfile: CloudProfileRow | null
  cloudReady: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

function initialView(): View {
  const v = location.hash.slice(1) as View
  return VIEWS.includes(v) ? v : 'inicio'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(() => {
    try { return sessionStorage.getItem('protrainer.entered') === 'yes' } catch { return false }
  })
  const loaded = useRef(loadData())
  const [data, setData] = useState<AppData>(loaded.current.data)
  const dataRef = useRef(data)
  dataRef.current = data
  const [storageAvailable, setStorageAvailable] = useState(
    loaded.current.storageAvailable,
  )
  const [view, setView] = useState<View>(initialView)
  const viewRef = useRef(view)
  viewRef.current = view
  const prevView = useRef<View>('inicio')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cloudUser, setCloudUser] = useState<string | null>(null)
  const [cloudProfile, setCloudProfile] = useState<CloudProfileRow | null>(null)
  const [cloudReady, setCloudReady] = useState(!isSupabaseEnabled)
  const cloudUserRef = useRef<string | null>(null)
  cloudUserRef.current = cloudUser
  const storageKeyRef = useRef('protrainer.local.v1')
  const loadedUidRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  const cloudLoadedRef = useRef(false)
  const backupEnabledRef = useRef(true)
  const lastBackupRef = useRef(0)
  const cloudPushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushCloud = useCallback(async (uid: string, snapshot: AppData): Promise<string | null> => {
    const err = await saveCloudData(uid, snapshot)
    if (!err) {
      dirtyRef.current = false
      // Respaldo automático (salvavidas): como máximo cada 2 minutos.
      if (backupEnabledRef.current && Date.now() - lastBackupRef.current > 120000) {
        lastBackupRef.current = Date.now()
        void cloudBackupNow(uid, snapshot)
      }
    }
    return err
  }, [])

  const [ui, setUi] = useState<UiState>(() => ({
    query: '',
    clientFilter: 'activos',
    paymentFilter: 'todos',
    calendarDate: TODAY,
    calendarMonth: month(TODAY),
    progressClient:
      loaded.current.data.clients.find((c) => !c.archived)?.id ?? '',
    selectedClient: '',
    focusSession: '',
    expenseMonth: month(TODAY),
  }))

  const patchUi = useCallback((patch: Partial<UiState>) => {
    setUi((prev) => ({ ...prev, ...patch }))
  }, [])

  const enter = useCallback(() => {
    try { sessionStorage.setItem('protrainer.entered', 'yes') } catch { /* Temporary browser session */ }
    setEntered(true)
  }, [])
  const leave = useCallback(() => {
    // Sube los cambios pendientes a la nube antes de salir.
    if (isSupabaseEnabled && cloudUserRef.current && !dataRef.current.demo) {
      void saveCloudData(cloudUserRef.current, dataRef.current)
    }
    try { sessionStorage.removeItem('protrainer.entered') } catch { /* Temporary browser session */ }
    // La copia local es POR USUARIO (protrainer.local.<uid>), así NO se borra:
    // otra cuenta no la verá y el mismo usuario no pierde nada si algo falló al subir.
    setEntered(false)
    location.hash = 'bienvenida'
    window.scrollTo(0, 0)
  }, [])

  const go = useCallback((next: View) => {
    const v = VIEWS.includes(next) ? next : 'inicio'
    const from = viewRef.current
    if (from !== v && from !== 'notificaciones') {
      prevView.current = from
    }
    setView(v)
    if (location.hash.slice(1) !== v) location.hash = v
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  const goBack = useCallback(() => {
    go(prevView.current)
  }, [go])

  useEffect(() => {
    const onHash = () => {
      const v = location.hash.slice(1) as View
      setView(VIEWS.includes(v) ? v : 'inicio')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const toast = useCallback((message: string) => {
    setToastMessage(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMessage(null), 3500)
  }, [])

  const commit = useCallback(
    (mutator: (draft: AppData) => void) => {
      const draft = clone(dataRef.current)
      mutator(draft)
      draft.updatedAt = Date.now()
      dataRef.current = draft
      setData(draft)
      const ok = persistTo(storageKeyRef.current, draft)
      setStorageAvailable(ok)
      if (!ok) {
        toast('No se pudo guardar: exporta un respaldo antes de cerrar.')
      }
      if (isSupabaseEnabled && cloudUserRef.current && !draft.demo) {
        dirtyRef.current = true
        if (cloudPushTimer.current) clearTimeout(cloudPushTimer.current)
        const uid = cloudUserRef.current
        // Guardado inmediato (no diferido): evita perder cambios si sales rápido.
        void pushCloud(uid, dataRef.current).then((err) => {
          if (err === 'USERNAME') {
            toast('Ese nombre de usuario ya está en uso. Elige otro.')
            commit((d) => { d.profile.username = undefined })
          } else if (err) {
            toast(`No se pudo guardar en la nube (${err}).`)
          }
        })
      }
    },
    [toast, pushCloud],
  )

  const replaceData = useCallback((next: AppData) => {
    dataRef.current = next
    setData(next)
    setStorageAvailable(persistTo(storageKeyRef.current, next))
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled) return
    cloudGetAppSettings().then((s) => { if (s) backupEnabledRef.current = s.backup_enabled })
  }, [])

  // Registra el tiempo de uso del entrenador (para la analítica del admin).
  useEffect(() => {
    if (!isSupabaseEnabled) return
    let last = Date.now()
    const flush = () => {
      const uid = cloudUserRef.current
      if (!uid) return
      const secs = Math.round((Date.now() - last) / 1000)
      last = Date.now()
      if (secs > 0) void cloudAddUsage(secs)
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') last = Date.now()
      else flush()
    }
    const id = window.setInterval(flush, 60000)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      flush()
      window.clearInterval(id)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled) return
    let alive = true
    const handle = async (uid: string | null, event: string) => {
      if (!alive) return
      setCloudUser(uid)
      if (!uid) {
        setCloudProfile(null)
        setCloudReady(true)
        return
      }
      const prof = await cloudEnsureProfile(uid)
      if (!alive) return
      setCloudProfile(prof)
      // Solo recargamos datos al iniciar sesión (no en cada refresh de token,
      // para no pisar cambios locales que aún no se han subido).
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // Detecta cambio de cuenta: si el usuario es distinto al cargado, arrancamos
        // desde cero (su copia local o vacío), NUNCA con la memoria del usuario anterior.
        const switched = loadedUidRef.current !== uid
        loadedUidRef.current = uid
        if (switched) dirtyRef.current = false
        // Copia local POR USUARIO: evita ver datos de otra cuenta y protege datos sin subir.
        const scopedKey = `protrainer.local.${uid}`
        storageKeyRef.current = scopedKey
        const scoped = loadDataFrom(scopedKey)
        // Si no hay copia de ESTE usuario, `scoped.data` es un espacio vacío (demo).
        const base = scoped.data
        if (base !== dataRef.current) { dataRef.current = base; setData(base) }
        if (!switched && dirtyRef.current) {
          // Hay cambios locales sin subir: no los pisamos, los empujamos.
          await pushCloud(uid, dataRef.current)
          cloudLoadedRef.current = true
        } else {
          const fresh = await loadCloudData(uid, base.profile)
          if (alive && fresh) {
            // Nunca se pisa lo local: se combina con la nube (gana la versión más reciente).
            const result = base.demo ? fresh : mergeLocalCloud(base, fresh)
            replaceData(result)
            cloudLoadedRef.current = true
            // Si había borrados pendientes, limpia la nube (por si un borrado previo no se aplicó).
            if (result.deleted && result.deleted.length) void pushCloud(uid, result)
          }
        }
      }
      setCloudReady(true)
    }
    cloudGetSessionUserId().then((uid) => handle(uid, 'INITIAL_SESSION'))
    const unsub = cloudOnAuth(handle)
    return () => {
      alive = false
      unsub()
    }
  }, [replaceData])

  // Sube los cambios pendientes al cerrar/ocultar la pestaña.
  useEffect(() => {
    if (!isSupabaseEnabled) return
    const flush = () => {
      const uid = cloudUserRef.current
      if (uid && cloudLoadedRef.current) void pushCloud(uid, dataRef.current)
    }
    const onVis = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [pushCloud])

  const money = useCallback(
    (n: number | string) => fmtMoney(data.profile.currency, n),
    [data.profile.currency],
  )

  const stats = useMemo(() => computeStats(data), [data])

  const value: AppContextValue = {
    entered,
    enter,
    leave,
    data,
    storageAvailable,
    ui,
    patchUi,
    view,
    go,
    goBack,
    money,
    stats,
    commit,
    replaceData,
    setStorageAvailable,
    toastMessage,
    toast,
    modal,
    openModal: setModal,
    closeModal: () => setModal(null),
    cloudEnabled: isSupabaseEnabled,
    cloudUser,
    cloudProfile,
    cloudReady,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
