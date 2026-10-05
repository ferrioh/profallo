import type { AppData } from '../types'
import { download, TODAY } from './utils'

export function exportData(data: AppData) {
  download(
    `Profallo-respaldo-${TODAY}.json`,
    JSON.stringify(data, null, 2),
    'application/json',
  )
}

export function exportClients(data: AppData) {
  const rows: Array<Array<string | number>> = [
    ['Nombre', 'Email', 'Telefono', 'Objetivo', 'Plan', 'Mensualidad', 'Estado'],
    ...data.clients.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.goal,
      c.plan,
      c.fee,
      c.archived ? 'Archivado' : 'Activo',
    ]),
  ]
  const clean = (v: unknown) => {
    const s = String(v ?? '')
    return '"' + (/^[=+@-]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"'
  }
  download(
    `Profallo-clientes-${TODAY}.csv`,
    '\ufeff' + rows.map((r) => r.map(clean).join(',')).join('\r\n'),
    'text/csv; charset=utf-8',
  )
}
