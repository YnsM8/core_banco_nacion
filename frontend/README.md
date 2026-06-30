# Core Financiero — Portal del Personal (Banco de la Nación)

Front-end en **React + Vite** para la fuerza de ventas / asesores de Banco de la Nación.
Consume el backend **Core Mobile (FastAPI)** del proyecto
`back_core_mobile_banco_nacion_fastapi` (puerto **8003**).

> Sistema interno · uso exclusivo del personal. El portal del **cliente**
> (Banca por Internet) es un proyecto aparte (`banco_nacion_banking_front_react`, puerto 5174).

## Puesta en marcha

```powershell
# 1) Instalar dependencias
npm install

# 2) Configurar la URL del backend (opcional, ya viene por defecto)
copy .env.example .env   # VITE_BASE_URL=http://localhost:8003

# 3) Levantar el front (portal del personal -> puerto 5173)
npm run dev
```

Abrir http://localhost:5173

### Acceso demo
El seed del Core Mobile crea una cuenta administrativa para el portal core:

| Codigo institucional | Contrasena |
|----------------------|------------|
| `COREADMIN`          | `CoreBN2026!` |

El backend autentica por `codigo_empleado` + `password`; el campo de login se
muestra como **codigo institucional**.

## Requisitos
- Backend `back_core_mobile_banco_nacion_fastapi` corriendo en `http://localhost:8003`
  (`uvicorn main:app --reload --port 8003`) con el seed aplicado
  (`python -m scripts.seed_bd_core_mobile`).
- Node.js 18+.

## Funcionalidades (consumen el API del Core Mobile)

| Módulo | Pantalla | Endpoint(s) |
|--------|----------|-------------|
| Acceso | Login partido con carrusel "Nuestra esencia" | `POST /auth/login` |
| Inicio | Dashboard con KPIs y accesos rápidos | `GET /cartera`, `GET /solicitudes` |
| Cartera | Cartera del día + registro de visitas | `GET /cartera`, `POST /cartera/{id}/visita` |
| Ficha | Ficha 360° del cliente (posición, historial, oferta) | `GET /clientes/{id}/ficha` |
| Solicitudes | Tablero de expedientes + notas internas | `GET/POST /solicitudes`, `GET/POST /solicitudes/{id}/notas` |
| Nueva solicitud | Alta de solicitud de crédito (con cuota estimada) | `POST /solicitudes` |
| Evaluación | Pre-evaluación de capacidad de pago + consulta de buró | `POST /pre-evaluar`, `POST /buro/consulta` |
| Cobranza | Mora del día + registro de gestión | `GET /cobranza/mora`, `POST /cobranza/accion` |
| Reportes | Productividad mensual por asesor | `GET /reportes/productividad` |

## Identidad de marca
Paleta institucional del Banco de la Nación (rojo `#c8102e`, blanco y neutros),
con identidad sobria para el portal del personal. Las variables de color viven
en `src/index.css` (`--hb-*`).

## Estructura

```
src/
  main.jsx                 punto de entrada (Router + AuthProvider)
  App.jsx                  rutas públicas/privadas
  index.css                tema Banco de la Nación + estilos del portal
  context/AuthContext.jsx  sesión del asesor (JWT en localStorage)
  services/
    api.js                 axios central (Bearer + manejo de 401)
    authService.js         login / sesión
    carteraService.js  clientesService.js  solicitudesService.js
    evaluacionService.js  cobranzaService.js  reportesService.js
  components/
    layout/  Header (topbar + pestañas)  PrivateRoute  PageHead
    ui/      Logo  Alert  Badge  Money  Loader  Card  Modal
  pages/
    LoginPage  DashboardPage  CarteraPage  FichaClientePage
    SolicitudesPage  NuevaSolicitudPage  EvaluacionPage
    CobranzaPage  ReportesPage
  utils/format.js          moneda, fechas, porcentajes, errores
```

## Notas
- La sesión (token JWT del asesor) se guarda en `localStorage` (`cm_token` / `cm_user`).
  Ante un `401` el interceptor limpia la sesión y vuelve al login.
- La pre-evaluación, el buró y la cuota estimada usan las reglas mock del backend
  (en producción invocarían el motor de scoring del core).
