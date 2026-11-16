"""Gestor de conexiones MySQL para SIACC.

- Un pool de conexiones por perfil (lazy y thread-safe):
    * sin cabecera `X-SIACC-Role`  -> usuario de `.env` (fallback)
    * `consulta`  -> siacc_lector
    * `operador`  -> siacc_capturista
    * `admin`     -> siacc_admin
- El perfil se toma de la cabecera HTTP de la petición Flask en curso, de modo que
  MySQL aplique los privilegios reales del usuario (GRANT/ROLE) y `bitacora_auditoria`
  registre el `usuario_bd` correspondiente.
- Credenciales leídas de `.env` (nunca hardcodeadas en el código fuente).
- Context managers que garantizan el cierre de cursores y la devolución de
  conexiones al pool incluso ante excepciones.
"""
import os
import re
import threading
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from flask import has_request_context, request
from mysql.connector import pooling

from utils.responses import ApiError

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ROLE_HEADER = "X-SIACC-Role"

# perfil de la UI -> usuario MySQL de aplicación
ROLE_USERS = {
    "consulta": "siacc_lector",
    "operador": "siacc_capturista",
    "admin": "siacc_admin",
}

_pools = {}
_pool_lock = threading.Lock()
_PROC_NAME = re.compile(r"^sp_[a-z0-9_]+$")


def current_role():
    """Perfil solicitado por la petición HTTP actual (None = fallback .env)."""
    if not has_request_context():
        return None
    raw = request.headers.get(ROLE_HEADER)
    if raw is None or raw.strip() == "":
        return None
    role = raw.strip().lower()
    if role not in ROLE_USERS:
        raise ApiError(
            f"Perfil '{raw}' no válido en la cabecera {ROLE_HEADER}. "
            f"Use: {', '.join(ROLE_USERS)}.",
            400,
        )
    return role


def _db_config(role=None):
    missing = [k for k in ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME") if os.getenv(k) is None]
    if missing:
        raise RuntimeError("Faltan variables de entorno en .env: " + ", ".join(missing))
    if role is None:
        user, password = os.getenv("DB_USER"), os.getenv("DB_PASSWORD")
    else:
        user = ROLE_USERS[role]
        password = os.getenv("SIACC_ROLE_PASSWORD", "Siacc2026*")
    return {
        "host": os.getenv("DB_HOST"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": user,
        "password": password,
        "database": os.getenv("DB_NAME"),
        "charset": "utf8mb4",
        "collation": "utf8mb4_unicode_ci",
        "connection_timeout": 10,
        # Los SP gestionan sus propias transacciones (START TRANSACTION/COMMIT).
        "autocommit": True,
    }


def get_pool(role=None):
    """Devuelve el pool del perfil indicado (se crea en el primer uso)."""
    pool = _pools.get(role)
    if pool is None:
        with _pool_lock:
            pool = _pools.get(role)
            if pool is None:
                size = int(os.getenv("DB_POOL_SIZE", "8")) if role is None else int(os.getenv("DB_ROLE_POOL_SIZE", "4"))
                pool = pooling.MySQLConnectionPool(
                    pool_name=f"siacc_pool_{role or 'env'}",
                    pool_size=size,
                    pool_reset_session=True,
                    **_db_config(role),
                )
                _pools[role] = pool
    return pool


@contextmanager
def get_connection(role=None):
    """Obtiene una conexión del pool del perfil activo y la devuelve siempre al salir.

    Si no se indica `role`, se toma de la cabecera X-SIACC-Role de la petición actual.
    """
    if role is None:
        role = current_role()
    conn = get_pool(role).get_connection()
    try:
        yield conn
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        conn.close()  # en un PooledMySQLConnection, close() la regresa al pool


@contextmanager
def get_cursor(dictionary=True):
    """Cursor con cierre automático (y cierre/devolución de la conexión)."""
    with get_connection() as conn:
        cursor = conn.cursor(dictionary=dictionary)
        try:
            yield cursor
        finally:
            cursor.close()


def _rows_as_dicts(result_cursor):
    names = list(result_cursor.column_names or [])
    rows = result_cursor.fetchall()
    if rows and not isinstance(rows[0], dict):
        rows = [dict(zip(names, r)) for r in rows]
    return rows


def query_all(sql, params=None):
    """SELECT parametrizado -> lista de dicts."""
    with get_cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchall()


def query_one(sql, params=None):
    """SELECT parametrizado -> un dict o None."""
    rows = query_all(sql, params)
    return rows[0] if rows else None


def call_procedure(name, args=()):
    """Ejecuta `CALL name(args)` y devuelve una lista de result sets.

    Cada result set es una lista de dicts. Los nombres de procedimiento se
    validan contra `sp_*` para evitar inyección por nombre.
    """
    if not _PROC_NAME.match(name):
        raise ValueError(f"Nombre de procedimiento no permitido: {name!r}")
    with get_cursor() as cur:
        cur.callproc(name, list(args))
        return [_rows_as_dicts(rs) for rs in cur.stored_results()]


def ping():
    """True si la base de datos responde."""
    row = query_one("SELECT 1 AS ok")
    return bool(row and row["ok"] == 1)


def whoami():
    """Identidad real de la sesión MySQL (usuario autenticado y roles activos)."""
    return query_one(
        "SELECT CURRENT_USER() AS usuario_mysql, USER() AS usuario_conexion, "
        "CAST(CURRENT_ROLE() AS CHAR) AS roles_activos"
    )
