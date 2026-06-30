import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, PlusCircle, CheckCircle2, UserPlus, Coins } from 'lucide-react'
import PageHead from '../components/layout/PageHead.jsx'
import Card from '../components/ui/Card.jsx'
import Alert from '../components/ui/Alert.jsx'
import Money from '../components/ui/Money.jsx'
import { crearSolicitud } from '../services/solicitudesService.js'
import { extractError, toNumber } from '../utils/format.js'

const MONEDAS = [{ v: 'PEN', l: 'Soles (S/)' }, { v: 'USD', l: 'Dólares (US$)' }]
const TIPO_CUOTA = [{ v: 'mensual', l: 'Mensual' }, { v: 'quincenal', l: 'Quincenal' }, { v: 'semanal', l: 'Semanal' }]
const GARANTIAS = [
  { v: 'sin_garantia', l: 'Sin garantía' },
  { v: 'aval', l: 'Aval' },
  { v: 'prendaria', l: 'Prendaria' },
  { v: 'hipotecaria', l: 'Hipotecaria' },
]

export default function NuevaSolicitudPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const pre = location.state || {}

  const [f, setF] = useState({
    numero_documento: pre.numero_documento || '',
    nombres: pre.nombres || '',
    apellidos: pre.apellidos || '',
    telefono: pre.telefono || '',
    tipo_negocio: pre.tipo_negocio || '',
    nombre_negocio: pre.nombre_negocio || '',
    ingresos_estimados: '',
    monto_solicitado: '',
    plazo_meses: '12',
    moneda: 'PEN',
    tipo_cuota: 'mensual',
    garantia: 'sin_garantia',
    destino_credito: '',
    tea_referencial: '36',
  })
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const simbolo = f.moneda === 'USD' ? 'US$' : 'S/'

  // Cuota estimada (método francés) — referencial para el asesor.
  const cuotaEstimada = useMemo(() => {
    const monto = toNumber(f.monto_solicitado)
    const n = parseInt(f.plazo_meses, 10) || 0
    const tea = toNumber(f.tea_referencial) / 100
    if (monto <= 0 || n <= 0 || tea <= 0) return 0
    const i = Math.pow(1 + tea, 1 / 12) - 1 // tasa efectiva mensual
    return (monto * i) / (1 - Math.pow(1 + i, -n))
  }, [f.monto_solicitado, f.plazo_meses, f.tea_referencial])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!/^\d{8}$/.test(f.numero_documento.trim())) {
      setError('Ingresa un DNI válido de 8 dígitos.')
      return
    }
    if (toNumber(f.monto_solicitado) <= 0) {
      setError('Ingresa el monto solicitado.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        numero_documento: f.numero_documento.trim(),
        nombres: f.nombres.trim(),
        apellidos: f.apellidos.trim(),
        telefono: f.telefono.trim() || null,
        tipo_negocio: f.tipo_negocio.trim() || null,
        nombre_negocio: f.nombre_negocio.trim() || null,
        ingresos_estimados: f.ingresos_estimados ? toNumber(f.ingresos_estimados) : null,
        monto_solicitado: toNumber(f.monto_solicitado),
        plazo_meses: parseInt(f.plazo_meses, 10),
        moneda: f.moneda,
        tipo_cuota: f.tipo_cuota,
        garantia: f.garantia,
        destino_credito: f.destino_credito.trim() || null,
        cuota_estimada: cuotaEstimada ? Number(cuotaEstimada.toFixed(2)) : null,
        tea_referencial: toNumber(f.tea_referencial),
      }
      const res = await crearSolicitud(payload)
      setDone(res)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <>
        <PageHead title="Solicitud registrada" icon={CheckCircle2} />
        <Card style={{ borderTop: '5px solid var(--hb-green)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <CheckCircle2 size={42} color="var(--hb-green)" style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ margin: '0 0 4px', color: 'var(--hb-green)' }}>¡Expediente creado!</h3>
              <p style={{ margin: 0, color: 'var(--hb-muted)' }}>
                Expediente <strong>{done.numero_expediente}</strong> · estado <strong>{done.estado}</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="hb-btn" onClick={() => navigate('/solicitudes')}>Ver mis solicitudes</button>
            <button className="hb-btn hb-btn-gray" onClick={() => { setDone(null); }}>Registrar otra</button>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <button className="cm-back" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Volver</button>
      <PageHead title="Nueva solicitud de crédito" subtitle="Registra los datos del solicitante y las condiciones." icon={PlusCircle} />

      {error && <Alert tipo="error">{error}</Alert>}

      <form onSubmit={onSubmit}>
        <Card title="Solicitante y negocio" icon={UserPlus}>
          <div className="hb-grid-2">
            <div className="hb-field">
              <label>DNI *</label>
              <input className="hb-input" inputMode="numeric" maxLength={8} placeholder="8 dígitos"
                value={f.numero_documento} onChange={(e) => setF((s) => ({ ...s, numero_documento: e.target.value.replace(/\D/g, '') }))} required />
            </div>
            <div className="hb-field">
              <label>Teléfono</label>
              <input className="hb-input" placeholder="9XXXXXXXX" value={f.telefono} onChange={set('telefono')} />
            </div>
            <div className="hb-field">
              <label>Nombres</label>
              <input className="hb-input" value={f.nombres} onChange={set('nombres')} />
            </div>
            <div className="hb-field">
              <label>Apellidos</label>
              <input className="hb-input" value={f.apellidos} onChange={set('apellidos')} />
            </div>
            <div className="hb-field">
              <label>Tipo de negocio</label>
              <input className="hb-input" placeholder="Ej. bodega, taller…" value={f.tipo_negocio} onChange={set('tipo_negocio')} />
            </div>
            <div className="hb-field">
              <label>Nombre del negocio</label>
              <input className="hb-input" value={f.nombre_negocio} onChange={set('nombre_negocio')} />
            </div>
            <div className="hb-field">
              <label>Ingresos estimados (mensual)</label>
              <input className="hb-input" inputMode="decimal" placeholder="0.00" value={f.ingresos_estimados} onChange={set('ingresos_estimados')} />
            </div>
          </div>
        </Card>

        <Card title="Condiciones del crédito" icon={Coins} style={{ marginTop: 16 }}>
          <div className="hb-grid-3">
            <div className="hb-field">
              <label>Monto solicitado *</label>
              <input className="hb-input" inputMode="decimal" placeholder="0.00" value={f.monto_solicitado} onChange={set('monto_solicitado')} required />
            </div>
            <div className="hb-field">
              <label>Plazo (meses) *</label>
              <input className="hb-input" inputMode="numeric" value={f.plazo_meses} onChange={set('plazo_meses')} required />
            </div>
            <div className="hb-field">
              <label>TEA referencial (%)</label>
              <input className="hb-input" inputMode="decimal" value={f.tea_referencial} onChange={set('tea_referencial')} />
            </div>
            <div className="hb-field">
              <label>Moneda</label>
              <select className="hb-select" value={f.moneda} onChange={set('moneda')}>
                {MONEDAS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <div className="hb-field">
              <label>Tipo de cuota</label>
              <select className="hb-select" value={f.tipo_cuota} onChange={set('tipo_cuota')}>
                {TIPO_CUOTA.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div className="hb-field">
              <label>Garantía</label>
              <select className="hb-select" value={f.garantia} onChange={set('garantia')}>
                {GARANTIAS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
              </select>
            </div>
          </div>
          <div className="hb-field">
            <label>Destino del crédito</label>
            <input className="hb-input" placeholder="Ej. capital de trabajo, compra de mercadería…" value={f.destino_credito} onChange={set('destino_credito')} />
          </div>

          {cuotaEstimada > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ffeef1', border: '1px solid #f1d9de', borderRadius: 10, padding: '12px 16px' }}>
              <Coins size={20} color="#8f0018" />
              <span style={{ color: '#8f0018', fontWeight: 600 }}>Cuota mensual estimada:</span>
              <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, color: '#c8102e' }}>
                <Money value={cuotaEstimada} simbolo={simbolo} />
              </span>
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="submit" className="hb-btn" disabled={saving}>
            <CheckCircle2 size={16} /> {saving ? 'Registrando…' : 'Registrar solicitud'}
          </button>
          <button type="button" className="hb-btn hb-btn-gray" onClick={() => navigate('/solicitudes')}>Cancelar</button>
        </div>
      </form>
    </>
  )
}
