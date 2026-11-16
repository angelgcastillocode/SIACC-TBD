"""Módulo 3 - Actividad: listado directo; escritura EXCLUSIVAMENTE vía Stored Procedures."""
from flask import Blueprint

from config.database import call_procedure, query_all, query_one
from utils.responses import fail, ok, sp_response
from utils.validation import arg_str, json_body, pagination, to_int, to_str

bp = Blueprint("modulo3_actividad", __name__, url_prefix="/api/actividades")


@bp.get("")
def listar_actividades():
    q = arg_str("q")
    page, limit, offset = pagination()
    clause, params = "", []
    if q:
        clause = " WHERE descripcion_actividad LIKE %s"
        params.append(f"%{q}%")
    total = query_one(f"SELECT COUNT(*) AS n FROM actividad{clause}", params)["n"]
    rows = query_all(
        f"SELECT id_actividad, descripcion_actividad FROM actividad{clause} "
        "ORDER BY id_actividad LIMIT %s OFFSET %s",
        params + [limit, offset],
    )
    return ok(rows, f"{len(rows)} actividad(es) en la página {page}.", total=total, pagina=page, limite=limit)


@bp.get("/<int:id_actividad>")
def obtener_actividad(id_actividad):
    row = query_one(
        "SELECT id_actividad, descripcion_actividad FROM actividad WHERE id_actividad = %s",
        (id_actividad,),
    )
    if not row:
        return fail(f"No existe la actividad {id_actividad}.", 404)
    return ok(row, "Actividad encontrada.")


@bp.post("")
def insertar_actividad():
    body = json_body()
    id_act = to_int(body.get("id_actividad"), "id_actividad", required=True, minimum=1)
    desc = to_str(body.get("descripcion_actividad"), "descripcion_actividad", required=True, max_len=150)
    return sp_response(call_procedure("sp_insertar_actividad_segura", [id_act, desc]), 201)


@bp.put("/<int:id_actividad>")
def actualizar_actividad(id_actividad):
    body = json_body()
    desc = to_str(body.get("descripcion_actividad"), "descripcion_actividad", required=True, max_len=150)
    return sp_response(call_procedure("sp_actualizar_actividad", [id_actividad, desc]))
