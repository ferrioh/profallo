import { useApp } from '../context/AppContext'
import { month } from '../lib/utils'

export function useActions() {
  const { data, openModal, toast, patchUi, ui, view, go } = useApp()
  const active = data.clients.filter((c) => !c.archived)

  return {
    newClient: () => {
      openModal({ kind: 'client-form' })
    },
    openMembership: () => openModal({ kind: 'membership' }),
    editClient: (id?: string) => openModal({ kind: 'client-form', id }),
    clientDetail: (id: string) => { patchUi({ selectedClient: id }); go('cliente-perfil') },
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
    editMeasurement: (id: string) => openModal({ kind: 'measurement-form', id }),
    selectDay: (date: string) => {
      patchUi({
        calendarDate: date,
        ...(view === 'calendario' ? { calendarMonth: month(date) } : {}),
      })
    },
    focusSession: (id: string) => {
      const session = data.sessions.find((s) => s.id === id)
      if (!session) return
      patchUi({ selectedClient: session.client, focusSession: session.id })
      go('cliente-perfil')
    },
    ui,
  }
}
