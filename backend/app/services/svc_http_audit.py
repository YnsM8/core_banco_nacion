from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from fastapi import Request
from fastapi.routing import APIRoute

from app.core_bn.cfg_config import settings
from app.services import svc_firestore as fs


EXCLUDED_PREFIXES = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
)


def should_log(path: str) -> bool:
    return not any(path.startswith(prefix) for prefix in EXCLUDED_PREFIXES)


def request_started_at() -> tuple[float, str]:
    return perf_counter(), datetime.now(timezone.utc).isoformat()


def log_http_request(
    request: Request,
    *,
    status_code: int,
    started_at: str,
    elapsed_ms: float,
) -> None:
    if not fs.enabled() or not should_log(request.url.path):
        return

    payload = {
        "id": str(uuid4()),
        "method": request.method,
        "path": request.url.path,
        "query": str(request.url.query or ""),
        "status_code": status_code,
        "elapsed_ms": round(elapsed_ms, 2),
        "client_host": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "referer": request.headers.get("referer"),
        "started_at": started_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "core_backend",
        "firebase_project_id": settings.FIREBASE_PROJECT_ID,
    }
    try:
        fs.set_document("http_requests_log", payload["id"], payload)
    except Exception:
        # La auditoria no debe tumbar la API principal si Firestore no responde.
        return


def list_http_request_log(limit: int = 100) -> list[dict]:
    return fs.list_collection("http_requests_log", limit=limit)


PUBLIC_ENDPOINTS = {
    ("GET", "/"),
    ("POST", "/auth/login"),
    ("POST", "/cliente/login"),
}


def endpoint_catalog(app) -> list[dict]:
    endpoints = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.include_in_schema is False:
            continue
        methods = sorted(m for m in route.methods if m not in {"HEAD", "OPTIONS"})
        for method in methods:
            endpoints.append({
                "method": method,
                "path": route.path,
                "name": route.name,
                "summary": route.summary,
                "tags": route.tags,
                "requires_auth": (method, route.path) not in PUBLIC_ENDPOINTS,
            })
    return sorted(endpoints, key=lambda item: (item["path"], item["method"]))
