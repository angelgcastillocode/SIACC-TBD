"""Módulo 2 - Infraestructura: tipo_de_vialidad y asentamiento (vía sp_gestionar_vialidad_asentamiento)."""
from flask import Blueprint

from config.database import call_procedure
from utils.responses import ApiError, ok, sp_response, sp_rows
from utils.validation import arg_int, arg_str, json_body, pagination, to_int, to_str

bp = Blueprint("modulo2_infraestructura", __name__, url_prefix="/api/infraestructura")

SP = "sp_gestionar_vialidad_asentamiento"


def _consultar(operacion, nombre=None, clave_entidad=None):
    """CALL de lectura; devuelve la lista de filas o lanza ApiError."""
    rows, error = sp_rows(call_procedure(SP, [operacion, None, nombre, None, clave_entidad]))
    if error:
        raise ApiError(error, 400)
    return rows


@bp.get("/vialidades")
def listar_vialidades():
    rows = _consultar("CONSULTAR_VIALIDADES", arg_str("q"))
    return ok(rows, f"{len(rows)} tipo(s) de vialidad encontrado(s).", total=len(rows))


@bp.post("/vialidades")
def alta_vialidad():
    body = json_body()
    id_tipo = to_int(body.get("id_tipo_vialidad"), "id_tipo_vialidad", required=True, minimum=1)
    descripcion = to_str(body.get("descripcion_vialidad"), "descripcion_vialidad", required=True, max_len=100)
    return sp_response(call_procedure(SP, ["ALTA_VIALIDAD", id_tipo, descripcion, None, None]), 201)


@bp.get("/asentamientos")
def listar_asentamientos():
    page, limit, offset = pagination()
    rows = _consultar("CONSULTAR_ASENTAMIENTOS", arg_str("q"), arg_int("entidad"))
    pagina = rows[offset:offset + limit]
    return ok(pagina, f"{len(pagina)} asentamiento(s) en la página {page}.",
              total=len(rows), pagina=page, limite=limit)


@bp.post("/asentamientos")
def alta_asentamiento():
    body = json_body()
    id_asent = to_int(body.get("id_asentamiento"), "id_asentamiento", required=True, minimum=1)
    nombre = to_str(body.get("nombre_asentamiento"), "nombre_asentamiento", required=True, max_len=150)
    cp = to_str(body.get("codigo_postal"), "codigo_postal", max_len=10)
    entidad = to_int(body.get("clave_entidad", body.get("Clave_Entidad")), "clave_entidad", required=True)
    return sp_response(call_procedure(SP, ["ALTA_ASENTAMIENTO", id_asent, nombre, cp, entidad]), 201)
