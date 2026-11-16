"""Helpers de validación/conversión de entradas HTTP."""
from flask import request

from utils.responses import ApiError

MAX_LIMIT = 500
DEFAULT_LIMIT = 100


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("El cuerpo de la petición debe ser un objeto JSON válido.", 400)
    return data


def to_int(value, field, required=False, minimum=None):
    if value is None or (isinstance(value, str) and value.strip() == ""):
        if required:
            raise ApiError(f"El campo '{field}' es obligatorio.", 400)
        return None
    if isinstance(value, bool):
        raise ApiError(f"El campo '{field}' debe ser un entero.", 400)
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError):
        raise ApiError(f"El campo '{field}' debe ser un entero.", 400)
    if minimum is not None and number < minimum:
        raise ApiError(f"El campo '{field}' debe ser >= {minimum}.", 400)
    return number


def to_str(value, field, required=False, max_len=None):
    if value is None or (isinstance(value, str) and value.strip() == ""):
        if required:
            raise ApiError(f"El campo '{field}' es obligatorio.", 400)
        return None
    text = str(value).strip()
    if max_len is not None and len(text) > max_len:
        raise ApiError(f"El campo '{field}' excede {max_len} caracteres.", 400)
    return text


def pagination():
    """(page, limit, offset) a partir de ?page= y ?limit= con topes seguros."""
    page = to_int(request.args.get("page"), "page", minimum=1) or 1
    limit = to_int(request.args.get("limit"), "limit", minimum=1) or DEFAULT_LIMIT
    limit = min(limit, MAX_LIMIT)
    return page, limit, (page - 1) * limit


def arg_int(name):
    return to_int(request.args.get(name), name)


def arg_str(name):
    return to_str(request.args.get(name), name)
