import api from './api.js'

/** Reporte de productividad mensual por asesor. GET /reportes/productividad */
export async function productividad() {
  const { data } = await api.get('/reportes/productividad')
  return data
}
