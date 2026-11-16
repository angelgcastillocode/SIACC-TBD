"""Prueba de humo end-to-end de la API SIACC (usa el test client de Flask y la BD real).

Crea datos de prueba con IDs altos y los elimina al final mediante los propios SP.
Ejecutar:  python tests/smoke_test.py
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import app  # noqa: E402

c = app.test_client()
fallos = []

E, D, ACT, ASE, VIA = 99999101, 99999102, 99999, 99999103, 99999
TEST_EST_DIR2 = 99999104


def call(method, url, expect, body=None):
    t0 = time.perf_counter()
    r = getattr(c, method)(url, json=body) if body is not None else getattr(c, method)(url)
    ms = (time.perf_counter() - t0) * 1000
    js = r.get_json(silent=True)
    ok_shape = isinstance(js, dict) and {"ok", "mensaje", "data"} <= set(js)
    good = r.status_code == expect and ok_shape
    print(f"[{'OK ' if good else 'FAIL'}] {method.upper():6} {url:70} -> {r.status_code} ({ms:6.0f} ms) {js.get('mensaje') if js else ''}")
    if not good:
        fallos.append((method, url, r.status_code, expect, js))
    return js


# --- Salud / Módulo 1 ---------------------------------------------------------
def acciones_bitacora():
    js_ = c.get(f"/api/bitacora?id_registro={E}&limit=500").get_json()
    from collections import Counter
    return Counter(r["accion"] for r in js_["data"])


base = acciones_bitacora()
call("get", "/api/health", 200)
call("get", "/api/geografia/entidades", 200)
call("get", "/api/geografia/entidades/30", 200)
call("get", "/api/geografia/entidades/999", 404)
call("get", "/api/geografia/municipios?entidad=30&limit=5", 200)
call("get", "/api/geografia/localidades?municipio=1&limit=5", 200)
js = call("get", "/api/geografia/territorio/rango?entidad=30&mun_inicio=1&mun_fin=5", 200)
assert len(js["data"]) == 5, js
call("get", "/api/geografia/territorio/rango?entidad=30&mun_inicio=5&mun_fin=1", 200)  # rango invertido
call("get", "/api/geografia/territorio/rango?entidad=30&mun_inicio=1", 400)
call("get", "/api/geografia/territorio/rango?mun_inicio=a&mun_fin=2", 400)

# --- Módulo 2 -----------------------------------------------------------------
call("get", "/api/infraestructura/vialidades", 200)
call("post", "/api/infraestructura/vialidades", 201, {"id_tipo_vialidad": VIA, "descripcion_vialidad": "VIALIDAD DE PRUEBA"})
call("post", "/api/infraestructura/vialidades", 409, {"id_tipo_vialidad": VIA, "descripcion_vialidad": "VIALIDAD DE PRUEBA"})
call("post", "/api/infraestructura/vialidades", 400, {"id_tipo_vialidad": 5})
call("get", "/api/infraestructura/asentamientos?entidad=30&limit=3", 200)
call("post", "/api/infraestructura/asentamientos", 201, {"id_asentamiento": ASE, "nombre_asentamiento": "COLONIA PRUEBA", "codigo_postal": "91000", "clave_entidad": 30})
call("post", "/api/infraestructura/asentamientos", 404, {"id_asentamiento": ASE + 50, "nombre_asentamiento": "X", "clave_entidad": 999})

# --- Módulo 3 -----------------------------------------------------------------
call("get", "/api/actividades?limit=3", 200)
call("get", "/api/actividades/1", 200)
call("post", "/api/actividades", 201, {"id_actividad": ACT, "descripcion_actividad": "ACTIVIDAD DE PRUEBA"})
call("post", "/api/actividades", 409, {"id_actividad": ACT, "descripcion_actividad": "OTRA"})
call("put", f"/api/actividades/{ACT}", 200, {"descripcion_actividad": "ACTIVIDAD DE PRUEBA EDITADA"})
call("put", "/api/actividades/88888888", 404, {"descripcion_actividad": "NADA"})

# --- Módulo 4 -----------------------------------------------------------------
est = {
    "id_establecimiento": E, "id_direccion": D, "clee": "TESTCLEE99", "nom_estab": "ESTABLECIMIENTO PRUEBA",
    "raz_social": "PRUEBA SA DE CV", "id_actividad": ACT, "per_ocu": "0 a 5 personas", "telefono": "2290000000",
    "correoelec": "prueba@siacc.mx", "tipoUniEco": "Fijo", "fecha_alta": "2026-11", "numero_ext": "1",
    "cod_postal": "91000", "latitud": 19.5, "longitud": -96.9, "cve_ent": 30, "cve_mun": 1, "cve_loc": 1,
    "id_asentamiento": ASE, "id_tipo_vialidad": VIA, "nombre_vialidad": "CALLE PRUEBA",
}
call("post", "/api/establecimientos", 201, est)
call("post", "/api/establecimientos", 409, est)
call("post", "/api/establecimientos", 400, {"id_establecimiento": 5})
call("post", "/api/establecimientos", 404, {**est, "id_establecimiento": E + 50, "id_direccion": D + 50, "id_actividad": 88888888})
call("get", "/api/establecimientos?limit=5", 200)
call("get", "/api/establecimientos?q=PRUEBA&limit=5", 200)
js = call("get", f"/api/establecimientos/{E}", 200)
assert js["data"]["establecimiento"]["descripcion_actividad"] == "ACTIVIDAD DE PRUEBA EDITADA", js
call("get", "/api/establecimientos/88888888", 404)
call("put", f"/api/establecimientos/{E}", 200, {"nom_estab": "ESTABLECIMIENTO PRUEBA V2", "telefono": "2291111111"})
call("put", f"/api/establecimientos/{E}", 400, {})
call("put", f"/api/establecimientos/{E}", 400, {"cve_ent": 30})
call("put", "/api/establecimientos/88888888", 404, {"nom_estab": "X"})

call("get", f"/api/direcciones?id_establecimiento={E}", 200)
call("get", f"/api/direcciones/{D}", 200)
call("post", "/api/direcciones", 201, {"id_direccion": TEST_EST_DIR2, "id_establecimiento": E, "numero_ext": "2", "cve_ent": 30, "cve_mun": 2, "cve_loc": 1})
call("put", f"/api/direcciones/{TEST_EST_DIR2}", 200, {"numero_ext": "22", "cod_postal": "91010"})
call("put", f"/api/direcciones/{TEST_EST_DIR2}", 404, {"cve_ent": 30, "cve_mun": 99999})
call("delete", f"/api/direcciones/{TEST_EST_DIR2}", 200)

call("get", f"/api/detalles-vialidad?id_direccion={D}", 200)
js = call("post", "/api/detalles-vialidad", 201, {"id_direccion": D, "id_tipo_vialidad": 1, "nombre_vialidad": "ENTRE CALLE A"})
id_det = js["data"]["id_detalle"]
call("get", f"/api/detalles-vialidad/{id_det}", 200)
call("put", f"/api/detalles-vialidad/{id_det}", 200, {"nombre_vialidad": "ENTRE CALLE B"})
call("delete", f"/api/detalles-vialidad/{id_det}", 200)
call("delete", f"/api/detalles-vialidad/{id_det}", 404)

# --- Auditoría (antes de limpiar) ----------------------------------------------
call("get", f"/api/bitacora?tabla=establecimiento&id_registro={E}", 200)
delta = acciones_bitacora() - base
print("      movimientos nuevos en bitácora antes de la baja:", dict(delta))
assert dict(delta) == {"INSERT": 1, "UPDATE": 1}, delta

# --- Limpieza --------------------------------------------------------------------
call("delete", f"/api/establecimientos/{E}", 200)
call("delete", f"/api/establecimientos/{E}", 404)
call("get", f"/api/bitacora?id_registro={E}&limit=10", 200)
delta = acciones_bitacora() - base
print("      movimientos nuevos en bitácora tras la baja:", dict(delta))
assert dict(delta) == {"INSERT": 1, "UPDATE": 1, "DELETE": 1}, delta
call("get", "/api/bitacora?accion=XXX", 400)
call("get", "/api/ruta-inexistente", 404)
call("get", "/api/bitacora?limit=3", 200)

print()
print("RESULTADO:", "TODO OK" if not fallos else f"{len(fallos)} FALLO(S)")
for f in fallos:
    print("  ", f[0], f[1], "obtuvo", f[2], "esperado", f[3], json.dumps(f[4], ensure_ascii=False)[:300])
sys.exit(1 if fallos else 0)
