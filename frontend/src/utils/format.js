// Utilidades de formato para el portal del personal (Core Mobile).
// El backend devuelve montos como números y fechas ISO.

/** Formatea un monto a moneda peruana: "S/ 1,234.56". */
export function formatMoney(value, { simbolo = 'S/' } = {}) {
  const n = toNumber(value)
  const formatted = n.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${simbolo} ${formatted}`
}

/** Formatea un monto compacto sin decimales: "S/ 8,500". */
export function formatMoneyShort(value, { simbolo = 'S/' } = {}) {
  const n = toNumber(value)
  return `${simbolo} ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
}

/** Convierte un valor string/number a Number de forma segura. */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  const n = parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Formatea una fecha ISO ("2026-06-03") o Date a "dd/mm/yyyy". */
export function formatDate(value) {
  if (!value) return '—'
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

/** Formatea una fecha+hora ISO a "dd/mm/yyyy HH:MM". */
export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return formatDate(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`
}

/** Formatea un porcentaje: "85.0%". */
export function formatPct(value) {
  if (value === null || value === undefined || value === '') return '—'
  const n = toNumber(value)
  return `${n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

/** Iniciales para el avatar: "Carlos Ramirez" -> "CR". */
export function iniciales(nombre = '') {
  const parts = String(nombre).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  const a = parts[0]?.[0] || ''
  const b = parts[1]?.[0] || ''
  return (a + b).toUpperCase()
}

/** Convierte una etiqueta tipo "RECUPERACION_MORA" en "Recuperación mora". */
export function humanizar(value = '') {
  if (!value) return '—'
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

/** Extrae un mensaje de error legible de una respuesta de axios. */
export function extractError(err, fallback = 'Ocurrió un error. Intente nuevamente.') {
  const detail = err?.response?.data?.detail
  if (detail == null) {
    if (err?.message === 'Network Error') {
      return 'No se pudo conectar con el servidor. Verifique que el Core Mobile (puerto 8003) esté activo.'
    }
    return err?.message || fallback
  }
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg || 'Dato inválido').join(' · ')
  }
  if (typeof detail === 'object') return JSON.stringify(detail)
  return fallback
}
