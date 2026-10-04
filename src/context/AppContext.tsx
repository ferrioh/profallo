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
import { clone, loadData, persist } from '../lib/storage'
import { computeStats, money as fmtMoney, month, TODAY, type Stats } from '../lib/utils'

export type ModalState =
  | { kind: 'client-form'; id?: string }
  | { kind: 'client-detail'; id: string }
  | { kind: 'session-form'; id?: string; date?: string }
  | { kind: 'payment-form'; id?: string; receive?: boolean }
  | { kind: 'routine-form'; id?: string }
  | { kind: 'measurement-form' }
  | { kind: 'assign-routine'; id: string }
  | { kind: 'start-empty' }
  | { kind: 'import-confirm'; candidate: AppData }

export interface UiState {
  query: string
  clientFilter: ClientFilter
  paymentFilter: PaymentFilter
  calendarDate: string
  calendarMonth: string
  progressClient: string
  expenseMonth: string
}

interface AppContextValue {
  data: AppData
  storageAvailable: boolean
  ui: UiState
  patchUi: (patch: Partial<UiState>) => void
  view: View
  go: (view: View) => void
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
}

const AppContext = createContext<AppContextValue | null>(null)

function initialView(): View {
  const v = location.hash.slice(1) as View
  return VIEWS.includes(v) ? v : 'inicio'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const loaded = useRef(loadData())
  const [data, setData] = useState<AppData>(loaded.current.data)
  const dataRef = useRef(data)
  dataRef.current = data
  const [storageAvailable, setStorageAvailable] = useState(
    loaded.current.storageAvailable,
  )
  const [view, setView] = useState<View>(initialView)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [ui, setUi] = useState<UiState>(() => ({
    query: '',
    clientFilter: 'activos',
    paymentFilter: 'todos',
    calendarDate: TODAY,
    calendarMonth: month(TODAY),
    progressClient:
      loaded.current.data.clients.find((c) => !c.archived)?.id ?? '',
    expenseMonth: month(TODAY),
  }))

  const patchUi = useCallback((patch: Partial<UiState>) => {
    setUi((prev) => ({ ...prev, ...patch }))
  }, [])

  const go = useCallback((next: View) => {
    const v = VIEWS.includes(next) ? next : 'inicio'
    setView(v)
    if (location.hash.slice(1) !== v) location.hash = v
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

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
      dataRef.current = draft
      setData(draft)
      const ok = persist(draft)
      setStorageAvailable(ok)
      if (!ok) {
        toast('No se pudo guardar: exporta un respaldo antes de cerrar.')
      }
    },
    [toast],
  )

  const replaceData = useCallback((next: AppData) => {
    dataRef.current = next
    setData(next)
    setStorageAvailable(persist(next))
  }, [])

  const money = useCallback(
    (n: number | string) => fmtMoney(data.profile.currency, n),
    [data.profile.currency],
  )

  const stats = useMemo(() => computeStats(data), [data])

  const value: AppContextValue = {
    data,
    storageAvailable,
    ui,
    patchUi,
    view,
    go,
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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
