import json
import uuid
from datetime import date, datetime, timezone
from urllib import error, parse, request

from app.core_bn.cfg_config import settings


class FirestoreUnavailable(RuntimeError):
    pass


def enabled() -> bool:
    return settings.DATA_BACKEND.lower() == "firebase"


def _base_url() -> str:
    project = settings.FIREBASE_PROJECT_ID
    return f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents"


def _url(path: str) -> str:
    query = parse.urlencode({"key": settings.FIREBASE_API_KEY})
    return f"{_base_url()}/{path.lstrip('/')}?{query}"


def _run_query_url() -> str:
    query = parse.urlencode({"key": settings.FIREBASE_API_KEY})
    project = settings.FIREBASE_PROJECT_ID
    return (
        f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)"
        f"/documents:runQuery?{query}"
    )


def _value_to_firestore(value):
    if value is None:
        return {"nullValue": None}
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, int) and not isinstance(value, bool):
        return {"integerValue": str(value)}
    if isinstance(value, float):
        return {"doubleValue": value}
    if isinstance(value, (datetime, date)):
        dt = value if isinstance(value, datetime) else datetime.combine(value, datetime.min.time())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return {"timestampValue": dt.isoformat().replace("+00:00", "Z")}
    if isinstance(value, list):
        return {"arrayValue": {"values": [_value_to_firestore(v) for v in value]}}
    if isinstance(value, dict):
        return {"mapValue": {"fields": _dict_to_firestore(value)}}
    return {"stringValue": str(value)}


def _dict_to_firestore(data: dict) -> dict:
    return {k: _value_to_firestore(v) for k, v in data.items() if v is not None}


def _value_from_firestore(raw):
    if "nullValue" in raw:
        return None
    if "booleanValue" in raw:
        return raw["booleanValue"]
    if "integerValue" in raw:
        return int(raw["integerValue"])
    if "doubleValue" in raw:
        return float(raw["doubleValue"])
    if "stringValue" in raw:
        return raw["stringValue"]
    if "timestampValue" in raw:
        return raw["timestampValue"]
    if "arrayValue" in raw:
        return [_value_from_firestore(v) for v in raw.get("arrayValue", {}).get("values", [])]
    if "mapValue" in raw:
        return _dict_from_firestore(raw.get("mapValue", {}).get("fields", {}))
    return None


def _dict_from_firestore(fields: dict) -> dict:
    return {k: _value_from_firestore(v) for k, v in fields.items()}


def _request_json(method: str, url: str, body: dict | None = None) -> dict:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    req = request.Request(
        url,
        data=payload,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with request.urlopen(req, timeout=12) as resp:
            text = resp.read().decode("utf-8")
            return json.loads(text) if text else {}
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise FirestoreUnavailable(f"Firestore HTTP {exc.code}: {details}") from exc
    except Exception as exc:
        raise FirestoreUnavailable(str(exc)) from exc


def _doc_to_dict(doc: dict | None) -> dict | None:
    if not doc:
        return None
    name = doc.get("name", "")
    data = _dict_from_firestore(doc.get("fields", {}))
    data["id"] = name.rsplit("/", 1)[-1]
    return data


def get_document(collection: str, doc_id: str) -> dict | None:
    try:
        return _doc_to_dict(_request_json("GET", _url(f"{collection}/{doc_id}")))
    except FirestoreUnavailable as exc:
        if "HTTP 404" in str(exc):
            return None
        raise


def list_collection(collection: str, limit: int = 100) -> list[dict]:
    url = _url(collection) + f"&pageSize={limit}"
    data = _request_json("GET", url)
    return [_doc_to_dict(doc) for doc in data.get("documents", [])]


def query_collection(collection: str, filters: dict | None = None, limit: int = 100) -> list[dict]:
    where = None
    filter_items = [
        {
            "fieldFilter": {
                "field": {"fieldPath": key},
                "op": "EQUAL",
                "value": _value_to_firestore(value),
            }
        }
        for key, value in (filters or {}).items()
        if value is not None
    ]
    if len(filter_items) == 1:
        where = filter_items[0]
    elif filter_items:
        where = {"compositeFilter": {"op": "AND", "filters": filter_items}}

    structured = {
        "from": [{"collectionId": collection}],
        "limit": limit,
    }
    if where:
        structured["where"] = where

    data = _request_json("POST", _run_query_url(), {"structuredQuery": structured})
    docs = []
    for item in data:
        doc = _doc_to_dict(item.get("document"))
        if doc:
            docs.append(doc)
    return docs


def add_document(collection: str, data: dict) -> dict:
    doc_id = data.get("id") or str(uuid.uuid4())
    set_document(collection, doc_id, data)
    return {"id": doc_id, **data}


def set_document(collection: str, doc_id: str, data: dict) -> dict:
    body = {"fields": _dict_to_firestore(data)}
    _request_json("PATCH", _url(f"{collection}/{doc_id}"), body)
    return {"id": doc_id, **data}


def patch_document(collection: str, doc_id: str, data: dict) -> dict:
    fields = [k for k, v in data.items() if v is not None]
    mask = "".join(f"&updateMask.fieldPaths={parse.quote(f)}" for f in fields)
    body = {"fields": _dict_to_firestore(data)}
    _request_json("PATCH", _url(f"{collection}/{doc_id}") + mask, body)
    current = get_document(collection, doc_id) or {}
    return {**current, **data, "id": doc_id}
