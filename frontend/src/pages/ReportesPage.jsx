import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, Trophy, Users, FileCheck2, Wallet } from 'lucide-react'
import PageHead from '../components/layout/PageHead.jsx'
import Card from '../components/ui/Card.jsx'
import Loader from '../components/ui/Loader.jsx'
import Alert from '../components/ui/Alert.jsx'
import Money from '../components/ui/Money.jsx'
import { productividad } from '../services/reportesService.js'
import { extractError, formatPct } from '../utils/format.js'

export default function ReportesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(() => {
    setLoading(true)
    productividad()
      .then((data) => setRows(data || []))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const totEnviadas = rows.reduce((a, r) => a + (r.enviadas || 0), 0)
  const totAprobadas = rows.reduce((a, r) => a + (r.aprobadas || 0), 0)
  const totMonto = rows.reduce((a, r) => a + (r.monto_total || 0), 0)
  const maxEnviadas = Math.max(1, ...rows.map((r) => r.enviadas || 0))

  return (
    <>
      <PageHead
        title="Productividad del equipo"
        subtitle="Solicitudes y colocación del mes en curso"
        icon={BarChart3}
        actions={<button className="hb-btn hb-btn-gray hb-btn-sm" onClick={cargar}><RefreshCw size={15} /> Actualizar</button>}
      />

      {error && <Alert tipo="error">{error}</Alert>}

      {loading ? (
        <Loader text="Cargando reportes…" />
      ) : (
        <>
          <div className="cm-kpis">
            <div className="cm-kpi">
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><FileCheck2 size={24} /></span>
              <div><div className="cm-kpi-label">Solicitudes enviadas</div><span className="cm-kpi-val">{totEnviadas}</span></div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#c8102e' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><Trophy size={24} /></span>
              <div>
                <div className="cm-kpi-label">Aprobadas</div>
                <span className="cm-kpi-val">{totAprobadas}</span>
                <small>{formatPct(totEnviadas ? (totAprobadas / totEnviadas) * 100 : 0)} de aprobación</small>
              </div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#8f0018' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#8f0018' }}><Wallet size={24} /></span>
              <div><div className="cm-kpi-label">Monto colocado</div><span className="cm-kpi-val" style={{ fontSize: 20 }}><Money value={totMonto} /></span></div>
            </div>
            <div className="cm-kpi" style={{ borderLeftColor: '#c8102e' }}>
              <span className="cm-kpi-ico" style={{ background: '#ffeef1', color: '#c8102e' }}><Users size={24} /></span>
              <div><div className="cm-kpi-label">Asesores activos</div><span className="cm-kpi-val">{rows.length}</span></div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="hb-card hb-table-empty">Sin actividad registrada este mes.</div>
          ) : (
            <>
              <Card title="Solicitudes enviadas por asesor" icon={BarChart3}>
                {rows.map((r, i) => (
                  <div className="cm-bar-row" key={i}>
                    <span className="cm-bar-name" title={r.asesor_nombre}>{r.asesor_nombre}</span>
                    <div className="cm-bar-track">
                      <div className="cm-bar-fill" style={{ width: `${(r.enviadas / maxEnviadas) * 100}%` }} />
                    </div>
                    <span className="cm-bar-val">{r.enviadas}</span>
                  </div>
                ))}
              </Card>

              <Card title="Detalle por asesor" icon={Users} style={{ marginTop: 16 }}>
                <div className="hb-table-wrap">
                  <table className="hb-table">
                    <thead>
                      <tr>
                        <th>Asesor</th>
                        <th className="num">Enviadas</th>
                        <th className="num">Aprobadas</th>
                        <th className="num">Desembolsadas</th>
                        <th className="num">Monto</th>
                        <th className="num">% Aprob.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.asesor_nombre}</td>
                          <td className="num">{r.enviadas}</td>
                          <td className="num">{r.aprobadas}</td>
                          <td className="num">{r.desembolsadas}</td>
                          <td className="num"><Money value={r.monto_total} /></td>
                          <td className="num">{formatPct(r.tasa_aprobacion)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </>
  )
}
