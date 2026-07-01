import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, FileText, Clock, ChevronDown, LogOut, User,
} from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { iniciales, humanizar } from '../../utils/format.js'

// Pestañas principales del portal del personal.
export const TABS = [
  { to: '/inicio', label: 'Inicio', icon: LayoutDashboard },
  { to: '/cartera', label: 'Cartera', icon: Briefcase },
  { to: '/solicitudes', label: 'Solicitudes', icon: FileText },
]
function Reloj() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return <span className="cm-clock"><Clock size={15} /> {hh}:{mm}:{ss}</span>
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header>
      <div className="cm-topbar">
        <div className="cm-topbar-inner">
          <button className="cm-brand" onClick={() => navigate('/inicio')} aria-label="Inicio">
            <Logo size={38} variant="light" subtitle="CORE FINANCIERO" />
          </button>

          <div className="cm-topbar-right">
            <Reloj />
            <div className="cm-user-wrap" ref={wrapRef}>
              <button className="cm-user" onClick={() => setMenuOpen((o) => !o)}>
                <span className="cm-avatar">{iniciales(user?.nombre)}</span>
                <span className="cm-user-text">
                  <strong>{user?.nombre || 'Asesor'}</strong>
                  <small>{humanizar(user?.perfil)}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {menuOpen && (
                <div className="cm-user-menu">
                  <div className="cm-user-menu-head">
                    <strong>{user?.nombre}</strong>
                    <small>Código {user?.codigo_empleado} · {humanizar(user?.perfil)}</small>
                  </div>
                  <button onClick={() => { setMenuOpen(false); navigate('/inicio') }}>
                    <User size={16} /> Mi panel
                  </button>
                  <button onClick={onLogout}>
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className="cm-tabs">
        <div className="cm-tabs-inner">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = location.pathname === t.to || location.pathname.startsWith(t.to + '/')
            return (
              <button key={t.to} className={`cm-tab ${active ? 'active' : ''}`} onClick={() => navigate(t.to)}>
                <Icon size={17} /> {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
