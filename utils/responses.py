"""Respuestas JSON estandarizadas: {"ok": bool, "mensaje": str, "data": ...}."""
import re

from flask import jsonify


class ApiError(Exception):
    """Error controlado de la API (validación, no encontrado, etc.)."""

    def __init__(self, mensaje, status=400, data=None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status = status
        self.data = data


def ok(data=None, mensaje="OK", status=200, **extra):
    body = {"ok": True, "mensaje": mensaje, "data": data}
    body.update(extra)
    return jsonify(body), status


def fail(mensaje, status=400, data=None):
    return jsonify({"ok": False, "mensaje": mensaje, "data": data}), status


_CONSTRAINT_ERRNOS = {1062, 1451, 1452, 1169}


def _status_for_error(mensaje):
    low = (mensaje or "").lower()
    if low.startswith("error sql"):
        m = re.search(r"\((\d+)\)", mensaje)
        return 409 if m and int(m.group(1)) in _CONSTRAINT_ERRNOS else 500
    if "ya existe" in low:
        return 409
    if "no existe" in low:
        return 404
    return 400


def sp_response(resultsets, success_status=200):
    """Traduce los result sets de un SP de escritura a una respuesta JSON.

    Los SP de SIACC devuelven una fila `estatus`/`mensaje` ('OK' | 'ERROR');
    cualquier columna adicional (p. ej. id_detalle) se entrega en `data`.
    """
    for rows in resultsets:
        if rows and "estatus" in rows[0]:
            row = rows[0]
            if str(row["estatus"]).upper() == "OK":
                extra = {k: v for k, v in row.items() if k not in ("estatus", "mensaje")}
                return ok(extra or None, row.get("mensaje") or "OK", success_status)
            mensaje = row.get("mensaje") or "Operación rechazada por la base de datos."
            return fail(mensaje, _status_for_error(mensaje))
    return fail("El procedimiento no devolvió un estatus de operación.", 500)


def sp_rows(resultsets):
    """Para SP de lectura: (filas, error). `error` es el mensaje si el SP rechazó la consulta."""
    for rows in resultsets:
        if rows and "estatus" in rows[0]:
            if str(rows[0]["estatus"]).upper() == "ERROR":
                return None, rows[0].get("mensaje") or "Consulta rechazada."
            continue
        return rows, None
    return [], None
