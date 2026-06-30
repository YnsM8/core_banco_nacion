from pydantic import BaseModel, Field, ConfigDict

class LoginIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    codigo_empleado: str = Field(validation_alias="codigo")
    password: str

class AsesorOut(BaseModel):
    id: str
    codigo_empleado: str
    nombres: str
    apellidos: str
    perfil: str
    agencia_id: str | None = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    asesor: AsesorOut
