import api from './api.js'

/** Cartera del día del asesor autenticado. GET /cartera?fecha=YYYY-MM-DD */
export async function listarCartera(fecha) {
  const params = fecha ? { fecha } : {}
  const { data } = await api.get('/cartera', { params })
  return data
}

/** Registra el resultado de una visita. POST /cartera/{id}/visita */
export async function marcarVisita(carteraId, payload) {
  const { data } = await api.post(`/cartera/${carteraId}/visita`, payload)
  return data
}
