import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, PlusCircle, RefreshCw, StickyNote, Send } from 'lucide-react'
import PageHead from '../components/layout/PageHead.jsx'
import Loader from '../components/ui/Loader.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import Money from '../components/ui/Money.jsx'
import Modal from '../components/ui/Modal.jsx'
import {
  obtenerFlujoCore, listarNotas, agregarNota,
} from '../services/solicitudesService.js'
import { extractError, formatDate, formatDateTime } from '../utils/format.js'

export default function SolicitudesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [outbox, setOutbox] = useState([])
  const [syncLog, setSyncLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Notas
  const [notasDe, setNotasDe] = useState(null)
  const [notas, setNotas] = useState([])
  const [notasLoading, setNotasLoading] = useState(false)
  const [nuevaNota, setNuevaNota] = useState('')
  const [savingNota, setSavingNota] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    obtenerFlujoCore({ limit: 250 })
      .then((data) => {
        setItems(data?.solicitudes || [])
        setOutbox(data?.outbox || [])
        setSyncLog(data?.sync_log || [])
      })
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNotas = async (sol) => {
    setNotasDe(sol)
    setNotas([])
    setNuevaNota('')
    setNotasLoading(true)
    try {
      setNotas(await listarNotas(sol.id) || [])
    } catch (err) {
      setError(extractError(err))
    } finally {
      setNotasLoading(false)
    }
  }

  const guardarNota = async () => {
    if (!nuevaNota.trim() || !notasDe) return
    setSavingNota(true)
    try {
      await agregarNota(notasDe.id, nuevaNota.trim())
      setNotas(await listarNotas(notasDe.id) || [])
      setNuevaNota('')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSavingNota(false)
    }
  }

  return (
    <>
      <PageHead
        title="Solicitudes del Core"
        subtitle="Vista centralizada de expedientes creados desde App Clientes y Fuerza de Ventas"
        icon={FileText}
        actions={
          <>
            <button className="hb-btn hb-btn-gray hb-btn-sm" onClick={cargar}><RefreshCw size={15} /> Actualizar</button>
            <button className="hb-btn" onClick={() => navigate('/solicitudes/nueva')}><PlusCircle size={16} /> Nueva</button>
          </>
        }
      />

      {error && <Alert tipo="error">{error}</Alert>}

      {loading ? (
        <Loader text="Cargando solicitudes…" />
      ) : items.length === 0 ? (
        <div className="hb-card hb-table-empty">
          Aun no hay solicitudes registradas en el flujo central.
          <div style={{ marginTop: 14 }}>
            <button className="hb-btn" onClick={() => navigate('/solicitudes/nueva')}><PlusCircle size={16} /> Registrar la primera</button>
          </div>
        </div>
      ) : (
        <div className="hb-card" style={{ padding: 0 }}>
          <div className="hb-table-wrap">
            <table className="hb-table">
              <thead>
                <tr>
                  <th>Expediente</th>
                  <th>Cliente</th>
                  <th>DNI</th>
                  <th>Canal</th>
                  <th className="num">Solicitado</th>
                  <th className="num">Aprobado</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.numero_expediente}</strong></td>
                    <td>{s.cliente_nombre}</td>
                    <td>{s.dni || s.numero_documento || '—'}</td>
                    <td><Badge estado={s.canal || 'asesor'} tone={String(s.canal || '').toLowerCase() === 'cliente' ? 'turq' : 'gray'} /></td>
                    <td className="num"><Money value={s.monto_solicitado} /></td>
                    <td className="num">{s.monto_aprobado ? <Money value={s.monto_aprobado} /> : '—'}</td>
                    <td><Badge estado={s.estado} /></td>
                    <td>{formatDate(s.created_at)}</td>
                    <td>
                      <button className="hb-btn hb-btn-ghost hb-btn-sm" onClick={() => abrirNotas(s)}>
                        <StickyNote size={14} /> Notas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (outbox.length > 0 || syncLog.length > 0) && (
        <div className="hb-grid-2" style={{ marginTop: 16 }}>
          <div className="hb-card">
            <h3 className="hb-card-title">Eventos pendientes / outbox</h3>
            <div className="cm-sync-list">
              {outbox.slice(0, 6).map((ev, i) => (
                <div className="cm-sync-row" key={`${ev.entidad_id || ev.id || i}-outbox`}>
                  <div>
                    <strong>{ev.entidad || 'evento'}</strong>
                    <small>{ev.operacion || 'sync'} · {ev.entidad_id || ev.id || 'sin referencia'}</small>
                  </div>
                  <Badge estado={ev.estado || 'pendiente'} />
                </div>
              ))}
            </div>
          </div>
          <div className="hb-card">
            <h3 className="hb-card-title">Bitacora de sincronizacion</h3>
            <div className="cm-sync-list">
              {syncLog.slice(0, 6).map((log, i) => (
                <div className="cm-sync-row" key={`${log.referencia || log.id || i}-log`}>
                  <div>
                    <strong>{log.entidad || log.direccion || 'sync'}</strong>
                    <small>{log.detalle || log.referencia || formatDateTime(log.timestamp || log.created_at)}</small>
                  </div>
                  <Badge estado={log.estado_resultado || log.estado || 'ok'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {notasDe && (
        <Modal
          title={`Notas · ${notasDe.numero_expediente}`}
          icon={StickyNote}
          onClose={() => setNotasDe(null)}
        >
          {notasLoading ? (
            <Loader text="Cargando notas…" />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                {notas.length === 0 ? (
                  <p style={{ color: 'var(--hb-muted)', margin: 0, fontSize: 14 }}>Sin notas todavía.</p>
                ) : (
                  notas.map((n, i) => (
                    <div key={i} style={{ background: 'var(--hb-bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--hb-border)' }}>
                      <div style={{ fontSize: 14 }}>{n.contenido}</div>
                      {n.created_at && <small style={{ color: 'var(--hb-muted)' }}>{formatDateTime(n.created_at)}</small>}
                    </div>
                  ))
                )}
              </div>
              <div className="hb-field" style={{ marginBottom: 10 }}>
                <textarea
                  className="hb-textarea"
                  placeholder="Escribe una nota interna…"
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                />
              </div>
              <button className="hb-btn" onClick={guardarNota} disabled={savingNota || !nuevaNota.trim()}>
                <Send size={15} /> {savingNota ? 'Guardando…' : 'Agregar nota'}
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
