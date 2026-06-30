import api from './api.js'

/** Listado de mora diaria. GET /cobranza/mora */
export async function listarMora() {
  const { data } = await api.get('/cobranza/mora')
  return data
}

/** Registra una gestión de cobranza. POST /cobranza/accion */
export async function registrarAccion(payload) {
  const { data } = await api.post('/cobranza/accion', payload)
  return data
}
