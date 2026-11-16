"""Prueba de control de acceso por roles (DCL) contra la API real.

Verifica con el test client de Flask que MySQL aplica los privilegios de cada usuario
(`X-SIACC-Role`) y que `bitacora_auditoria.usuario_bd` registra al usuario real.
Ejecutar:  python tests/roles_test.py   (antes: database/siacc_roles.sql instalado)
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import app  # noqa: E402

c = app.test_client()
fallos = []
E, D, ACT = 99999201, 99999202, 99998


def call(rol, method, url, expect, body=None):
    headers = {"X-SIACC-Role": rol} if rol else {}
    kw = {"headers": headers}
    if body is not None:
        kw["json"] = body
    r = getattr(c, method)(url, **kw)
    js = r.get_json(silent=True) or {}
    good = r.status_code == expect and {"ok", "mensaje", "data"} <= set(js)
    print(f"[{'OK ' if good else 'FAIL'}] {(rol or 'env'):9} {method.upper():6} {url:42} -> {r.status_code} (esperado {expect}) {js.get('mensaje', '')[:110]}")
    if not good:
        fallos.append((rol, method, url, r.status_code, expect, js))
    return js


est = {
    "id_establecimiento": E, "id_direccion": D, "nom_estab": "ESTAB PRUEBA ROLES", "id_actividad": 2,
    "cve_ent": 30, "cve_mun": 1, "cve_loc": 1, "id_asentamiento": 53471, "id_tipo_vialidad": 1,
    "nombre_vialidad": "CALLE ROLES",
}

print("== Identidad / validación de cabecera ==")
js = call(None, "get", "/api/whoami", 200)
assert js["data"]["usuario_mysql"].startswith("root@"), js
for rol, user, rolmysql in (("consulta", "siacc_lector", "rol_consulta"),
                            ("operador", "siacc_capturista", "rol_operador"),
                            ("admin", "siacc_admin", "rol_admin")):
    js = call(rol, "get", "/api/whoami", 200)
    assert js["data"]["usuario_mysql"].startswith(user + "@"), js
    assert rolmysql in (js["data"]["roles_activos"] or ""), js
call("superuser", "get", "/api/whoami", 400)

print("\n== LECTOR (siacc_lector): consulta sí, escritura/bitácora no ==")
call("consulta", "get", "/api/health", 200)
call("consulta", "get", "/api/geografia/entidades", 200)
call("consulta", "get", "/api/geografia/territorio/rango?entidad=30&mun_inicio=1&mun_fin=3", 200)
call("consulta", "get", "/api/infraestructura/vialidades", 200)
call("consulta", "get", "/api/actividades?limit=3", 200)
call("consulta", "get", "/api/establecimientos?limit=3", 200)
call("consulta", "post", "/api/establecimientos", 403, est)
call("consulta", "post", "/api/actividades", 403, {"id_actividad": ACT, "descripcion_actividad": "NO DEBE CREARSE"})
call("consulta", "put", "/api/actividades/1", 403, {"descripcion_actividad": "NO"})
call("consulta", "delete", "/api/establecimientos/1", 403)
call("consulta", "get", "/api/bitacora", 403)

print("\n== CAPTURISTA (siacc_capturista): alta/edición sí, baja/bitácora no ==")
call("operador", "get", "/api/establecimientos?limit=3", 200)
call("operador", "post", "/api/actividades", 201, {"id_actividad": ACT, "descripcion_actividad": "ACTIVIDAD PRUEBA ROLES"})
call("operador", "put", f"/api/actividades/{ACT}", 200, {"descripcion_actividad": "ACTIVIDAD PRUEBA ROLES V2"})
call("operador", "post", "/api/establecimientos", 201, est)
call("operador", "put", f"/api/establecimientos/{E}", 200, {"nom_estab": "ESTAB PRUEBA ROLES V2"})
call("operador", "post", "/api/direcciones", 201, {"id_direccion": D + 1, "id_establecimiento": E, "cve_ent": 30, "cve_mun": 2})
call("operador", "delete", f"/api/direcciones/{D + 1}", 403)
call("operador", "delete", f"/api/establecimientos/{E}", 403)
call("operador", "get", "/api/bitacora", 403)

print("\n== ADMIN (siacc_admin): todo ==")
call("admin", "get", "/api/bitacora?limit=3", 200)
call("admin", "delete", f"/api/direcciones/{D + 1}", 200)
call("admin", "delete", f"/api/establecimientos/{E}", 200)

print("\n== Auditoría: usuario_bd real ==")
js = call("admin", "get", f"/api/bitacora?id_registro={E}&limit=20", 200)
quien = {r["accion"]: r["usuario_bd"] for r in js["data"]}
print("   ", quien)
esperado = {"INSERT": "siacc_capturista@localhost", "UPDATE": "siacc_capturista@localhost",
            "DELETE": "siacc_admin@localhost"}
if quien != esperado:
    fallos.append(("auditoria", "get", "bitacora", 0, 0, {"obtenido": quien, "esperado": esperado}))

print()
print("RESULTADO:", "TODO OK" if not fallos else f"{len(fallos)} FALLO(S)")
for f in fallos:
    print("  ", json.dumps(f, ensure_ascii=False, default=str)[:400])
sys.exit(1 if fallos else 0)
