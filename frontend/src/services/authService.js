import api, { TOKEN_KEY, USER_KEY } from './api.js'

/**
 * Login del ASESOR / personal de fuerza de ventas.
 * Backend: POST /auth/login { codigo_empleado, password }
 *   -> { access_token, token_type, asesor: { id, codigo_empleado, nombres, apellidos, perfil, agencia_id } }
 * Devuelve { token, user } ya normalizado.
 */
export async function login(codigoEmpleado, password) {
  const { data } = await api.post('/auth/login', {
    codigo_empleado: codigoEmpleado,
    password,
  })
  const token = data.access_token
  const a = data.asesor || {}
  const user = {
    id: a.id,
    codigo_empleado: a.codigo_empleado ?? codigoEmpleado,
    nombres: a.nombres ?? '',
    apellidos: a.apellidos ?? '',
    nombre: `${a.nombres ?? ''} ${a.apellidos ?? ''}`.trim() || codigoEmpleado,
    perfil: a.perfil ?? 'operador',
    agencia_id: a.agencia_id ?? null,
  }
  return { token, user }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
