import { humanizar } from '../../utils/format.js'

// Badge de estado. Colorea automáticamente según el texto, salvo que se fuerce `tone`.
export default function Badge({ estado, tone, label }) {
  const text = label ?? humanizar(estado)
  const variant = tone || toneFor(estado)
  return <span className={`hb-badge hb-badge-${variant}`}>{text}</span>
}

function toneFor(estado) {
  const e = String(estado ?? '').toLowerCase()
  if (/(apto|aprobad|desembolsad|normal|activ|vigente|al d[ií]a|pagad|visitad|compromiso)/.test(e)) return 'green'
  if (/(no_procede|rechaz|bloque|perdida|negocio_cerrado|se_niega|castig|inhabil|alta)/.test(e)) return 'red'
  if (/(revisar|pendiente|proceso|evaluaci|reagendad|cpp|deficiente|dudoso|media|parcial)/.test(e)) return 'amber'
  return 'gray'
}
