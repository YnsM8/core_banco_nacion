import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, FileText, ShieldCheck, HandCoins, BarChart3, MapPin,
  CheckCircle2, AlertTriangle, TrendingUp, ArrowRight, PlusCircle,
} from 'lucide-react'
import PageHead from '../components/layout/PageHead.jsx'
import Card from '../components/ui/Card.jsx'
import Loader from '../components/ui/Loader.jsx'
import Alert from '../components/ui/Alert.jsx'
import Money from '../components/ui/Money.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { listarCartera } from '../services/carteraService.js'
import { obtenerResumenEcosistema } from '../services/solicitudesService.js'
import { extractError, formatDateTime } from '../utils/format.js'

const ACCESOS = [
  { to: '/cartera', icon: Briefcase, color: '#c8102e', t: 'Cartera del día', d: 'Clientes asignados para visitar hoy' },
  { to: '/solicitudes/nueva', icon: PlusCircle, color: '#c8102e', t: 'Nueva solicitud', d: 'Registrar una solicitud de crédito' },
  { to: '/evaluacion', icon: ShieldCheck, color: '#8f0018', t: 'Pre-evaluar / Buró', d: 'Capacidad de pago y listas negras' },
  { to: '/cobranza', icon: HandCoins, color: '#c8102e', t: 'Cobranza', d: 'Gestión de mora del día' },
  { to: '/solicitudes', icon: FileText, color: '#8f0018', t: 'Mis solicitudes', d: 'Tablero de estado de expedientes' },
  { to: '/reportes', icon: BarChart3, color: '#c8102e', t: 'Reportes', d: 'Productividad del equipo' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cartera, setCartera] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [visitas, setVisitas] = useState([])
  const [outbox, setOutbox] = useState([])
  const [syncLog, setSyncLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.allSettled([listarCartera(), obtenerResumenEcosistema({ limit: 200 })])
      .then(([c, f]) => {
        if (!alive) return
        if (c.status === 'fulfilled') setCartera(c.value || [])
        if (f.status === 'fulfilled') {
          setSolicitudes(f.value?.solicitudes || [])
          setOperaciones(f.value?.operaciones_cliente || [])
          setMovimientos(f.value?.clientes_movimientos || [])
          setVisitas(f.value?.visitas_ventas || [])
          setOutbox(f.value?.sync_outbox || [])
          setSyncLog(f.value?.sync_log || [])
        }
        if (c.status === 'rejected' && f.status === 'rejected') {
          setError(extractError(c.reason, 'No se pudieron cargar los datos.'))
        }
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const pendientes = cartera.filter((c) => c.estado_visita === 'pendiente').length
  const visitados = cartera.filter((c) => c.estado_visita && c.estado_visita !== 'pendiente').length
  const montoCartera = cartera.reduce((acc, c) => acc + (c.monto_credito || 0), 0)
  const aprobadas = solicitudes.filter((s) => ['aprobado', 'desembolsado'].includes(s.estado)).length
  const solicitudesCliente = solicitudes.filter((s) => String(s.canal || '').toLowerCase() === 'cliente').length
  const pendientesCore = solicitudes.filter((s) => ['enviado', 'pendiente', 'recibido_comite', 'en_evaluacion'].includes(String(s.estado || '').toLowerCase())).length
  const outboxPendiente = outbox.filter((o) => String(o.estado || '').toLowerCase() === 'pendiente').length
  const eventos = [
    ...movimientos.map((m) => ({
      id: `mov-${m.id}`,
      tipo: 'Movimiento cliente',
      canal: m.canal || 'app_clientes',
      detalle: m.descripcion || m.concepto || 'Movimiento',
      cliente: m.dni || m.cliente_id || m.beneficiario_dni,
      monto: m.monto,
      estado: m.estado || m.tipo || 'registrado',
      fecha: m.fecha_operacion || m.created_at || m.fecha,
    })),
    ...operaciones.map((o) => ({
      id: `op-${o.id}`,
      tipo: 'Operacion cliente',
      canal: o.canal || 'app_clientes',
      detalle: o.descripcion || o.concepto || o.tipo,
      cliente: o.cliente_id || o.cod_cuenta_origen,
      monto: o.monto,
      estado: o.estado || 'pendiente',
      fecha: o.created_at,
    })),
    ...visitas.map((v) => ({
      id: `vis-${v.id}`,
      tipo: 'Visita ventas',
      canal: 'fuerza_ventas',
      detalle: v.resultado || v.observacion || 'Visita registrada',
      cliente: v.cartera_id || v.cliente_id,
      monto: null,
      estado: v.resultado || 'registrado',
      fecha: v.created_at || v.timestamp_visita,
    })),
    ...solicitudes.map((s) => ({
      id: `sol-${s.id}`,
      tipo: 'Solicitud credito',
      canal: s.canal || 'asesor',
      detalle: s.numero_expediente || 'Solicitud',
      cliente: s.dni || s.cliente_nombre,
      monto: s.monto_solicitado,
      estado: s.estado,
      fecha: s.created_at,
    })),
  ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)).slice(0, 12)

  return (
    <>
      <PageHead
        title={`Core central, ${user?.nombres || 'administrador'}`}
        subtitle="Vista consolidada de solicitudes, acciones y sincronizacion de App Clientes y Fuerza de Ventas."
      />

      {error && <Alert tipo="error">{error}</Alert>}

      {loading ? (
        <Loader text="Cargando tu panel…" />
      ) : (
        <>
          <div className="cm-kpis">
            <div className="cm-kpi">
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><MapPin size={24} /></span>
              <div>
                <div className="cm-kpi-label">Visitas pendientes</div>
                <span className="cm-kpi-val">{pendientes}</span>
                <small>de {cartera.length} en cartera</small>
              </div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#c8102e' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><CheckCircle2 size={24} /></span>
              <div>
                <div className="cm-kpi-label">Gestionadas hoy</div>
                <span className="cm-kpi-val">{visitados}</span>
                <small>visitas registradas</small>
              </div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#8f0018' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#8f0018' }}><TrendingUp size={24} /></span>
              <div>
                <div className="cm-kpi-label">Monto en cartera</div>
                <span className="cm-kpi-val" style={{ fontSize: 20 }}><Money value={montoCartera} /></span>
                <small>colocación gestionada</small>
              </div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#c8102e' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><FileText size={24} /></span>
              <div>
                <div className="cm-kpi-label">Solicitudes Core</div>
                <span className="cm-kpi-val">{solicitudes.length}</span>
                <small>{aprobadas} aprobadas · {pendientesCore} en flujo</small>
              </div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#8f0018' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#8f0018' }}><FileText size={24} /></span>
              <div>
                <div className="cm-kpi-label">Desde App Clientes</div>
                <span className="cm-kpi-val">{solicitudesCliente}</span>
                <small>capturadas por canal cliente</small>
              </div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#c8102e' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><TrendingUp size={24} /></span>
              <div>
                <div className="cm-kpi-label">Sync pendiente</div>
                <span className="cm-kpi-val">{outboxPendiente}</span>
                <small>{outbox.length} eventos · {syncLog.length} logs</small>
              </div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#8f0018' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#8f0018' }}><HandCoins size={24} /></span>
              <div>
                <div className="cm-kpi-label">Movimientos clientes</div>
                <span className="cm-kpi-val">{movimientos.length}</span>
                <small>{operaciones.length} operaciones Core</small>
              </div>
            </div>
          </div>

          <Card title="Movimientos recientes del ecosistema" icon={BarChart3} style={{ marginBottom: 22 }}>
            {eventos.length === 0 ? (
              <div className="hb-table-empty">Aun no hay movimientos centralizados.</div>
            ) : (
              <div className="hb-table-wrap">
                <table className="hb-table">
                  <thead>
                    <tr>
                      <th>Proceso</th>
                      <th>Canal</th>
                      <th>Detalle</th>
                      <th>Cliente / referencia</th>
                      <th className="num">Monto</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((ev) => (
                      <tr key={ev.id}>
                        <td><strong>{ev.tipo}</strong></td>
                        <td><Badge estado={ev.canal} tone={ev.canal === 'app_clientes' ? 'turq' : 'gray'} /></td>
                        <td>{ev.detalle || '—'}</td>
                        <td>{ev.cliente || '—'}</td>
                        <td className="num">{ev.monto != null ? <Money value={ev.monto} /> : '—'}</td>
                        <td><Badge estado={ev.estado || 'registrado'} /></td>
                        <td>{formatDateTime(ev.fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <h2 className="cm-section-title">Accesos rápidos</h2>
          <div className="cm-quick-grid">
            {ACCESOS.map((a) => {
              const Icon = a.icon
              return (
                <button key={a.to} className="cm-quick" onClick={() => navigate(a.to)}>
                  <span className="cm-quick-ico" style={{ background: `${a.color}1a`, color: a.color }}>
                    <Icon size={24} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3>{a.t}</h3>
                    <p>{a.d}</p>
                  </div>
                  <ArrowRight size={18} color="#9ca3af" />
                </button>
              )
            })}
          </div>

          {pendientes > 0 && (
            <Card title="Próxima visita prioritaria" icon={AlertTriangle} style={{ marginTop: 22 }}>
              {(() => {
                const top = [...cartera]
                  .filter((c) => c.estado_visita === 'pendiente')
                  .sort((a, b) => (b.score_prioridad || 0) - (a.score_prioridad || 0))[0]
                if (!top) return null
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ fontSize: 16 }}>{top.cliente_nombre}</strong>
                      <div style={{ color: 'var(--hb-muted)', fontSize: 13 }}>
                        DNI {top.documento} · Prioridad {top.prioridad} (score {top.score_prioridad})
                      </div>
                    </div>
                    <button className="hb-btn" onClick={() => navigate('/cartera')}>
                      Ir a la cartera <ArrowRight size={16} />
                    </button>
                  </div>
                )
              })()}
            </Card>
          )}
        </>
      )}
    </>
  )
}
