from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core_bn.cfg_database import get_db
from app.core_bn.cfg_auth import get_current_asesor
from app.schemas.sch_solicitudes import (
    SolicitudIn, SolicitudCreada, SolicitudResumen,
)
from app.repositories import rep_solicitudes
from app.core_bn.cfg_config import settings
from app.repositories import rep_firebase

router = APIRouter()


class NotaIn(BaseModel):
    contenido: str


class NotaOut(BaseModel):
    contenido: str
    created_at: str | None = None


@router.post("", response_model=SolicitudCreada)
def crear_solicitud(
    data: SolicitudIn,
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Registra una solicitud de credito (M5 / HU-17)."""
    if settings.DATA_BACKEND.lower() == "firebase":
        return rep_firebase.crear_solicitud(
            asesor["asesor_id"], asesor.get("agencia_id"), data.model_dump()
        )
    return rep_solicitudes.crear(
        db, asesor["asesor_id"], asesor.get("agencia_id"), data.model_dump()
    )


@router.get("", response_model=list[SolicitudResumen])
def listar_solicitudes(
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Historial de solicitudes del mes (HU-20) y tablero de estado (M9)."""
    if settings.DATA_BACKEND.lower() == "firebase":
        return rep_firebase.listar_solicitudes(asesor["asesor_id"])
    return rep_solicitudes.listar(db, asesor["asesor_id"])


@router.get("/admin/todas")
def listar_todas_solicitudes(
    limit: int = 200,
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Vista administrativa: todas las solicitudes de clientes y fuerza de ventas."""
    if settings.DATA_BACKEND.lower() == "firebase":
        return rep_firebase.listar_todas_solicitudes(limit)

    rows = db.execute(
        text(
            """
            SELECT s.id, s.numero_expediente, s.estado, s.monto_solicitado,
                   s.monto_aprobado, s.created_at, s.updated_at,
                   s.asesor_id, s.canal, c.numero_documento AS dni,
                   c.nombres || ' ' || c.apellidos AS cliente_nombre
            FROM solicitudes_credito s
            JOIN clientes c ON c.id = s.cliente_id
            ORDER BY s.created_at DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/admin/flujo")
def flujo_creditos(
    limit: int = 200,
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Vista administrativa del flujo completo: solicitudes, outbox y sync_log."""
    if settings.DATA_BACKEND.lower() == "firebase":
        return rep_firebase.flujo_creditos(limit)

    solicitudes = listar_todas_solicitudes(limit, db, asesor)
    outbox = db.execute(
        text(
            """
            SELECT entidad, entidad_id, operacion, estado, core_ref, intentos,
                   ultimo_error, created_at, procesado_at
            FROM sync_outbox
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()
    logs = db.execute(
        text(
            """
            SELECT direccion, entidad, referencia, estado_resultado, detalle, timestamp
            FROM sync_log
            ORDER BY timestamp DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()
    return {
        "resumen": {
            "solicitudes": len(solicitudes),
            "outbox": len(outbox),
            "logs": len(logs),
        },
        "solicitudes": solicitudes,
        "outbox": [dict(r) for r in outbox],
        "sync_log": [dict(r) for r in logs],
    }


@router.post("/{solicitud_id}/notas")
def agregar_nota(
    solicitud_id: str,
    data: NotaIn,
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Agrega una nota interna a la solicitud (RF-72)."""
    if settings.DATA_BACKEND.lower() == "firebase":
        return rep_firebase.agregar_nota(
            solicitud_id, asesor["asesor_id"], data.contenido
        )
    return rep_solicitudes.agregar_nota(
        db, solicitud_id, asesor["asesor_id"], data.contenido
    )


@router.get("/{solicitud_id}/notas", response_model=list[NotaOut])
def listar_notas(
    solicitud_id: str,
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Notas internas de la solicitud (RF-72)."""
    if settings.DATA_BACKEND.lower() == "firebase":
        return rep_firebase.listar_notas(solicitud_id)
    return rep_solicitudes.listar_notas(db, solicitud_id)
