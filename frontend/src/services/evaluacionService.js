import api from './api.js'

/** Pre-evaluación crediticia (capacidad de pago). POST /pre-evaluar */
export async function preEvaluar(payload) {
  const { data } = await api.post('/pre-evaluar', payload)
  return data
}

/** Consulta de buró + listas negras. POST /buro/consulta */
export async function consultarBuro(payload) {
  const { data } = await api.post('/buro/consulta', payload)
  return data
}
