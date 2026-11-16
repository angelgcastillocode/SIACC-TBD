"""Módulo 4 - Establecimientos: CRUD de establecimiento, direccion y detalle_vialidad.

- Lecturas: vw_establecimientos_detalle (y detalle_vialidad para sus detalles).
- Escrituras/bajas: únicamente `CALL` a Stored Procedures (sin INSERT/UPDATE/DELETE en Python).
"""
from flask import Blueprint, request

from config.database import call_procedure, query_all, query_one
from utils.responses import ApiError, fail, ok, sp_response
from utils.validation import arg_int, arg_str, json_body, pagination, to_int, to_str

bp = Blueprint("modulo4_establecimientos", __name__, url_prefix="/api")

VISTA = "vw_establecimientos_detalle"

COLS_ESTABLECIMIENTO = (
    "id_establecimiento, clee, nom_estab, raz_social, codigo_act, id_actividad, descripcion_actividad, "
    "per_ocu, telefono, correoelec, www, tipoUniEco, fecha_alta, id_direccion, numero_ext, numero_int, "
    "cod_postal, tipo_asent, nombre_asentamiento, id_asentamiento, latitud, longitud, ageb, manzana, "
    "cve_loc, Clave_Municipio, Nombre_Municipio, Clave_Entidad, Nombre_Entidad"
)
COLS_DIRECCION = (
    "id_direccion, id_establecimiento, numero_ext, numero_int, cod_postal, tipo_asent, nombre_asentamiento, "
    "id_asentamiento, latitud, longitud, ageb, manzana, cve_loc, Clave_Municipio, Nombre_Municipio, "
    "Clave_Entidad, Nombre_Entidad"
)


def _coord(value, field):
    """Latitud/longitud se almacenan como VARCHAR; acepta números o texto."""
    return to_str(None if value is None else str(value), field, max_len=50)


# ============================================================================
# ESTABLECIMIENTO
# ============================================================================

@bp.get("/establecimientos")
def listar_establecimientos():
    q = arg_str("q")
    page, limit, offset = pagination()

    where, params = [], []
    if q:
        where.append("(nom_estab LIKE %s OR raz_social LIKE %s OR clee LIKE %s)")
        params += [f"%{q}%"] * 3
    for arg, column in (("entidad", "Clave_Entidad"), ("municipio", "Clave_Municipio"),
                        ("actividad", "id_actividad")):
        value = arg_int(arg)
        if value is not None:
            where.append(f"{column} = %s")
            params.append(value)
    clause = (" WHERE " + " AND ".join(where)) if where else ""

    # Se pide limit+1 filas para saber si hay más páginas sin un COUNT(*) costoso sobre la vista.
    rows = query_all(
        f"SELECT {COLS_ESTABLECIMIENTO} FROM {VISTA}{clause} "
        "ORDER BY id_direccion LIMIT %s OFFSET %s",
        params + [limit + 1, offset],
    )
    hay_mas = len(rows) > limit
    rows = rows[:limit]
    return ok(rows, f"{len(rows)} establecimiento(s) en la página {page}.",
              pagina=page, limite=limit, hay_mas=hay_mas)


@bp.get("/establecimientos/<int:id_establecimiento>")
def obtener_establecimiento(id_establecimiento):
    rows = query_all(
        f"SELECT {COLS_ESTABLECIMIENTO} FROM {VISTA} WHERE id_establecimiento = %s ORDER BY id_direccion",
        (id_establecimiento,),
    )
    if not rows:
        return fail(f"No existe el establecimiento {id_establecimiento} (o no tiene dirección/municipio asociado).", 404)
    vialidades = query_all(
        "SELECT dv.id_detalle, dv.id_direccion, dv.tipo_vialidad, dv.nombre_vialidad "
        "FROM detalle_vialidad dv INNER JOIN direccion d ON d.id_direccion = dv.id_direccion "
        "WHERE d.id_establecimiento = %s ORDER BY dv.id_detalle",
        (id_establecimiento,),
    )
    return ok({"establecimiento": rows[0], "direcciones": rows, "vialidades": vialidades},
              "Establecimiento encontrado.")


