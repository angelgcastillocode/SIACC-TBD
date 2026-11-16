# SIACC – Sistema Integral de Automatización y Consulta Comercial

Aplicación web full-stack para la gestión y consulta del directorio comercial basado en datos DENUE/INEGI sobre `bd_asentamientos`, con lógica procedural transaccional, auditoría automática por triggers y control de acceso basado en roles (DCL) en MySQL 8.0.

## Arquitectura

- **Base de datos (MySQL 8.0+):**
  - Esquema relacional de 9 tablas y 5 vistas base (`esquema_siacc.sql`).
  - Capa procedural (`database/siacc_procedural.sql`): vista `vw_establecimientos_detalle`, tabla `bitacora_auditoria`, 3 triggers `AFTER INSERT/UPDATE/DELETE` sobre `establecimiento` y Stored Procedures transaccionales para todos los módulos.
  - Control de acceso DCL (`database/siacc_roles.sql`): 3 roles (`rol_consulta`, `rol_operador`, `rol_admin`) y 3 usuarios de aplicación (`siacc_lector`, `siacc_capturista`, `siacc_admin`).
- **Backend (Python + Flask):**
  - API REST modular mediante Blueprints en `modules/` y servidor estático en `app.py`.
  - Pool de conexiones seguro por rol en `config/database.py` (conmutado mediante la cabecera HTTP `X-SIACC-Role`: `consulta`, `operador`, `admin`, o fallback a `.env`).
  - Todas las escrituras en los módulos 2, 3 y 4 se ejecutan exclusivamente vía `CALL` a Stored Procedures.
- **Frontend (HTML5 + CSS3 + JavaScript ES6+ Vanilla):**
  - SPA multipanel en `frontend/` con navegación lateral, selector de perfil/rol en vivo, notificaciones toast con el mensaje exacto devuelto por MySQL, modales accesibles y comparador visual `OLD` vs `NEW` en la bitácora.

## Estructura del proyecto

```text
├── app.py                              # Servidor principal Flask, CORS, manejo de errores y estáticos
├── requirements.txt                    # Dependencias Python (flask, flask-cors, mysql-connector-python, python-dotenv)
├── .env.example                        # Plantilla de variables de entorno (copiar a .env)
├── esquema_siacc.sql                   # Esquema oficial de tablas y vistas base
├── database/
│   ├── siacc_procedural.sql            # Triggers, bitácora, vista detalle y Stored Procedures
│   └── siacc_roles.sql                 # Roles DCL y usuarios de aplicación MySQL 8.0
├── config/
│   └── database.py                     # Pools de conexión por rol y ejecutor seguro de SP
├── utils/
│   ├── responses.py                    # Formato JSON estándar {"ok", "mensaje", "data"}
│   └── validation.py                   # Validación y paginación de parámetros HTTP
├── modules/
│   ├── modulo1_geografia/routes.py     # Módulo 1: entidad, municipio, localidad y consulta BETWEEN
│   ├── modulo2_infraestructura/routes.py # Módulo 2: tipo_de_vialidad y asentamiento
│   ├── modulo3_actividad/routes.py     # Módulo 3: catálogo actividad vía SP
│   ├── modulo4_establecimientos/routes.py # Módulo 4: CRUD establecimiento, direccion y detalle_vialidad
│   └── auditoria/routes.py             # Auditoría: GET /api/bitacora
├── frontend/
│   ├── index.html                      # Layout SPA con sidebar, topbar y selector de rol
│   ├── css/styles.css                  # Sistema de diseño (paleta pizarra / azul marino / esmeralda)
│   └── js/
│       ├── api.js                      # Cliente fetch(), cabecera X-SIACC-Role y toasts
│       ├── app.js                      # Enrutador SPA y monitor /api/health + /api/whoami
│       ├── ui.js                       # Modales, paginación, alertas y utilidades DOM
│       ├── modulo1.js                  # UI Módulo 1: Geografía y Territorialidad
│       ├── modulo2.js                  # UI Módulo 2: Infraestructura Urbana
│       ├── modulo3.js                  # UI Módulo 3: Clasificación Económica
│       ├── modulo4.js                  # UI Módulo 4: Establecimientos, Direcciones y Vialidades
│       └── bitacora.js                 # UI Bitácora de Auditoría y diff OLD/NEW
└── tests/
    ├── smoke_test.py                   # Pruebas end-to-end de la API
    ├── roles_test.py                   # Pruebas de permisos DCL por rol (HTTP 200/201/403)
    └── cleanup_test_data.sql           # Limpieza de datos temporales de prueba
```

## Instalación y puesta en marcha

### 1. Base de datos (MySQL 8.0+)
Crea la base de datos e importa en orden el esquema, la lógica procedural y los roles:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS bd_asentamientos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p bd_asentamientos < esquema_siacc.sql
mysql -u root -p bd_asentamientos < database/siacc_procedural.sql
mysql -u root -p bd_asentamientos < database/siacc_roles.sql
```

### 2. Entorno Python y configuración
```bash
python -m venv .venv
# En Windows PowerShell: .\.venv\Scripts\Activate.ps1
# En Linux/macOS: source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```
Edita `.env` con tus credenciales locales de MySQL (`DB_PASSWORD` y `SIACC_ROLE_PASSWORD`).

### 3. Ejecutar el servidor
```bash
python app.py
```
Abre `http://127.0.0.1:5000/` en tu navegador.
