import { formatMoney, toNumber } from '../../utils/format.js'

/** Muestra un monto formateado como "S/ 1,234.56". */
export default function Money({ value, simbolo = 'S/', colored = false, className = '' }) {
  const n = toNumber(value)
  const colorClass = colored ? (n < 0 ? 'hb-money-neg' : 'hb-money-pos') : ''
  return <span className={`hb-money ${colorClass} ${className}`}>{formatMoney(n, { simbolo })}</span>
}
