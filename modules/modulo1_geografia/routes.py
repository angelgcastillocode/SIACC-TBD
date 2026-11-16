"""Módulo 1 - Geografía: entidad, municipio, localidad y consulta por rango (BETWEEN)."""
from flask import Blueprint, request

from config.database import call_procedure, query_all, query_one
from utils.responses import ApiError, fail, ok, sp_rows
from utils.validation import arg_int, arg_str, pagination, to_int

bp = Blueprint("modulo1_geografia", __name__, url_prefix="/api/geografia")


def _like(text):
    return f"%{text}%"


@bp.get("/entidades")
def listar_entidades():
    q = arg_str("q")
    sql = "SELECT Clave_Entidad, Nombre_Entidad FROM entidad"
    params = []
    if q:
        sql += " WHERE Nombre_Entidad LIKE %s"
        params.append(_like(q))
    sql += " ORDER BY Clave_Entidad"
    rows = query_all(sql, params)
    return ok(rows, f"{len(rows)} entidad(es) encontrada(s).", total=len(rows))


@bp.get("/entidades/<int:clave>")
def obtener_entidad(clave):
    row = query_one("SELECT Clave_Entidad, Nombre_Entidad FROM entidad WHERE Clave_Entidad = %s", (clave,))
    if not row:
        return fail(f"No existe la entidad {clave}.", 404)
    return ok(row, "Entidad encontrada.")


@bp.get("/municipios")
def listar_municipios():
    entidad = arg_int("entidad")
    q = arg_str("q")
    page, limit, offset = pagination()

    where, params = [], []
    if entidad is not None:
        where.append("m.Clave_Entidad = %s")
        params.append(entidad)
    if q:
        where.append("m.Nombre_Municipio LIKE %s")
        params.append(_like(q))
    clause = (" WHERE " + " AND ".join(where)) if where else ""

    total = query_one(f"SELECT COUNT(*) AS n FROM municipio m{clause}", params)["n"]
    rows = query_all(
        "SELECT m.Clave_Entidad, e.Nombre_Entidad, m.Clave_Municipio, m.Nombre_Municipio "
        "FROM municipio m INNER JOIN entidad e ON e.Clave_Entidad = m.Clave_Entidad"
        f"{clause} ORDER BY m.Clave_Entidad, m.Clave_Municipio LIMIT %s OFFSET %s",
        params + [limit, offset],
    )
    return ok(rows, f"{len(rows)} municipio(s) en la página {page}.", total=total, pagina=page, limite=limit)


@bp.get("/municipios/<int:entidad>/<int:municipio>")
def obtener_municipio(entidad, municipio):
    row = query_one(
        "SELECT m.Clave_Entidad, e.Nombre_Entidad, m.Clave_Municipio, m.Nombre_Municipio "
        "FROM municipio m INNER JOIN entidad e ON e.Clave_Entidad = m.Clave_Entidad "
        "WHERE m.Clave_Entidad = %s AND m.Clave_Municipio = %s",
        (entidad, municipio),
    )
    if not row:
        return fail(f"No existe el municipio {municipio} en la entidad {entidad}.", 404)
    return ok(row, "Municipio encontrado.")


@bp.get("/localidades")
def listar_localidades():
    # `localidad` solo referencia a Clave_Municipio (no a la entidad) en el esquema oficial.
    municipio = arg_int("municipio")
    q = arg_str("q")
    page, limit, offset = pagination()

    where, params = [], []
    if municipio is not None:
        where.append("Clave_Municipio = %s")
        params.append(municipio)
    if q:
        where.append("Nombre_Localidad LIKE %s")
        params.append(_like(q))
    clause = (" WHERE " + " AND ".join(where)) if where else ""

    total = query_one(f"SELECT COUNT(*) AS n FROM localidad{clause}", params)["n"]
    rows = query_all(
        "SELECT Clave_Municipio, Clave_Localidad, Nombre_Localidad FROM localidad"
        f"{clause} ORDER BY Clave_Municipio, Clave_Localidad LIMIT %s OFFSET %s",
        params + [limit, offset],
    )
    return ok(rows, f"{len(rows)} localidad(es) en la página {page}.", total=total, pagina=page, limite=limit)


@bp.get("/territorio/rango")
def consultar_territorio_rango():
    """Filtro por rango de municipios (BETWEEN) vía sp_consultar_territorio_rango.

    Query params: entidad (opcional), mun_inicio y mun_fin (obligatorios).
    """
    entidad = arg_int("entidad")
    inicio = to_int(request.args.get("mun_inicio"), "mun_inicio", required=True, minimum=0)
    fin = to_int(request.args.get("mun_fin"), "mun_fin", required=True, minimum=0)

    resultsets = call_procedure("sp_consultar_territorio_rango", [entidad, inicio, fin])
    rows, error = sp_rows(resultsets)
    if error:
        raise ApiError(error, 400)
    return ok(
        rows,
        f"{len(rows)} municipio(s) entre {min(inicio, fin)} y {max(inicio, fin)}.",
        total=len(rows),
    )
