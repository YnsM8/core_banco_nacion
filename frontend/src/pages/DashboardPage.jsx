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
import { useAuth } from '../context/AuthContext.jsx'
import { listarCartera } from '../services/carteraService.js'
import { listarSolicitudes } from '../services/solicitudesService.js'
import { extractError } from '../utils/format.js'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.allSettled([listarCartera(), listarSolicitudes()])
      .then(([c, s]) => {
        if (!alive) return
        if (c.status === 'fulfilled') setCartera(c.value || [])
        if (s.status === 'fulfilled') setSolicitudes(s.value || [])
        if (c.status === 'rejected' && s.status === 'rejected') {
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

  return (
    <>
      <PageHead
        title={`Hola, ${user?.nombres || 'asesor'}`}
        subtitle="Este es el resumen de tu jornada en campo."
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
                <div className="cm-kpi-label">Solicitudes aprobadas</div>
                <span className="cm-kpi-val">{aprobadas}</span>
                <small>de {solicitudes.length} este mes</small>
              </div>
            </div>
          </div>

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
