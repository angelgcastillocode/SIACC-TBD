"""Auditoría: consulta de `bitacora_auditoria` (poblada automáticamente por triggers)."""
import json

from flask import Blueprint, request

from config.database import query_all, query_one
from utils.responses import ApiError, fail, ok
from utils.validation import arg_int, arg_str, pagination

bp = Blueprint("auditoria", __name__, url_prefix="/api")

ACCIONES = {"INSERT", "UPDATE", "DELETE"}


def _parse_json(value):
    if isinstance(value, (str, bytes, bytearray)):
        try:
            return json.loads(value)
        except ValueError:
            return value
    return value


def _normalizar(row):
    row["datos_anteriores"] = _parse_json(row.get("datos_anteriores"))
    row["datos_nuevos"] = _parse_json(row.get("datos_nuevos"))
    return row


@bp.get("/bitacora")
def listar_bitacora():
    """Filtros opcionales: tabla, accion, id_registro, desde, hasta (YYYY-MM-DD[ HH:MM:SS]), page, limit."""
    page, limit, offset = pagination()
    where, params = [], []

    tabla = arg_str("tabla")
    if tabla:
        where.append("tabla_afectada = %s")
        params.append(tabla)
    accion = arg_str("accion")
    if accion:
        if accion.upper() not in ACCIONES:
            raise ApiError("El filtro 'accion' debe ser INSERT, UPDATE o DELETE.", 400)
        where.append("accion = %s")
        params.append(accion.upper())
    id_registro = arg_str("id_registro")
    if id_registro:
        where.append("id_registro = %s")
        params.append(id_registro)
    desde, hasta = arg_str("desde"), arg_str("hasta")
    if desde:
        where.append("fecha_hora >= %s")
        params.append(desde)
    if hasta:
        where.append("fecha_hora <= %s")
        params.append(hasta + " 23:59:59" if len(hasta) == 10 else hasta)
    clause = (" WHERE " + " AND ".join(where)) if where else ""

    total = query_one(f"SELECT COUNT(*) AS n FROM bitacora_auditoria{clause}", params)["n"]
    rows = query_all(
        "SELECT id_bitacora, tabla_afectada, id_registro, accion, datos_anteriores, datos_nuevos, "
        f"usuario_bd, fecha_hora FROM bitacora_auditoria{clause} "
        "ORDER BY id_bitacora DESC LIMIT %s OFFSET %s",
        params + [limit, offset],
    )
    rows = [_normalizar(r) for r in rows]
    return ok(rows, f"{len(rows)} registro(s) de bitácora en la página {page}.",
              total=total, pagina=page, limite=limit)


@bp.get("/bitacora/<int:id_bitacora>")
def obtener_bitacora(id_bitacora):
    row = query_one(
        "SELECT id_bitacora, tabla_afectada, id_registro, accion, datos_anteriores, datos_nuevos, "
        "usuario_bd, fecha_hora FROM bitacora_auditoria WHERE id_bitacora = %s",
        (id_bitacora,),
    )
    if not row:
        return fail(f"No existe el registro de bitácora {id_bitacora}.", 404)
    return ok(_normalizar(row), "Registro de bitácora encontrado.")
