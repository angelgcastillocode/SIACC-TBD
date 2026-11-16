-- ============================================================================
-- Proyecto Integrador SIACC
-- Archivo: database/siacc_roles.sql
-- Motor objetivo: MySQL 8.0+ (roles requieren 8.0)
-- Descripción:
--   Control de acceso basado en roles (DCL): 3 roles y 3 usuarios de aplicación
--   con privilegios diferenciados sobre bd_asentamientos.
--   Requiere haber instalado antes database/siacc_procedural.sql
--   (los GRANT EXECUTE referencian los procedimientos almacenados).
--   Script idempotente: puede ejecutarse varias veces.
--
--   Uso:  mysql -u root -p < database/siacc_roles.sql
-- ============================================================================

USE bd_asentamientos;

-- ============================================================================
-- 1. LIMPIEZA (idempotencia)
-- ============================================================================
DROP USER IF EXISTS 'siacc_lector'@'localhost';
DROP USER IF EXISTS 'siacc_capturista'@'localhost';
DROP USER IF EXISTS 'siacc_admin'@'localhost';

DROP ROLE IF EXISTS 'rol_consulta';
DROP ROLE IF EXISTS 'rol_operador';
DROP ROLE IF EXISTS 'rol_admin';

-- ============================================================================
-- 2. CREACIÓN DE ROLES
-- ============================================================================
CREATE ROLE 'rol_consulta';
CREATE ROLE 'rol_operador';
CREATE ROLE 'rol_admin';

-- ============================================================================
-- 3. CREACIÓN DE USUARIOS DE APLICACIÓN
-- ============================================================================
CREATE USER 'siacc_lector'@'localhost'     IDENTIFIED BY 'Siacc2026*';
CREATE USER 'siacc_capturista'@'localhost' IDENTIFIED BY 'Siacc2026*';
CREATE USER 'siacc_admin'@'localhost'      IDENTIFIED BY 'Siacc2026*';

-- ============================================================================
-- 4. rol_consulta  ->  siacc_lector
--    SELECT solo sobre tablas y vistas de negocio (NO bitacora_auditoria).
--    Se otorga objeto por objeto: un GRANT SELECT sobre bd_asentamientos.*
--    incluiría la bitácora y MySQL no permite restarle una tabla a un grant de
--    esquema sin activar partial_revokes.
-- ============================================================================
GRANT SELECT ON bd_asentamientos.actividad                          TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.asentamiento                       TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.detalle_vialidad                   TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.direccion                          TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.entidad                            TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.establecimiento                    TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.localidad                          TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.municipio                          TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.tipo_de_vialidad                   TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.vw_establecimientos_detalle        TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.vista_1_directorio_veracruz        TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.vista_2_auditoria_direcciones      TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.vista_3_reporte_vialidades         TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.vista_4_estadistica_sector_municipio TO 'rol_consulta';
GRANT SELECT ON bd_asentamientos.vista_5_denue_publico_descriptivo  TO 'rol_consulta';

GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_consultar_territorio_rango        TO 'rol_consulta';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_gestionar_vialidad_asentamiento   TO 'rol_consulta';

-- ============================================================================
-- 5. rol_operador  ->  siacc_capturista
--    Hereda rol_consulta + EXECUTE solo en SP de inserción/actualización.
--    Sin sp_eliminar_* y sin SELECT sobre bitacora_auditoria.
-- ============================================================================
GRANT 'rol_consulta' TO 'rol_operador';

GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_insertar_actividad_segura          TO 'rol_operador';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_actualizar_actividad               TO 'rol_operador';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_registrar_establecimiento_completo TO 'rol_operador';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_actualizar_establecimiento         TO 'rol_operador';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_agregar_direccion                  TO 'rol_operador';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_actualizar_direccion               TO 'rol_operador';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_agregar_detalle_vialidad           TO 'rol_operador';
GRANT EXECUTE ON PROCEDURE bd_asentamientos.sp_actualizar_detalle_vialidad        TO 'rol_operador';

-- ============================================================================
-- 6. rol_admin  ->  siacc_admin
--    SELECT (incluye bitacora_auditoria) y EXECUTE sobre todos los SP.
-- ============================================================================
GRANT SELECT  ON bd_asentamientos.* TO 'rol_admin';
GRANT EXECUTE ON bd_asentamientos.* TO 'rol_admin';

-- ============================================================================
-- 7. ASIGNACIÓN Y ACTIVACIÓN DE ROLES (obligatoria en MySQL 8.0)
-- ============================================================================
GRANT 'rol_consulta' TO 'siacc_lector'@'localhost';
GRANT 'rol_operador' TO 'siacc_capturista'@'localhost';
GRANT 'rol_admin'    TO 'siacc_admin'@'localhost';

SET DEFAULT ROLE ALL TO
    'siacc_lector'@'localhost',
    'siacc_capturista'@'localhost',
    'siacc_admin'@'localhost';

FLUSH PRIVILEGES;
