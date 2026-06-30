from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core_bn.cfg_database import get_db
from app.schemas.sch_auth import LoginIn, TokenOut
from app.controllers import ctl_auth
from app.core_bn.cfg_config import settings
from app.repositories import rep_firebase

router = APIRouter()

@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    if settings.DATA_BACKEND.lower() == "firebase":
        result = rep_firebase.login_asesor(data.codigo_empleado, data.password)
    else:
        result = ctl_auth.login(db, data.codigo_empleado, data.password)
    if result and result.get("_bloqueado"):
        raise HTTPException(
            status_code=423,
            detail=f"Cuenta bloqueada por intentos fallidos hasta {result['hasta']}",
        )
    if not result:
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    return result
