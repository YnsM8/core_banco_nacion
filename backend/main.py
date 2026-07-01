import asyncio

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from app.core_bn.cfg_config import settings
from app.routes import (
    rtr_auth, rtr_cartera, rtr_ficha, rtr_cobranza, rtr_preeval, rtr_buro,
    rtr_solicitudes, rtr_reportes, rtr_alertas, rtr_campanas, rtr_sync,
    rtr_cliente, rtr_ecosistema,
)
from app.services.svc_http_audit import log_http_request, request_started_at

app = FastAPI(
    title="Core Mobile - Banco de la Nación",
    description="Capa operacional de canales moviles: fuerza de ventas en campo "
                "y app de clientes. Alimenta al core bd_core_financiero.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_http_requests(request: Request, call_next):
    started_perf, started_at = request_started_at()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        elapsed_ms = (request_started_at()[0] - started_perf) * 1000
        asyncio.create_task(
            run_in_threadpool(
                log_http_request,
                request,
                status_code=status_code,
                started_at=started_at,
                elapsed_ms=elapsed_ms,
            )
        )

app.include_router(rtr_auth.router,    prefix="/auth",     tags=["Auth"])
app.include_router(rtr_cartera.router, prefix="/cartera",  tags=["Cartera"])
app.include_router(rtr_ficha.router,   prefix="/clientes", tags=["Ficha"])
app.include_router(rtr_cobranza.router, prefix="/cobranza", tags=["Cobranza"])
app.include_router(rtr_preeval.router, prefix="/pre-evaluar", tags=["PreEvaluacion"])
app.include_router(rtr_buro.router,    prefix="/buro",      tags=["Buro"])
app.include_router(rtr_solicitudes.router, prefix="/solicitudes", tags=["Solicitudes"])
app.include_router(rtr_reportes.router, prefix="/reportes", tags=["Reportes"])
app.include_router(rtr_alertas.router, prefix="/alertas", tags=["Alertas"])
app.include_router(rtr_campanas.router, prefix="/campanas", tags=["Campanas"])
app.include_router(rtr_sync.router, prefix="/sync", tags=["Sync (Puente al Core)"])
app.include_router(rtr_ecosistema.router, prefix="/ecosistema", tags=["Ecosistema / Auditoria HTTP"])

# App de clientes (appbanco / Flutter clientes) — login DNI + productos
app.include_router(rtr_cliente.router, prefix="/cliente", tags=["Cliente (App)"])

@app.get("/")
def root():
    return {"sistema": "Core Mobile Banco de la Nación", "version": "1.0.0", "status": "ok"}
