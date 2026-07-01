from fastapi import APIRouter, Depends, HTTPException, Request

from app.core_bn.cfg_auth import get_current_asesor
from app.repositories import rep_firebase
from app.services import svc_firestore as fs
from app.services.svc_http_audit import endpoint_catalog, list_http_request_log

router = APIRouter()


ECOSYSTEM_COLLECTIONS = {
    "asesores": "Usuarios de Fuerza de Ventas",
    "usuarios_asesores": "Usuarios alternativos de asesores",
    "usuarios_clientes": "Usuarios de App Clientes",
    "clientes_cuentas": "Cuentas y perfil financiero de clientes",
    "clientes_movimientos": "Movimientos generados por clientes",
    "creditos_preaprobados": "Cartera / creditos asignados a fuerza de ventas",
    "solicitudes_credito": "Solicitudes creadas por App Clientes y Fuerza de Ventas",
    "solicitudes_notas_internas": "Notas internas del Core",
    "visitas_ventas": "Visitas registradas por Fuerza de Ventas",
    "operaciones_cliente": "Operaciones iniciadas desde App Clientes",
    "notificaciones": "Notificaciones hacia clientes",
    "sync_outbox": "Eventos pendientes de sincronizacion",
    "sync_log": "Bitacora de sincronizacion",
    "http_requests_log": "Auditoria de requests HTTP del backend",
}


def _require_admin(asesor: dict) -> dict:
    perfil = str(asesor.get("perfil") or asesor.get("rol") or "").lower()
    if perfil not in {"administrador", "admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Solo usuarios administrativos pueden consultar el ecosistema.")
    return asesor


@router.get("/http-requests/catalogo")
def catalogo_http_requests(
    request: Request,
    asesor: dict = Depends(get_current_asesor),
):
    """Catalogo de todos los endpoints HTTP expuestos por el Core en Swagger."""
    _require_admin(asesor)
    return {
        "total": len(endpoint_catalog(request.app)),
        "requests": endpoint_catalog(request.app),
    }


@router.get("/http-requests/log")
def logs_http_requests(
    limit: int = 100,
    asesor: dict = Depends(get_current_asesor),
):
    """Requests HTTP reales registrados por el backend en Firestore."""
    _require_admin(asesor)
    if not fs.enabled():
        raise HTTPException(status_code=409, detail="La auditoria HTTP requiere DATA_BACKEND=firebase.")
    items = list_http_request_log(limit)
    return {"total": len(items), "items": items}


@router.get("/firebase/colecciones")
def colecciones_firebase(
    asesor: dict = Depends(get_current_asesor),
):
    """Colecciones Firebase usadas por el ecosistema completo."""
    _require_admin(asesor)
    return [
        {"collection": name, "description": description}
        for name, description in ECOSYSTEM_COLLECTIONS.items()
    ]


@router.get("/firebase/{collection}")
def listar_coleccion_firebase(
    collection: str,
    limit: int = 100,
    asesor: dict = Depends(get_current_asesor),
):
    """Lista documentos de una coleccion permitida de Firebase/Firestore."""
    _require_admin(asesor)
    if collection not in ECOSYSTEM_COLLECTIONS:
        raise HTTPException(status_code=404, detail="Coleccion no registrada para auditoria del ecosistema.")
    docs = fs.list_collection(collection, limit=limit)
    return {
        "collection": collection,
        "description": ECOSYSTEM_COLLECTIONS[collection],
        "total": len(docs),
        "items": docs,
    }


@router.get("/resumen")
def resumen_ecosistema(
    limit: int = 200,
    asesor: dict = Depends(get_current_asesor),
):
    """Resumen central de solicitudes, operaciones, visitas, outbox, logs y requests HTTP."""
    _require_admin(asesor)
    flujo = rep_firebase.flujo_creditos(limit)
    operaciones = fs.list_collection("operaciones_cliente", limit=limit)
    visitas = fs.list_collection("visitas_ventas", limit=limit)
    clientes = fs.list_collection("clientes_cuentas", limit=limit)
    http_logs = list_http_request_log(limit)
    return {
        "firebase": {
            "enabled": fs.enabled(),
        },
        "resumen": {
            **flujo.get("resumen", {}),
            "clientes": len(clientes),
            "operaciones_cliente": len(operaciones),
            "visitas_ventas": len(visitas),
            "http_requests": len(http_logs),
        },
        "solicitudes": flujo.get("solicitudes", []),
        "operaciones_cliente": operaciones,
        "visitas_ventas": visitas,
        "sync_outbox": flujo.get("outbox", []),
        "sync_log": flujo.get("sync_log", []),
        "http_requests_log": http_logs,
    }
