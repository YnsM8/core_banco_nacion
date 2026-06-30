import { useState } from 'react'
import {
  ShieldCheck, Gauge, Search, CheckCircle2, AlertTriangle, XCircle,
  Building2, Ban,
} from 'lucide-react'
import PageHead from '../components/layout/PageHead.jsx'
import Card from '../components/ui/Card.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import Money from '../components/ui/Money.jsx'
import { preEvaluar, consultarBuro } from '../services/evaluacionService.js'
import { extractError, toNumber } from '../utils/format.js'

const CALIF_UI = {
  APTO: { cls: 'apto', icon: CheckCircle2, color: '#16a34a' },
  REVISAR: { cls: 'revisar', icon: AlertTriangle, color: '#8f0018' },
  NO_PROCEDE: { cls: 'rechazo', icon: XCircle, color: '#c8102e' },
}

function PreEvaluacion() {
  const [f, setF] = useState({ numero_documento: '', nombres: '', tipo_negocio: '', ingresos_estimados: '', monto_solicitado: '', destino_credito: '' })
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const run = async (e) => {
    e.preventDefault()
    setError(null); setRes(null)
    if (toNumber(f.monto_solicitado) <= 0) { setError('Ingresa el monto solicitado.'); return }
    setLoading(true)
    try {
      setRes(await preEvaluar({
        numero_documento: f.numero_documento.trim(),
        nombres: f.nombres.trim(),
        tipo_negocio: f.tipo_negocio.trim(),
        ingresos_estimados: toNumber(f.ingresos_estimados),
        monto_solicitado: toNumber(f.monto_solicitado),
        destino_credito: f.destino_credito.trim(),
      }))
    } catch (err) {
      setError(extractError(err))
    } finally { setLoading(false) }
  }

  const ui = res ? (CALIF_UI[res.calificacion] || CALIF_UI.REVISAR) : null
  const Icon = ui?.icon

  return (
    <Card title="Pre-evaluación de capacidad de pago" icon={Gauge}>
      <p style={{ marginTop: 0, color: 'var(--hb-muted)', fontSize: 13.5 }}>
        Simula la elegibilidad del cliente según sus ingresos y el monto solicitado.
      </p>
      {error && <Alert tipo="error">{error}</Alert>}
      <form onSubmit={run}>
        <div className="hb-grid-2">
          <div className="hb-field">
            <label>DNI</label>
            <input className="hb-input" inputMode="numeric" maxLength={8}
              value={f.numero_documento} onChange={(e) => setF((s) => ({ ...s, numero_documento: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div className="hb-field">
            <label>Nombres</label>
            <input className="hb-input" value={f.nombres} onChange={set('nombres')} />
          </div>
          <div className="hb-field">
            <label>Ingresos estimados (mensual)</label>
            <input className="hb-input" inputMode="decimal" placeholder="0.00" value={f.ingresos_estimados} onChange={set('ingresos_estimados')} />
          </div>
          <div className="hb-field">
            <label>Monto solicitado</label>
            <input className="hb-input" inputMode="decimal" placeholder="0.00" value={f.monto_solicitado} onChange={set('monto_solicitado')} />
          </div>
          <div className="hb-field">
            <label>Tipo de negocio</label>
            <input className="hb-input" value={f.tipo_negocio} onChange={set('tipo_negocio')} />
          </div>
          <div className="hb-field">
            <label>Destino del crédito</label>
            <input className="hb-input" value={f.destino_credito} onChange={set('destino_credito')} />
          </div>
        </div>
        <button className="hb-btn" disabled={loading}><Gauge size={16} /> {loading ? 'Evaluando…' : 'Pre-evaluar'}</button>
      </form>

      {res && (
        <div className={`cm-result ${ui.cls}`} style={{ marginTop: 18 }}>
          <span className="cm-result-ico" style={{ background: `${ui.color}1a`, color: ui.color }}><Icon size={28} /></span>
          <div style={{ flex: 1 }}>
            <h3>{res.calificacion === 'NO_PROCEDE' ? 'No procede' : res.calificacion === 'APTO' ? 'Apto' : 'Revisar'}</h3>
            <p>{res.motivo}</p>
            <div style={{ marginTop: 10 }}><Badge estado={res.calificacion} label={`Puntaje ${res.puntaje}/100`} /></div>
          </div>
        </div>
      )}
    </Card>
  )
}

function ConsultaBuro() {
  const [dni, setDni] = useState('')
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async (e) => {
    e.preventDefault()
    setError(null); setRes(null)
    if (!/^\d{8}$/.test(dni.trim())) { setError('Ingresa un DNI válido de 8 dígitos.'); return }
    setLoading(true)
    try {
      setRes(await consultarBuro({ dni: dni.trim() }))
    } catch (err) {
      setError(extractError(err))
    } finally { setLoading(false) }
  }

  return (
    <Card title="Consulta de buró y listas negras" icon={Search}>
      <p style={{ marginTop: 0, color: 'var(--hb-muted)', fontSize: 13.5 }}>
        Posición en el sistema financiero (SBS) y verificación de listas de restricción.
      </p>
      {error && <Alert tipo="error">{error}</Alert>}
      <form onSubmit={run} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div className="hb-field" style={{ marginBottom: 0, flex: 1 }}>
          <label>DNI del cliente</label>
          <input className="hb-input" inputMode="numeric" maxLength={8} placeholder="8 dígitos"
            value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="hb-btn" disabled={loading}><Search size={16} /> {loading ? 'Consultando…' : 'Consultar'}</button>
      </form>

      {res && (
        <>
          {res.en_lista_negra && (
            <div className="cm-result rechazo" style={{ marginTop: 18 }}>
              <span className="cm-result-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><Ban size={28} /></span>
              <div>
                <h3>Cliente bloqueado</h3>
                <p>{res.motivo_bloqueo}</p>
              </div>
            </div>
          )}
          <div className={`cm-result ${res.en_lista_negra ? 'rechazo' : res.dias_mayor_mora > 0 ? 'revisar' : 'apto'}`} style={{ marginTop: 16 }}>
            <span className="cm-result-ico" style={{ background: '#ffeef1', color: '#8f0018' }}><Building2 size={28} /></span>
            <div style={{ flex: 1 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                Calificación SBS <Badge estado={res.calificacion_sbs} />
              </h3>
              <p>{res.interpretacion}</p>
            </div>
          </div>
          <dl className="cm-dl" style={{ marginTop: 16 }}>
            <div><dt>Entidades con deuda</dt><dd>{res.entidades_con_deuda}</dd></div>
            <div><dt>Deuda total</dt><dd><Money value={res.deuda_total} /></dd></div>
            <div><dt>Mayor deuda</dt><dd><Money value={res.mayor_deuda} /></dd></div>
            <div><dt>Días mayor mora</dt><dd>{res.dias_mayor_mora} días</dd></div>
          </dl>
        </>
      )}
    </Card>
  )
}

export default function EvaluacionPage() {
  return (
    <>
      <PageHead title="Evaluación crediticia" subtitle="Herramientas de pre-evaluación y consulta de buró." icon={ShieldCheck} />
      <div className="hb-grid-2" style={{ alignItems: 'start', gap: 16 }}>
        <PreEvaluacion />
        <ConsultaBuro />
      </div>
    </>
  )
}
