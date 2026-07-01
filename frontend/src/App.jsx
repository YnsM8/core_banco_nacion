import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './components/layout/PrivateRoute.jsx'
import Header from './components/layout/Header.jsx'

import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CarteraPage from './pages/CarteraPage.jsx'
import FichaClientePage from './pages/FichaClientePage.jsx'
import SolicitudesPage from './pages/SolicitudesPage.jsx'

// Layout de las rutas autenticadas: cabecera + pestañas + contenido.
function PrivateLayout({ children }) {
  return (
    <PrivateRoute>
      <Header />
      <main className="cm-main">
        <div className="cm-container">{children}</div>
      </main>
    </PrivateRoute>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/login" element={<LoginPage />} />

      {/* Privado */}
      <Route path="/inicio" element={<PrivateLayout><DashboardPage /></PrivateLayout>} />
      <Route path="/cartera" element={<PrivateLayout><CarteraPage /></PrivateLayout>} />
      <Route path="/clientes/:clienteId/ficha" element={<PrivateLayout><FichaClientePage /></PrivateLayout>} />
      <Route path="/solicitudes" element={<PrivateLayout><SolicitudesPage /></PrivateLayout>} />
      <Route path="/solicitudes/nueva" element={<Navigate to="/solicitudes" replace />} />
      <Route path="/evaluacion" element={<Navigate to="/inicio" replace />} />
      <Route path="/cobranza" element={<Navigate to="/inicio" replace />} />
      <Route path="/reportes" element={<Navigate to="/inicio" replace />} />

      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}
