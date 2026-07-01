from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.core_bn.cfg_database import get_db
from app.core_bn.cfg_auth import get_current_asesor
from app.schemas.sch_ficha import FichaOut, UbicacionIn
from app.repositories import rep_ficha
from app.core_bn.cfg_config import settings
from app.repositories import rep_firebase

router = APIRouter()


@router.get("/{cliente_id}/ficha", response_model=FichaOut)
def ficha_cliente(
    cliente_id: str,
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Ficha completa del cliente (M3 / HU-11)."""
    if settings.DATA_BACKEND.lower() == "firebase":
        ficha = rep_firebase.obtener_ficha(cliente_id)
    else:
        try:
            ficha = rep_ficha.obtener_ficha(db, cliente_id)
        except SQLAlchemyError:
            ficha = None
        if ficha is None:
            ficha = rep_firebase.obtener_ficha(cliente_id)
    if ficha is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return ficha


@router.post("/{cliente_id}/ubicacion")
def actualizar_ubicacion(
    cliente_id: str,
    body: UbicacionIn,
    db: Session = Depends(get_db),
    asesor: dict = Depends(get_current_asesor),
):
    """Actualiza las coordenadas del negocio del cliente (HU-10 / RF-25/26)."""
    ok = rep_ficha.actualizar_ubicacion(
        db, cliente_id, body.lat, body.lng, body.direccion
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"ok": True, "lat": body.lat, "lng": body.lng}