@bp.post("/establecimientos")
def crear_establecimiento():
    b = json_body()
    id_est = to_int(b.get("id_establecimiento"), "id_establecimiento", required=True, minimum=1)
    id_dir = to_int(b.get("id_direccion"), "id_direccion", minimum=1) or id_est
    args = [
        id_est,
        to_str(b.get("clee"), "clee", max_len=50),
        to_str(b.get("nom_estab"), "nom_estab", required=True),
        to_str(b.get("raz_social"), "raz_social"),
        to_int(b.get("id_actividad"), "id_actividad", required=True, minimum=1),
        to_str(b.get("per_ocu"), "per_ocu", max_len=50),
        to_str(b.get("telefono"), "telefono", max_len=50),
        to_str(b.get("correoelec"), "correoelec", max_len=100),
        to_str(b.get("www"), "www", max_len=100),
        to_str(b.get("tipoUniEco"), "tipoUniEco", max_len=50),
        to_str(b.get("fecha_alta"), "fecha_alta", max_len=50),
        id_dir,
        to_str(b.get("numero_ext"), "numero_ext", max_len=50),
        to_str(b.get("cod_postal"), "cod_postal", max_len=10),
        _coord(b.get("latitud"), "latitud"),
        _coord(b.get("longitud"), "longitud"),
        to_int(b.get("cve_ent"), "cve_ent", required=True),
        to_int(b.get("cve_mun"), "cve_mun", required=True),
        to_int(b.get("cve_loc"), "cve_loc"),
        to_int(b.get("id_asentamiento"), "id_asentamiento", required=True),
        to_int(b.get("id_tipo_vialidad"), "id_tipo_vialidad", required=True),
        to_str(b.get("nombre_vialidad"), "nombre_vialidad"),
    ]
    return sp_response(call_procedure("sp_registrar_establecimiento_completo", args), 201)


@bp.put("/establecimientos/<int:id_establecimiento>")
def actualizar_establecimiento(id_establecimiento):
    b = json_body()
    cve_ent = to_int(b.get("cve_ent"), "cve_ent")
    cve_mun = to_int(b.get("cve_mun"), "cve_mun")
    if (cve_ent is None) != (cve_mun is None):
        raise ApiError("Para cambiar la ubicación envíe 'cve_ent' y 'cve_mun' juntos.", 400)
    campos = [
        to_str(b.get("nom_estab"), "nom_estab"),
        to_str(b.get("raz_social"), "raz_social"),
        to_int(b.get("id_actividad"), "id_actividad", minimum=1),
        to_str(b.get("per_ocu"), "per_ocu", max_len=50),
        to_str(b.get("telefono"), "telefono", max_len=50),
        to_str(b.get("correoelec"), "correoelec", max_len=100),
        to_str(b.get("www"), "www", max_len=100),
        to_str(b.get("numero_ext"), "numero_ext", max_len=50),
        to_str(b.get("cod_postal"), "cod_postal", max_len=10),
        cve_ent,
        cve_mun,
    ]
    if all(c is None for c in campos):
        raise ApiError("No se envió ningún campo para actualizar.", 400)
    return sp_response(call_procedure("sp_actualizar_establecimiento", [id_establecimiento] + campos))


@bp.delete("/establecimientos/<int:id_establecimiento>")
def eliminar_establecimiento(id_establecimiento):
    return sp_response(call_procedure("sp_eliminar_establecimiento", [id_establecimiento]))


# ============================================================================
# DIRECCION
# ============================================================================

@bp.get("/direcciones")
def listar_direcciones():
    id_est = arg_int("id_establecimiento")
    page, limit, offset = pagination()
    clause, params = "", []
    if id_est is not None:
        clause, params = " WHERE id_establecimiento = %s", [id_est]
    rows = query_all(
        f"SELECT {COLS_DIRECCION} FROM {VISTA}{clause} ORDER BY id_direccion LIMIT %s OFFSET %s",
        params + [limit + 1, offset],
    )
    hay_mas = len(rows) > limit
    rows = rows[:limit]
    return ok(rows, f"{len(rows)} dirección(es) en la página {page}.", pagina=page, limite=limit, hay_mas=hay_mas)


@bp.get("/direcciones/<int:id_direccion>")
def obtener_direccion(id_direccion):
    row = query_one(f"SELECT {COLS_DIRECCION} FROM {VISTA} WHERE id_direccion = %s", (id_direccion,))
    if not row:
        return fail(f"No existe la dirección {id_direccion}.", 404)
    return ok(row, "Dirección encontrada.")


