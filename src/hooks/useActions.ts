import { useApp } from '../context/AppContext'
import { month } from '../lib/utils'

export function useActions() {
  const { data, openModal, toast, patchUi, ui, view } = useApp()
  const active = data.clients.filter((c) => !c.archived)

  return {
    newClient: () => openModal({ kind: 'client-form' }),
    editClient: (id?: string) => openModal({ kind: 'client-form', id }),
    clientDetail: (id: string) => openModal({ kind: 'client-detail', id }),
    newSession: (date?: string) => {
      if (!active.length) {
        toast('Añade un cliente antes de programar sesiones.')
        return
      }
      openModal({ kind: 'session-form', date })
    },
    editSession: (id: string) => openModal({ kind: 'session-form', id }),
    newPayment: () => {
      if (!active.length) {
        toast('Añade un cliente antes de registrar pagos.')
        return
      }
      openModal({ kind: 'payment-form' })
    },
    editPayment: (id: string) => openModal({ kind: 'payment-form', id }),
    receivePayment: (id: string) =>
      openModal({ kind: 'payment-form', id, receive: true }),
    newRoutine: () => openModal({ kind: 'routine-form' }),
    editRoutine: (id: string) => openModal({ kind: 'routine-form', id }),
    assignRoutine: (id: string) => {
      if (!active.length) {
        toast('Añade un cliente primero.')
        return
      }
      openModal({ kind: 'assign-routine', id })
    },
    newMeasurement: () => {
      if (!active.length) {
        toast('Añade un cliente antes de registrar mediciones.')
        return
      }
      openModal({ kind: 'measurement-form' })
    },
    selectDay: (date: string) => {
      patchUi({
        calendarDate: date,
        ...(view === 'calendario' ? { calendarMonth: month(date) } : {}),
      })
    },
    ui,
  }
}
