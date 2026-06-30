# Core Mobile — Banco de la Nación (FastAPI)

Capa operacional de canales moviles para la app Flutter de fuerza de ventas, la
app de clientes y el portal Core. En modo normal usa la misma base
transaccional Firebase/Firestore del ecosistema BN.

- DB transaccional: Firebase Firestore `bn-fuerzaventas-s9-7224`.
- Modo local opcional: PostgreSQL `bd_core_mobile` con `DATA_BACKEND=postgres`.
- Puerto API: **8003**.
- Stack: FastAPI, JWT, Firestore REST y SQLAlchemy 2 para compatibilidad local.

## Puesta En Marcha

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Fuente transaccional compartida
$env:DATA_BACKEND="firebase"
$env:FIREBASE_PROJECT_ID="bn-fuerzaventas-s9-7224"

uvicorn main:app --reload --host 0.0.0.0 --port 8003
```

Docs interactivas: http://localhost:8003/docs

## Endpoints Principales

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/auth/login` | Login del asesor (`codigo` o `codigo_empleado` + password) |
| GET  | `/cartera` | Cartera del dia del asesor autenticado |
| POST | `/cartera/{id}/visita` | Registrar resultado de visita en Firestore |
| POST | `/solicitudes` | Registrar solicitud de credito en `solicitudes_credito` |
| GET | `/cliente/cuentas` | Consultar cuenta del cliente en `clientes_cuentas` |
| POST | `/cliente/operaciones` | Registrar operacion y encolar `sync_outbox` |

## Base Unica

Las apps Flutter usan el proyecto Firebase `bn-fuerzaventas-s9-7224` mediante
sus `firebase_options.dart`. Este backend queda alineado con el mismo proyecto
mediante `DATA_BACKEND=firebase`, `FIREBASE_PROJECT_ID` y `FIREBASE_API_KEY`.

PostgreSQL queda disponible solo como respaldo de desarrollo local si se cambia
explicitamente `DATA_BACKEND=postgres`.
