import type { AppData, Client, Payment, Routine } from '../types'

export const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

export const TODAY = iso(new Date())

export const parseDate = (s: string): Date => new Date(`${s}T12:00:00`)

export const addDays = (s: string, n: number): string => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export const month = (s: string): string => s.slice(0, 7)

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const COLORS = ['lime', 'blue', 'pink', 'purple'] as const

export const initials = (n: string | undefined | null): string =>
  String(n ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase()

export const clientPhotos: Record<string, string> = {
  c1: 'assets/client-valentina.png',
  c3: 'assets/client-sofia.png',
  c5: 'assets/client-daniela.png',
}

export const money = (currency: string, n: number | string): string =>
  new Intl.NumberFormat('es', {
    style: 'currency',
    currency: ['USD', 'EUR', 'VES'].includes(currency) ? currency : 'USD',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

export const longDate = (
  s: string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' },
): string => parseDate(s).toLocaleDateString('es', opts)

export const shortWeekday = (s: string): string =>
  parseDate(s).toLocaleDateString('es', { weekday: 'short' }).slice(0, 3)

export const paidStatus = (p: Payment): 'Pagado' | 'Vencido' | 'Pendiente' =>
  p.paid ? 'Pagado' : p.due < TODAY ? 'Vencido' : 'Pendiente'

export const findClient = (data: AppData, id: string): Client =>
  data.clients.find((c) => c.id === id) ?? {
    id,
    name: 'Cliente archivado',
    email: '',
    phone: '',
    birth: '',
    goal: '',
    plan: '',
    fee: 0,
    weight: null,
    height: null,
    routine: '',
    notes: '',
    tone: 0,
    archived: false,
    joined: '',
  }

export const findRoutine = (
  data: AppData,
  id: string | undefined,
): Routine | undefined => data.routines.find((r) => r.id === id)

export const progressFor = (data: AppData, id: string): number => {
  const sess = data.sessions.filter(
    (s) => s.client === id && s.date <= TODAY && s.status !== 'Cancelada',
  )
  return sess.length
    ? Math.round(
        (sess.filter((s) => s.status === 'Completada').length / sess.length) *
          100,
      )
    : 0
}

export interface Stats {
  active: number
  monthIncome: number
  pending: number
  todaySessions: AppData['sessions']
  late: number
}

export const computeStats = (data: AppData): Stats => ({
  active: data.clients.filter((c) => !c.archived).length,
  monthIncome: data.payments
    .filter((p) => p.paid && month(p.paidDate || p.due) === month(TODAY))
    .reduce((n, p) => n + Number(p.amount), 0),
  pending: data.payments
    .filter((p) => !p.paid)
    .reduce((n, p) => n + Number(p.amount), 0),
  todaySessions: data.sessions.filter(
    (s) => s.date === TODAY && s.status !== 'Cancelada',
  ),
  late: data.payments.filter((p) => !p.paid && p.due < TODAY).length,
})

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }) as Record<string, string>)[c] ?? c,
  )

export interface ShareFichaPayload {
  n: string
  g: string
  gym: string
  coach: string
  next?: { title: string; date: string; time: string; duration: number; routine?: string }
  w: number | string
  ms: Array<{ d: string; w: number; wa: number | null; f: number | null }>
  notes: string
}

function base64UrlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))
}

export function buildClientShareLink(client: Client, data: AppData): string {
  const sessions = data.sessions
    .filter((s) => s.client === client.id && s.status !== 'Cancelada' && s.date >= TODAY)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const next = sessions[0]
  const nextRoutine = next ? data.routines.find((r) => r.id === next.routine) : undefined
  const ms = data.measurements
    .filter((m) => m.client === client.id)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8)
    .map((m) => ({ d: m.date, w: m.weight, wa: m.waist, f: m.fat }))
  const payload: ShareFichaPayload = {
    n: client.name,
    g: client.goal,
    gym: client.gym ?? '',
    coach: data.profile.name,
    next: next
      ? { title: next.title, date: next.date, time: next.time, duration: next.duration, routine: nextRoutine?.name }
      : undefined,
    w: client.weight ?? '—',
    ms,
    notes: client.notes ?? '',
  }
  const base = `${location.origin}${location.pathname}`
  return `${base}#ficha=${base64UrlEncode(JSON.stringify(payload))}`
}

export function readShareFicha(hash: string): ShareFichaPayload | null {
  const m = hash.match(/ficha=([^&]+)/)
  if (!m) return null
  try {
    return JSON.parse(base64UrlDecode(m[1])) as ShareFichaPayload
  } catch {
    return null
  }
}

/* ---------------------- Registro de pagos del mes ---------------------- */

export function exportPaymentsPdf(data: AppData, monthStr: string): boolean {
  const win = window.open('', '_blank')
  if (!win) return false
  const cur = data.profile.currency
  const fmt = (n: number | string) => money(cur, n)
  const items = data.payments
    .filter((p) => month(p.due) === monthStr)
    .sort((a, b) => a.due.localeCompare(b.due))
  const received = items.filter((p) => p.paid).reduce((n, p) => n + Number(p.amount), 0)
  const pending = items.filter((p) => !p.paid).reduce((n, p) => n + Number(p.amount), 0)
  const nameOf = (id: string) => data.clients.find((c) => c.id === id)?.name ?? 'Cliente'
  const rows = items.length
    ? items
        .map((p) => `<tr><td>${esc(nameOf(p.client))}</td><td>${esc(longDate(p.due))}</td><td>${esc(fmt(p.amount))}</td><td>${p.paid ? 'Pagado' : 'Pendiente'}</td><td>${p.paidDate ? esc(longDate(p.paidDate)) : '—'}</td><td>${esc(p.note)}</td></tr>`)
        .join('')
    : '<tr><td colspan="6">Sin pagos este mes.</td></tr>'
  const title = longDate(`${monthStr}-01`, { month: 'long', year: 'numeric' })
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Pagos ${esc(title)}</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1c1e1c;margin:32px;line-height:1.45}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:4px}
.mark{width:22px;height:22px;border-radius:6px;background:#d2ff62;color:#182a0c;display:inline-grid;place-items:center}
h1{font-size:24px;margin:0;text-transform:capitalize}
.muted{color:#666;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #e3e3e3}
th{background:#f3f6ec;color:#3c4630}
.totals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.totals div{border:1px solid #e0e0e0;border-radius:10px;padding:12px}
.totals b{display:block;font-size:20px}
footer{margin-top:30px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:10px}
@media print{body{margin:14mm}.noprint{display:none}}
</style></head><body>
<div class="brand"><span class="mark">↗</span> profallo</div>
<h1>Registro de pagos · ${esc(title)}</h1>
<p class="muted">${items.length} registros · ${esc(data.profile.name || '')}</p>
<table><thead><tr><th>Cliente</th><th>Vence</th><th>Importe</th><th>Estado</th><th>Cobrado</th><th>Concepto</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals"><div><span class="muted">Recibido</span><b>${esc(fmt(received))}</b></div><div><span class="muted">Por cobrar</span><b>${esc(fmt(pending))}</b></div></div>
<footer>Generado por Profallo</footer>
<p class="noprint"><button onclick="window.print()" style="background:#d2ff62;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer">Guardar como PDF / Imprimir</button></p>
</body></html>`
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
  return true
}
