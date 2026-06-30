import uuid
from datetime import datetime, timezone

from app.core_bn.cfg_security import create_access_token, verify_password
from app.services import svc_firestore as fs


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _full_name(data: dict) -> str:
    value = data.get("cliente_nombre") or data.get("nombre_cliente") or data.get("nombre")
    if value:
        return str(value)
    return f"{data.get('nombres', '')} {data.get('apellidos', '')}".strip() or "Cliente BN"


def _valid_password(data: dict, password: str) -> bool:
    password_hash = data.get("password_hash")
    if password_hash:
        try:
            return verify_password(password, password_hash)
        except Exception:
            return False
    return password in {
        str(data.get("password", "")),
        str(data.get("clave", "")),
        str(data.get("pin", "")),
    }


def login_asesor(codigo: str, password: str) -> dict | None:
    docs = []
    for collection in ("asesores", "usuarios_asesores"):
        docs = fs.query_collection(collection, {"codigo": codigo}, limit=1)
        if not docs:
            docs = fs.query_collection(collection, {"codigo_empleado": codigo}, limit=1)
        if docs:
            break

    if not docs:
        demo = {
            "COREADMIN": {
                "password": "CoreBN2026!",
                "nombres": "Administrador",
                "apellidos": "Core BN",
                "perfil": "administrador",
            },
            "G-1029": {
                "password": "admin123",
                "nombres": "Asesor",
                "apellidos": "BN",
                "perfil": "asesor",
            },
            "G-2045": {
                "password": "ventasBN2026",
                "nombres": "Asesor",
                "apellidos": "Ventas BN",
                "perfil": "asesor",
            },
        }
        demo_user = demo.get(codigo)
        if not demo_user or demo_user["password"] != password:
            return None
        asesor = {
            "id": codigo,
            "codigo": codigo,
            "nombres": demo_user["nombres"],
            "apellidos": demo_user["apellidos"],
            "perfil": demo_user["perfil"],
            "agencia_id": None,
        }
    else:
        asesor = docs[0]
        if asesor.get("activo") is False or not _valid_password(asesor, password):
            return None

    asesor_id = str(asesor.get("id") or codigo)
    nombre = _full_name(asesor)
    token = create_access_token({
        "sub": codigo,
        "asesor_id": asesor_id,
        "perfil": asesor.get("perfil") or asesor.get("rol") or "asesor",
        "nombre": nombre,
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "asesor": {
            "id": asesor_id,
            "codigo_empleado": codigo,
            "codigo": codigo,
            "nombre": nombre,
            "nombres": asesor.get("nombres") or nombre.split(" ")[0],
            "apellidos": asesor.get("apellidos") or "BN",
            "perfil": asesor.get("perfil") or asesor.get("rol") or "asesor",
            "rol": asesor.get("rol") or asesor.get("perfil") or "asesor",
            "agencia_id": asesor.get("agencia_id"),
        },
    }


def listar_cartera(asesor_id: str, fecha=None) -> list[dict]:
    docs = fs.query_collection("creditos_preaprobados", {"asesor_id": asesor_id}, limit=100)
    if not docs:
        docs = fs.list_collection("creditos_preaprobados", limit=100)
    result = []
    for d in docs:
        dni = str(d.get("dni") or d.get("numero_documento") or d.get("documento") or d.get("cliente_id") or "")
        result.append({
            "id": str(d.get("id")),
            "cliente_id": str(d.get("cliente_id") or dni or d.get("id")),
            "cliente_nombre": _full_name(d),
            "documento": dni,
            "tipo_gestion": d.get("tipo_gestion") or d.get("producto") or "credito",
            "prioridad": d.get("prioridad") or "media",
            "score_prioridad": int(d.get("score_prioridad") or d.get("score") or 0),
            "monto_credito": float(d.get("monto_credito") or d.get("monto") or d.get("monto_solicitado") or 0),
            "estado_visita": d.get("estado_visita") or "pendiente",
            "orden_manual": d.get("orden_manual"),
            "lat": d.get("lat") or d.get("latitud"),
            "lng": d.get("lng") or d.get("longitud"),
        })
    return sorted(result, key=lambda item: item["score_prioridad"], reverse=True)


def marcar_visita(asesor_id: str, cartera_id: str, data: dict) -> bool:
    visita = {
        "asesor_id": asesor_id,
        "cartera_id": cartera_id,
        "resultado": data.get("resultado"),
        "observacion": data.get("observacion", ""),
        "lat": data.get("lat"),
        "lng": data.get("lng"),
        "created_at": _now(),
    }
    fs.add_document("visitas_ventas", visita)
    fs.patch_document("creditos_preaprobados", cartera_id, {
        "estado_visita": "visitado" if data.get("resultado") == "visitado" else data.get("resultado"),
        "resultado_visita": data.get("resultado"),
        "observacion_visita": data.get("observacion", ""),
        "timestamp_visita": _now(),
    })
    return True


def crear_solicitud(asesor_id: str, agencia_id: str | None, d: dict) -> dict:
    sol_id = str(uuid.uuid4())
    expediente = "EXP-" + sol_id.replace("-", "")[:8].upper()
    payload = {
        **d,
        "id": sol_id,
        "numero_expediente": expediente,
        "asesor_id": asesor_id,
        "agencia_id": agencia_id,
        "estado": "enviado",
        "canal": "asesor",
        "created_at": _now(),
    }
    fs.set_document("solicitudes_credito", sol_id, payload)
    fs.add_document("sync_outbox", {
        "entidad": "solicitudes_credito",
        "entidad_id": sol_id,
        "operacion": "create",
        "payload": payload,
        "estado": "pendiente",
        "created_at": _now(),
    })
    return {"id": sol_id, "numero_expediente": expediente, "estado": "enviado"}


def listar_solicitudes(asesor_id: str) -> list[dict]:
    docs = fs.query_collection("solicitudes_credito", {"asesor_id": asesor_id}, limit=100)
    result = []
    for d in docs:
        result.append({
            "id": str(d.get("id")),
            "numero_expediente": d.get("numero_expediente") or d.get("expediente") or str(d.get("id")),
            "cliente_nombre": _full_name(d),
            "monto_solicitado": float(d.get("monto_solicitado") or d.get("monto") or 0),
            "monto_aprobado": float(d.get("monto_aprobado") or d.get("monto_solicitado") or 0),
            "estado": d.get("estado") or "enviado",
            "created_at": d.get("created_at"),
        })
    return result


def _solicitud_resumen(d: dict) -> dict:
    return {
        "id": str(d.get("id")),
        "numero_expediente": d.get("numero_expediente")
        or d.get("expediente")
        or str(d.get("id")),
        "cliente_nombre": _full_name(d),
        "dni": d.get("dni") or d.get("documento_cliente") or d.get("numero_documento"),
        "canal": d.get("canal") or d.get("origen") or "cliente",
        "asesor_id": d.get("asesor_id"),
        "monto_solicitado": float(
            d.get("monto_solicitado")
            or d.get("montoSolicitado")
            or d.get("monto")
            or 0
        ),
        "monto_aprobado": (
            float(d.get("monto_aprobado") or d.get("montoAprobado"))
            if d.get("monto_aprobado") is not None or d.get("montoAprobado") is not None
            else None
        ),
        "cuota_aprobada": (
            float(d.get("cuota_aprobada") or d.get("cuotaAprobada"))
            if d.get("cuota_aprobada") is not None or d.get("cuotaAprobada") is not None
            else None
        ),
        "estado": d.get("estado") or "enviado",
        "decision_comite": d.get("decision_comite"),
        "estados_recorridos": d.get("estados_recorridos") or [],
        "created_at": d.get("created_at") or d.get("fecha"),
        "updated_at": d.get("updated_at"),
        "notas": d.get("notas"),
    }


def listar_todas_solicitudes(limit: int = 200) -> list[dict]:
    docs = fs.list_collection("solicitudes_credito", limit=limit)
    return [_solicitud_resumen(d) for d in docs]


def flujo_creditos(limit: int = 200) -> dict:
    solicitudes = listar_todas_solicitudes(limit)
    outbox = fs.list_collection("sync_outbox", limit=limit)
    logs = fs.list_collection("sync_log", limit=limit)
    return {
        "resumen": {
            "solicitudes": len(solicitudes),
            "outbox": len(outbox),
            "logs": len(logs),
            "pendientes": sum(
                1
                for item in solicitudes
                if str(item.get("estado", "")).lower() in {"enviado", "pendiente"}
            ),
            "en_comite": sum(
                1
                for item in solicitudes
                if str(item.get("estado", "")).lower()
                in {"recibido_comite", "en_evaluacion"}
            ),
            "aprobadas": sum(
                1
                for item in solicitudes
                if str(item.get("estado", "")).lower()
                in {"aprobado", "condicionado", "desembolsado", "desembolsada"}
            ),
            "rechazadas": sum(
                1
                for item in solicitudes
                if str(item.get("estado", "")).lower() == "rechazado"
            ),
        },
        "solicitudes": solicitudes,
        "outbox": outbox,
        "sync_log": logs,
    }


def agregar_nota(solicitud_id: str, asesor_id: str, contenido: str) -> dict:
    note_id = str(uuid.uuid4())
    fs.set_document("solicitudes_notas_internas", note_id, {
        "id": note_id,
        "solicitud_id": solicitud_id,
        "asesor_id": asesor_id,
        "contenido": contenido[:500],
        "created_at": _now(),
    })
    return {"id": note_id}


def listar_notas(solicitud_id: str) -> list[dict]:
    return [
        {"contenido": d.get("contenido", ""), "created_at": d.get("created_at")}
        for d in fs.query_collection("solicitudes_notas_internas", {"solicitud_id": solicitud_id}, limit=50)
    ]


def login_cliente(numero_documento: str, password: str) -> dict | None:
    cuenta = fs.get_document("clientes_cuentas", numero_documento)
    if not cuenta:
        docs = fs.query_collection("usuarios_clientes", {"numero_documento": numero_documento}, limit=1)
        cuenta = docs[0] if docs else None
    if not cuenta:
        return None
    cliente = cliente_from_cuenta(numero_documento, cuenta)
    token = create_access_token({
        "sub": numero_documento,
        "cliente_id": numero_documento,
        "nombre": f"{cliente['nombres']} {cliente['apellidos']}",
    })
    return {"access_token": token, "token_type": "bearer", "cliente": cliente}


def cliente_from_cuenta(cliente_id: str, cuenta: dict | None = None) -> dict:
    cuenta = cuenta or fs.get_document("clientes_cuentas", cliente_id) or {}
    nombre = _full_name(cuenta)
    parts = nombre.split(" ", 1)
    return {
        "id": cliente_id,
        "cod_cliente": cuenta.get("cod_cliente") or cliente_id,
        "numero_documento": cuenta.get("dni") or cuenta.get("numero_documento") or cliente_id,
        "nombres": cuenta.get("nombres") or parts[0],
        "apellidos": cuenta.get("apellidos") or (parts[1] if len(parts) > 1 else ""),
        "email": cuenta.get("email"),
        "telefono": cuenta.get("telefono"),
    }


def cuentas_cliente(cliente_id: str) -> list[dict]:
    cuenta = fs.get_document("clientes_cuentas", cliente_id)
    if not cuenta:
        return []
    return [{
        "id": cliente_id,
        "cod_cuenta_ahorro": cuenta.get("cod_cuenta_ahorro") or cuenta.get("numeroCuenta") or cliente_id,
        "tipo_cuenta": cuenta.get("tipo_cuenta") or cuenta.get("tipoCuenta") or "Cuenta DNI",
        "moneda": cuenta.get("moneda") or "PEN",
        "saldo_capital": float(cuenta.get("saldo") or cuenta.get("saldo_capital") or 0),
        "saldo_interes": float(cuenta.get("saldo_interes") or 0),
        "tea": float(cuenta.get("tea") or 0),
        "estado": cuenta.get("estado") or "activa",
    }]


def creditos_cliente(cliente_id: str) -> list[dict]:
    docs = fs.query_collection("solicitudes_credito", {"dni": cliente_id}, limit=50)
    if not docs:
        docs = fs.query_collection("solicitudes_credito", {"numero_documento": cliente_id}, limit=50)
    return [{
        "id": str(d.get("id")),
        "cod_cuenta_credito": d.get("numero_expediente") or str(d.get("id")),
        "producto": d.get("producto") or "Credito BN",
        "monto_desembolsado": float(d.get("monto_aprobado") or d.get("monto_solicitado") or 0),
        "saldo_capital": float(d.get("saldo_capital") or d.get("monto_solicitado") or 0),
        "saldo_total": float(d.get("saldo_total") or d.get("monto_solicitado") or 0),
        "dias_mora": int(d.get("dias_mora") or 0),
        "calificacion_interna": d.get("calificacion_interna") or "normal",
        "estado": d.get("estado") or "enviado",
        "fecha_desembolso": None,
        "tea": float(d.get("tea") or d.get("tea_referencial") or 0),
        "cuotas_total": int(d.get("plazo_meses") or 0),
        "cuotas_pagadas": int(d.get("cuotas_pagadas") or 0),
    } for d in docs]


def movimientos_cliente(cliente_id: str, limit: int = 20) -> list[dict]:
    docs = fs.query_collection("clientes_movimientos", {"dni": cliente_id}, limit=limit)
    if not docs:
        docs = fs.query_collection("clientes_movimientos", {"cliente_id": cliente_id}, limit=limit)
    return [{
        "id": str(d.get("id")),
        "cod_operacion": d.get("cod_operacion") or str(d.get("id")),
        "cod_cuenta": d.get("cod_cuenta") or cliente_id,
        "tipo": d.get("tipo") or "MOV",
        "concepto": d.get("concepto") or d.get("descripcion"),
        "canal": d.get("canal") or "app",
        "monto": float(d.get("monto") or 0),
        "moneda": d.get("moneda") or "PEN",
        "fecha_operacion": d.get("fecha_operacion") or d.get("created_at") or _now(),
    } for d in docs]


def notificaciones_cliente(cliente_id: str) -> list[dict]:
    docs = fs.query_collection("notificaciones", {"dni": cliente_id}, limit=30)
    if not docs:
        docs = fs.query_collection("notificaciones", {"cliente_id": cliente_id}, limit=30)
    return [{
        "id": str(d.get("id")),
        "titulo": d.get("titulo") or "Notificacion",
        "cuerpo": d.get("cuerpo") or d.get("mensaje"),
        "tipo": d.get("tipo") or "info",
        "leida": bool(d.get("leida") or False),
        "created_at": d.get("created_at") or _now(),
    } for d in docs]


def crear_operacion(cliente_id: str, data: dict) -> dict:
    op_id = str(uuid.uuid4())
    payload = {
        "id": op_id,
        "cliente_id": cliente_id,
        **data,
        "estado": "pendiente",
        "created_at": _now(),
    }
    fs.set_document("operaciones_cliente", op_id, payload)
    fs.add_document("sync_outbox", {
        "entidad": "operaciones_cliente",
        "entidad_id": op_id,
        "operacion": "create",
        "payload": payload,
        "estado": "pendiente",
        "created_at": _now(),
    })
    return payload
