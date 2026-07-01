import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Target, Eye, HeartHandshake, Route, ShieldCheck,
  User, Lock, LogIn, ChevronLeft, ChevronRight,
} from 'lucide-react'
import Logo from '../components/ui/Logo.jsx'
import Alert from '../components/ui/Alert.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { extractError } from '../utils/format.js'

// Carrusel "Nuestra esencia" — identidad de Banco de la Nacion.
const SLIDES = [
  {
    tag: 'NUESTRA ESENCIA',
    icon: Target,
    titulo: 'Misión',
    desc: 'Impulsar el desarrollo de los emprendedores del Perú con soluciones financieras inclusivas, ágiles y responsables.',
    pills: ['Inclusión', 'Agilidad', 'Responsabilidad'],
  },
  {
    tag: 'NUESTRA ESENCIA',
    icon: Eye,
    titulo: 'Visión',
    desc: 'Ser el banco aliado de la microempresa peruana, reconocido por su cercanía, tecnología y compromiso con el crecimiento de cada cliente.',
    pills: ['Cercanía', 'Tecnología', 'Crecimiento'],
  },
  {
    tag: 'NUESTROS VALORES',
    icon: HeartHandshake,
    titulo: 'Valores',
    desc: 'Integridad en cada decisión, respeto por las personas y pasión por servir a quienes construyen el país desde su negocio.',
    pills: ['Integridad', 'Respeto', 'Servicio'],
  },
  {
    tag: 'FUERZA DE VENTAS',
    icon: Route,
    titulo: 'En el campo',
    desc: 'Tu cartera del día, visitas y solicitudes sincronizadas en un solo lugar. Acompañamos al asesor en cada recorrido.',
    pills: ['Cartera', 'Visitas', 'Solicitudes'],
  },
]

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [recordar, setRecordar] = useState(true)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [slide, setSlide] = useState(0)

  // Si ya hay sesión, va directo al panel.
  useEffect(() => {
    if (isAuthenticated) navigate('/inicio', { replace: true })
  }, [isAuthenticated, navigate])

  // Auto-rotación del carrusel.
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000)
    return () => clearInterval(id)
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!codigo.trim() || !password) {
      setError('Ingresa tu codigo institucional y contrasena.')
      return
    }
    setLoading(true)
    try {
      await login(codigo.trim(), password)
      navigate('/inicio', { replace: true })
    } catch (err) {
      setError(extractError(err, 'No se pudo iniciar sesión.'))
    } finally {
      setLoading(false)
    }
  }

  const s = SLIDES[slide]
  const SlideIcon = s.icon
  const prev = () => setSlide((v) => (v - 1 + SLIDES.length) % SLIDES.length)
  const next = () => setSlide((v) => (v + 1) % SLIDES.length)

  return (
    <div className="cm-login">
      {/* Cabecera flotante */}
      <div className="cm-login-topbar">
        <Logo size={40} variant="dark" subtitle="CORE FINANCIERO" />
        <span className="cm-login-chip">Sistema interno · Uso exclusivo del personal</span>
      </div>

      {/* ===== Izquierda: carrusel "Nuestra esencia" ===== */}
      <section className="cm-hero">
        <span className="cm-hero-blob b1" />
        <span className="cm-hero-blob b2" />
        <button className="cm-hero-arrow left" onClick={prev} aria-label="Anterior"><ChevronLeft size={22} /></button>
        <button className="cm-hero-arrow right" onClick={next} aria-label="Siguiente"><ChevronRight size={22} /></button>

        <div className="cm-hero-inner">
          <span className="cm-hero-tag">{s.tag}</span>
          <div className="cm-hero-icon"><SlideIcon size={62} strokeWidth={1.5} /></div>
          <h1>{s.titulo}</h1>
          <p>{s.desc}</p>
          <div className="cm-hero-pills">
            {s.pills.map((p) => <span key={p} className="cm-hero-pill">{p}</span>)}
          </div>
        </div>

        <div className="cm-hero-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`cm-hero-dot ${i === slide ? 'active' : ''}`}
              onClick={() => setSlide(i)}
              aria-label={`Ir al slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ===== Derecha: formulario de acceso ===== */}
      <section className="cm-auth">
        <span className="cm-auth-blob a1" />
        <span className="cm-auth-blob a2" />
        <div className="cm-auth-inner">
          <span className="cm-secure"><ShieldCheck size={15} /> Conexión segura</span>
          <h2>Inicia sesión</h2>
          <p className="cm-auth-lead">Acceso administrativo del Core Financiero.</p>

          <Alert tipo="error">{error}</Alert>

          <form onSubmit={onSubmit}>
            <div className="cm-field">
              <label htmlFor="codigo">Codigo institucional</label>
              <div className="cm-input-wrap">
                <User size={18} />
                <input
                  id="codigo"
                  placeholder="Ej. COREADMIN"
                  autoComplete="username"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="cm-field">
              <label htmlFor="password">Contraseña</label>
              <div className="cm-input-wrap">
                <Lock size={18} />
                <input
                  id="password"
                  type="password"
                  placeholder="Contrasena asignada"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="cm-auth-row">
              <label className="cm-check">
                <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                Recordarme
              </label>
              <button type="button" className="cm-link" onClick={(e) => e.preventDefault()}>
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button type="submit" className="cm-submit" disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="cm-auth-hint">
            Demo Core · codigo <strong>COREADMIN</strong> · clave <strong>CoreBN2026!</strong>
          </p>
        </div>
      </section>
    </div>
  )
}
