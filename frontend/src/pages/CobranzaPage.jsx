import { useState, useEffect, useCallback } from 'react'
import {
  HandCoins, RefreshCw, Phone, AlertTriangle, CheckCircle2, IdCard,
} from 'lucide-react'
import PageHead from '../components/layout/PageHead.jsx'
import Loader from '../components/ui/Loader.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import Money from '../components/ui/Money.jsx'
import Modal from '../components/ui/Modal.jsx'
import { listarMora, registrarAccion } from '../services/cobranzaService.js'
import { extractError, toNumber, humanizar } from '../utils/format.js'

const TIPOS = [{ v: 'visita', l: 'Visita' }, { v: 'llamada', l: 'Llamada' }, { v: 'mensaje', l: 'Mensaje' }]
const RESULTADOS = [
  { v: 'compromiso_pago', l: 'Compromiso de pago' },
  { v: 'pago_parcial', l: 'Pago parcial' },
  { v: 'sin_contacto', l: 'Sin contacto' },
  { v: 'se_niega', l: 'Se niega' },
]

function moraTone(dias) {
  if (dias >= 90) return 'red'
  if (dias >= 30) return 'amber'
  return 'turq'
}

export default function CobranzaPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)
  const [target, setTarget] = useState(null)
  const [form, setForm] = useState({ tipo_gestion: 'llamada', resultado: 'compromiso_pago', monto_pagado: '', fecha_compromiso: '', monto_compromiso: '', observaciones: '' })
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    listarMora()
      .then((data) => setItems(data || []))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const abrir = (it) => {
    setTarget(it)
    setForm({ tipo_gestion: 'llamada', resultado: 'compromiso_pago', monto_pagado: '', fecha_compromiso: '', monto_compromiso: '', observaciones: '' })
  }
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))

  const guardar = async () => {
    if (!target) return
    setSaving(true); setError(null)
    try {
      await registrarAccion({
        cliente_id: target.cliente_id,
        cod_cuenta_credito: target.cod_cuenta_credito || null,
        tipo_gestion: form.tipo_gestion,
        resultado: form.resultado,
        monto_pagado: form.monto_pagado ? toNumber(form.monto_pagado) : null,
        fecha_compromiso: form.fecha_compromiso || null,
        monto_compromiso: form.monto_compromiso ? toNumber(form.monto_compromiso) : null,
        observaciones: form.observaciones,
      })
      setOk(`Gestión de cobranza registrada para ${target.cliente_nombre}.`)
      setTarget(null)
    } catch (err) {
      setError(extractError(err))
    } finally { setSaving(false) }
  }

  const totalVencido = items.reduce((a, i) => a + (i.monto_vencido || 0), 0)

  return (
    <>
      <PageHead
        title="Cobranza del día"
        subtitle={`${items.length} cuentas en mora · S/ ${totalVencido.toLocaleString('es-PE', { maximumFractionDigits: 0 })} vencido`}
        icon={HandCoins}
        actions={<button className="hb-btn hb-btn-gray hb-btn-sm" onClick={cargar}><RefreshCw size={15} /> Actualizar</button>}
      />

      {error && <Alert tipo="error">{error}</Alert>}
      {ok && <Alert tipo="success">{ok}</Alert>}

      {loading ? (
        <Loader text="Cargando mora…" />
      ) : items.length === 0 ? (
        <div className="hb-card hb-table-empty">No hay cuentas en mora para gestionar hoy.</div>
      ) : (
        <div className="cm-list">
          {items.map((it) => (
            <div className="cm-item" key={it.id}>
              <span className={`cm-item-prio ${it.dias_mora >= 90 ? 'alta' : it.dias_mora >= 30 ? 'media' : 'normal'}`} />
              <div className="cm-item-main">
                <strong>{it.cliente_nombre}</strong>
                <small>
                  <IdCard size={13} /> DNI {it.documento}
                  {it.telefono && <><span>·</span><Phone size={13} /> {it.telefono}</>}
                  {it.cod_cuenta_credito && <><span>·</span> {it.cod_cuenta_credito}</>}
                </small>
              </div>
              <div className="cm-item-right">
                <Badge estado={`${it.dias_mora} días`} tone={moraTone(it.dias_mora)} label={`${it.dias_mora} días mora`} />
                <div className="cm-item-monto">
                  <Money value={it.monto_vencido} colored />
                  <small>vencido</small>
                </div>
                <button className="hb-btn hb-btn-sm" onClick={() => abrir(it)}>
                  <HandCoins size={15} /> Gestionar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {target && (
        <Modal
          title={`Gestión de cobranza · ${target.cliente_nombre}`}
          icon={HandCoins}
          onClose={() => setTarget(null)}
          footer={
            <>
              <button className="hb-btn hb-btn-gray" onClick={() => setTarget(null)}>Cancelar</button>
              <button className="hb-btn" onClick={guardar} disabled={saving}>
                <CheckCircle2 size={16} /> {saving ? 'Guardando…' : 'Registrar gestión'}
              </button>
            </>
          }
        >
          <div className="hb-field">
            <label>Tipo de gestión</label>
            <div className="cm-chips">
              {TIPOS.map((t) => (
                <button key={t.v} type="button" className={`cm-chip ${form.tipo_gestion === t.v ? 'sel' : ''}`} onClick={() => setForm((s) => ({ ...s, tipo_gestion: t.v }))}>{t.l}</button>
              ))}
            </div>
          </div>
          <div className="hb-field">
            <label>Resultado</label>
            <div className="cm-chips">
              {RESULTADOS.map((r) => (
                <button key={r.v} type="button" className={`cm-chip ${form.resultado === r.v ? 'sel' : ''}`} onClick={() => setForm((s) => ({ ...s, resultado: r.v }))}>{r.l}</button>
              ))}
            </div>
          </div>

          {form.resultado === 'pago_parcial' && (
            <div className="hb-field">
              <label>Monto pagado</label>
              <input className="hb-input" inputMode="decimal" placeholder="0.00" value={form.monto_pagado} onChange={set('monto_pagado')} />
            </div>
          )}
          {form.resultado === 'compromiso_pago' && (
            <div className="hb-grid-2">
              <div className="hb-field">
                <label>Fecha de compromiso</label>
                <input className="hb-input" type="date" value={form.fecha_compromiso} onChange={set('fecha_compromiso')} />
              </div>
              <div className="hb-field">
                <label>Monto comprometido</label>
                <input className="hb-input" inputMode="decimal" placeholder="0.00" value={form.monto_compromiso} onChange={set('monto_compromiso')} />
              </div>
            </div>
          )}

          <div className="hb-field" style={{ marginBottom: 0 }}>
            <label>Observaciones</label>
            <textarea className="hb-textarea" placeholder="Detalle de la gestión…" value={form.observaciones} onChange={set('observaciones')} />
          </div>
        </Modal>
      )}
    </>
  )
}
