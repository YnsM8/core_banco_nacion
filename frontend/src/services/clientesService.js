import api from './api.js'

/** Ficha completa del cliente. GET /clientes/{cliente_id}/ficha */
export async function obtenerFicha(clienteId) {
  const { data } = await api.get(`/clientes/${clienteId}/ficha`)
  return data
}