def _campos_direccion(b):
    return [
        to_str(b.get("numero_ext"), "numero_ext", max_len=50),
        to_str(b.get("numero_int"), "numero_int", max_len=50),
        to_str(b.get("cod_postal"), "cod_postal", max_len=10),
        to_str(b.get("tipo_asent"), "tipo_asent", max_len=50),
        to_str(b.get("nomb_asent"), "nomb_asent"),
        _coord(b.get("latitud"), "latitud"),
        _coord(b.get("longitud"), "longitud"),
        to_str(b.get("ageb"), "ageb", max_len=20),
        to_str(b.get("manzana"), "manzana", max_len=20),
    ]


@bp.post("/direcciones")
def crear_direccion():
    b = json_body()
    args = [
        to_int(b.get("id_direccion"), "id_direccion", required=True, minimum=1),
        to_int(b.get("id_establecimiento"), "id_establecimiento", required=True, minimum=1),
    ] + _campos_direccion(b) + [
        to_int(b.get("cve_ent"), "cve_ent", required=True),
        to_int(b.get("cve_mun"), "cve_mun", required=True),
        to_int(b.get("cve_loc"), "cve_loc"),
    ]
    return sp_response(call_procedure("sp_agregar_direccion", args), 201)


@bp.put("/direcciones/<int:id_direccion>")
def actualizar_direccion(id_direccion):
    b = json_body()
    campos = _campos_direccion(b) + [
        to_int(b.get("cve_ent"), "cve_ent"),
        to_int(b.get("cve_mun"), "cve_mun"),
        to_int(b.get("cve_loc"), "cve_loc"),
    ]
    if all(c is None for c in campos):
        raise ApiError("No se envió ningún campo para actualizar.", 400)
    return sp_response(call_procedure("sp_actualizar_direccion", [id_direccion] + campos))


@bp.delete("/direcciones/<int:id_direccion>")
def eliminar_direccion(id_direccion):
    return sp_response(call_procedure("sp_eliminar_direccion", [id_direccion]))


# ============================================================================
# DETALLE_VIALIDAD
# ============================================================================

@bp.get("/detalles-vialidad")
def listar_detalles_vialidad():
    id_dir = arg_int("id_direccion")
    page, limit, offset = pagination()
    clause, params = "", []
    if id_dir is not None:
        clause, params = " WHERE id_direccion = %s", [id_dir]
    rows = query_all(
        "SELECT id_detalle, id_direccion, tipo_vialidad, nombre_vialidad "
        f"FROM detalle_vialidad{clause} ORDER BY id_detalle LIMIT %s OFFSET %s",
        params + [limit + 1, offset],
    )
    hay_mas = len(rows) > limit
    rows = rows[:limit]
    return ok(rows, f"{len(rows)} detalle(s) de vialidad en la página {page}.",
              pagina=page, limite=limit, hay_mas=hay_mas)


@bp.get("/detalles-vialidad/<int:id_detalle>")
def obtener_detalle_vialidad(id_detalle):
    row = query_one(
        "SELECT id_detalle, id_direccion, tipo_vialidad, nombre_vialidad "
        "FROM detalle_vialidad WHERE id_detalle = %s",
        (id_detalle,),
    )
    if not row:
        return fail(f"No existe el detalle de vialidad {id_detalle}.", 404)
    return ok(row, "Detalle de vialidad encontrado.")


@bp.post("/detalles-vialidad")
def crear_detalle_vialidad():
    b = json_body()
    args = [
        to_int(b.get("id_direccion"), "id_direccion", required=True, minimum=1),
        to_int(b.get("id_tipo_vialidad"), "id_tipo_vialidad", required=True, minimum=1),
        to_str(b.get("nombre_vialidad"), "nombre_vialidad", required=True),
    ]
    return sp_response(call_procedure("sp_agregar_detalle_vialidad", args), 201)


@bp.put("/detalles-vialidad/<int:id_detalle>")
def actualizar_detalle_vialidad(id_detalle):
    b = json_body()
    tipo = to_int(b.get("id_tipo_vialidad"), "id_tipo_vialidad", minimum=1)
    nombre = to_str(b.get("nombre_vialidad"), "nombre_vialidad")
    if tipo is None and nombre is None:
        raise ApiError("Envíe 'id_tipo_vialidad' y/o 'nombre_vialidad'.", 400)
    return sp_response(call_procedure("sp_actualizar_detalle_vialidad", [id_detalle, tipo, nombre]))


@bp.delete("/detalles-vialidad/<int:id_detalle>")
def eliminar_detalle_vialidad(id_detalle):
    return sp_response(call_procedure("sp_eliminar_detalle_vialidad", [id_detalle]))
