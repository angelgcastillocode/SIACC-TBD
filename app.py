"""SIACC - Servidor principal Flask.

Registra los blueprints de los 4 módulos + auditoría, habilita CORS y sirve el
frontend estático desde ./frontend.
"""
import logging
import os
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from mysql.connector import Error as MySQLError
from mysql.connector import errors as mysql_errors
from werkzeug.exceptions import HTTPException

from config.database import current_role, ping, whoami
from modules.auditoria.routes import bp as auditoria_bp
from modules.modulo1_geografia.routes import bp as geografia_bp
from modules.modulo2_infraestructura.routes import bp as infraestructura_bp
from modules.modulo3_actividad.routes import bp as actividad_bp
from modules.modulo4_establecimientos.routes import bp as establecimientos_bp
from utils.responses import ApiError, fail

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("siacc")

# Errores de MySQL que significan "privilegios insuficientes" -> HTTP 403
DENIED_ERRNOS = {1044, 1142, 1143, 1227, 1370}


class SiaccJSONProvider(DefaultJSONProvider):
    """Serializa fechas en ISO-8601 y Decimal como número."""

    @staticmethod
    def default(o):
        if isinstance(o, (datetime, date, time)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, timedelta):
            return str(o)
        if isinstance(o, (bytes, bytearray)):
            return o.decode("utf-8", errors="replace")
        return DefaultJSONProvider.default(o)


def create_app():
    app = Flask(__name__, static_folder=None)
    app.json = SiaccJSONProvider(app)
    app.json.ensure_ascii = False
    app.json.sort_keys = False
    CORS(app, resources={r"/api/*": {"origins": "*",
                                     "allow_headers": ["Content-Type", "Accept", "X-SIACC-Role"]}})

    for bp in (geografia_bp, infraestructura_bp, actividad_bp, establecimientos_bp, auditoria_bp):
        app.register_blueprint(bp)

    # ------------------------------------------------------------------ API util
    @app.get("/api/health")
    def health():
        try:
            return jsonify({"ok": True, "mensaje": "API y base de datos operativas.", "data": {"db": ping()}})
        except Exception as exc:  # noqa: BLE001
            log.exception("Health check falló")
            return fail(f"Base de datos no disponible: {exc}", 503)

    @app.get("/api/whoami")
    def whoami_endpoint():
        """Identidad real de la sesión MySQL abierta para el perfil de la cabecera X-SIACC-Role."""
        info = whoami()
        info["perfil"] = current_role() or "env (fallback .env)"
        return jsonify({"ok": True, "mensaje": "Sesión MySQL activa.", "data": info})

    @app.get("/api")
    def api_index():
        rutas = sorted(
            {f"{','.join(sorted(r.methods - {'HEAD', 'OPTIONS'}))} {r.rule}"
             for r in app.url_map.iter_rules() if r.rule.startswith("/api")}
        )
        return jsonify({"ok": True, "mensaje": "SIACC API", "data": rutas})

    # ------------------------------------------------------------- Errores JSON
    @app.errorhandler(ApiError)
    def on_api_error(err):
        return fail(err.mensaje, err.status, err.data)

    @app.errorhandler(mysql_errors.IntegrityError)
    def on_integrity(err):
        return fail(f"Violación de integridad (MySQL {err.errno}): {err.msg}", 409)

    @app.errorhandler(mysql_errors.PoolError)
    def on_pool(err):
        log.error("Pool de conexiones agotado: %s", err)
        return fail("Servidor ocupado: sin conexiones disponibles en el pool.", 503)

    @app.errorhandler(mysql_errors.DatabaseError)
    def on_db_error(err):
        # Incluye ProgrammingError, DataError, OperationalError, InternalError...
        errno = getattr(err, "errno", None)
        log.error("Error MySQL %s: %s", errno, err)
        if errno in DENIED_ERRNOS:
            # 1370 EXECUTE denegado, 1142 SELECT/INSERT/UPDATE/DELETE denegado, etc.
            return fail(f"Acceso denegado por privilegios de MySQL para el rol actual: {getattr(err, 'msg', err)}", 403)
        if errno == 1045:
            return fail(
                "MySQL rechazó las credenciales del perfil activo. "
                "¿Se instaló database/siacc_roles.sql? "
                f"({getattr(err, 'msg', err)})", 503)
        status = 503 if isinstance(err, (mysql_errors.OperationalError, mysql_errors.InterfaceError)) else 400
        return fail(f"Error de base de datos (MySQL {getattr(err, 'errno', '?')}): {getattr(err, 'msg', err)}", status)

    @app.errorhandler(MySQLError)
    def on_mysql(err):
        log.error("Error MySQL: %s", err)
        return fail(f"Error de base de datos: {err}", 503)

    @app.errorhandler(HTTPException)
    def on_http(err):
        return fail(err.description or err.name, err.code or 500)

    @app.errorhandler(Exception)
    def on_unexpected(err):
        log.exception("Error no controlado")
        return fail("Error interno del servidor.", 500)

    # ------------------------------------------------------------ Frontend estático
    @app.get("/")
    def index():
        if (FRONTEND_DIR / "index.html").is_file():
            return send_from_directory(FRONTEND_DIR, "index.html")
        return jsonify({"ok": True,
                        "mensaje": "SIACC API activa. El frontend aún no existe (carpeta frontend/). Ver /api",
                        "data": None})

    @app.get("/<path:filename>")
    def frontend_files(filename):
        if filename.startswith("api/"):
            return fail("Ruta de API no encontrada.", 404)
        if (FRONTEND_DIR / filename).is_file():
            return send_from_directory(FRONTEND_DIR, filename)
        return fail("Recurso no encontrado.", 404)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
