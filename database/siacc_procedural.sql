-- ============================================================================
-- Proyecto Integrador SIACC (Unidad 5)
-- Archivo: database/siacc_procedural.sql
-- Motor objetivo: MySQL 8.0+ (Compatible con MySQL Workbench 8.0)
-- Descripción:
--   Lógica procedural, vistas de consulta, tabla y triggers de auditoría
--   basados estrictamente en el esquema oficial de @esquema_siacc.sql.
--
-- Portabilidad:
--   Cambie el nombre de la base de datos en la instrucción USE si despliega
--   en un esquema distinto a `bd_asentamientos`. No se antepone el nombre del
--   esquema dentro de las definiciones para mantener portabilidad total.
-- ============================================================================

USE bd_asentamientos;

SET NAMES utf8mb4;

-- ============================================================================
-- SECCIÓN 0: ÍNDICES DE APOYO (idempotentes)
--   direccion.id_establecimiento y detalle_vialidad.id_direccion no tienen
--   índice en el esquema oficial; sin ellos la vista y los SP hacen full scan.
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_tmp_crear_indice;

DELIMITER //

CREATE PROCEDURE sp_tmp_crear_indice(
    IN p_tabla  VARCHAR(64),
    IN p_indice VARCHAR(64),
    IN p_cols   VARCHAR(128)
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    SELECT COUNT(*) INTO v_existe
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name   = p_tabla
      AND index_name   = p_indice;

    IF v_existe = 0 THEN
        SET @sql_idx = CONCAT('CREATE INDEX `', p_indice, '` ON `', p_tabla, '` (', p_cols, ')');
        PREPARE stmt_idx FROM @sql_idx;
        EXECUTE stmt_idx;
        DEALLOCATE PREPARE stmt_idx;
    END IF;
END //

DELIMITER ;

CALL sp_tmp_crear_indice('direccion',        'idx_direccion_establecimiento', '`id_establecimiento`');
CALL sp_tmp_crear_indice('detalle_vialidad', 'idx_detalle_vialidad_direccion', '`id_direccion`');

DROP PROCEDURE IF EXISTS sp_tmp_crear_indice;


-- ============================================================================
-- SECCIÓN 1: TABLA DE AUDITORÍA
-- ============================================================================

CREATE TABLE IF NOT EXISTS bitacora_auditoria (
    id_bitacora      INT NOT NULL AUTO_INCREMENT,
    tabla_afectada   VARCHAR(64) NOT NULL,
    id_registro      VARCHAR(64) NOT NULL,
    accion           ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    datos_anteriores JSON NULL,
    datos_nuevos     JSON NULL,
    usuario_bd       VARCHAR(100) NOT NULL,
    fecha_hora       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_bitacora),
    KEY idx_bitacora_tabla_fecha (tabla_afectada, fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SECCIÓN 2: TRIGGERS DE AUDITORÍA EN `establecimiento`
-- ============================================================================

DROP TRIGGER IF EXISTS trg_establecimiento_after_insert;
DROP TRIGGER IF EXISTS trg_establecimiento_after_update;
DROP TRIGGER IF EXISTS trg_establecimiento_after_delete;

DELIMITER //

CREATE TRIGGER trg_establecimiento_after_insert
AFTER INSERT ON establecimiento
FOR EACH ROW
BEGIN
    INSERT INTO bitacora_auditoria (
        tabla_afectada,
        id_registro,
        accion,
        datos_anteriores,
        datos_nuevos,
        usuario_bd,
        fecha_hora
    ) VALUES (
        'establecimiento',
        CAST(NEW.id_establecimiento AS CHAR),
        'INSERT',
        NULL,
        JSON_OBJECT(
            'id_establecimiento', NEW.id_establecimiento,
            'clee',               NEW.clee,
            'nom_estab',          NEW.nom_estab,
            'raz_social',         NEW.raz_social,
            'codigo_act',         NEW.codigo_act,
            'per_ocu',            NEW.per_ocu,
            'telefono',           NEW.telefono,
            'correoelec',         NEW.correoelec,
            'www',                NEW.www,
            'tipoUniEco',         NEW.tipoUniEco,
            'fecha_alta',         NEW.fecha_alta
        ),
        USER(),
        NOW()
    );
END //

CREATE TRIGGER trg_establecimiento_after_update
AFTER UPDATE ON establecimiento
FOR EACH ROW
BEGIN
    INSERT INTO bitacora_auditoria (
        tabla_afectada,
        id_registro,
        accion,
        datos_anteriores,
        datos_nuevos,
        usuario_bd,
        fecha_hora
    ) VALUES (
        'establecimiento',
        CAST(NEW.id_establecimiento AS CHAR),
        'UPDATE',
        JSON_OBJECT(
            'id_establecimiento', OLD.id_establecimiento,
            'clee',               OLD.clee,
            'nom_estab',          OLD.nom_estab,
            'raz_social',         OLD.raz_social,
            'codigo_act',         OLD.codigo_act,
            'per_ocu',            OLD.per_ocu,
            'telefono',           OLD.telefono,
            'correoelec',         OLD.correoelec,
            'www',                OLD.www,
            'tipoUniEco',         OLD.tipoUniEco,
            'fecha_alta',         OLD.fecha_alta
        ),
        JSON_OBJECT(
            'id_establecimiento', NEW.id_establecimiento,
            'clee',               NEW.clee,
            'nom_estab',          NEW.nom_estab,
            'raz_social',         NEW.raz_social,
            'codigo_act',         NEW.codigo_act,
            'per_ocu',            NEW.per_ocu,
            'telefono',           NEW.telefono,
            'correoelec',         NEW.correoelec,
            'www',                NEW.www,
            'tipoUniEco',         NEW.tipoUniEco,
            'fecha_alta',         NEW.fecha_alta
        ),
        USER(),
        NOW()
    );
END //

CREATE TRIGGER trg_establecimiento_after_delete
AFTER DELETE ON establecimiento
FOR EACH ROW
BEGIN
    INSERT INTO bitacora_auditoria (
        tabla_afectada,
        id_registro,
        accion,
        datos_anteriores,
        datos_nuevos,
        usuario_bd,
        fecha_hora
    ) VALUES (
        'establecimiento',
        CAST(OLD.id_establecimiento AS CHAR),
        'DELETE',
        JSON_OBJECT(
            'id_establecimiento', OLD.id_establecimiento,
            'clee',               OLD.clee,
            'nom_estab',          OLD.nom_estab,
            'raz_social',         OLD.raz_social,
            'codigo_act',         OLD.codigo_act,
            'per_ocu',            OLD.per_ocu,
            'telefono',           OLD.telefono,
            'correoelec',         OLD.correoelec,
            'www',                OLD.www,
            'tipoUniEco',         OLD.tipoUniEco,
            'fecha_alta',         OLD.fecha_alta
        ),
        NULL,
        USER(),
        NOW()
    );
END //

DELIMITER ;


-- ============================================================================
-- SECCIÓN 3: VISTAS DE CONSULTA
-- ============================================================================

CREATE OR REPLACE VIEW vw_establecimientos_detalle AS
SELECT
    e.id_establecimiento,
    e.clee,
    e.nom_estab,
    e.raz_social,
    e.codigo_act,
    a.id_actividad,
    a.descripcion_actividad,
    e.per_ocu,
    e.telefono,
    e.correoelec,
    e.www,
    e.tipoUniEco,
    e.fecha_alta,
    d.id_direccion,
    d.numero_ext,
    d.numero_int,
    d.cod_postal,
    d.tipo_asent,
    COALESCE(d.nomb_asent, asent.nombre_asentamiento) AS nombre_asentamiento,
    asent.id_asentamiento,
    d.latitud,
    d.longitud,
    d.ageb,
    d.manzana,
    d.cve_loc,
    m.Clave_Municipio,
    m.Nombre_Municipio,
    ent.Clave_Entidad,
    ent.Nombre_Entidad
FROM establecimiento e
INNER JOIN direccion d
    ON e.id_establecimiento = d.id_establecimiento
INNER JOIN municipio m
    ON d.cve_mun = m.Clave_Municipio
   AND d.cve_ent = m.Clave_Entidad
INNER JOIN entidad ent
    ON d.cve_ent = ent.Clave_Entidad
LEFT JOIN actividad a
    ON a.id_actividad = CASE
        -- Registros cargados desde DENUE: codigo_act es un código SCIAN de 6 dígitos
        -- (mismo mapeo usado por las vistas vista_1..vista_5 del proyecto).
        WHEN CHAR_LENGTH(e.codigo_act) >= 6 THEN (CAST(e.codigo_act AS UNSIGNED) % 71) + 1
        -- Registros creados por los SP: codigo_act almacena directamente id_actividad.
        ELSE CAST(e.codigo_act AS UNSIGNED)
    END
LEFT JOIN asentamiento asent
    ON asent.id_asentamiento = d.id_direccion;


-- ============================================================================
-- SECCIÓN 4: STORED PROCEDURES TRANSACCIONALES POR MÓDULO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MÓDULO 1: Consulta territorial por rango usando BETWEEN
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_consultar_territorio_rango;

DELIMITER //

CREATE PROCEDURE sp_consultar_territorio_rango(
    IN p_clave_entidad  INT,
    IN p_cve_mun_inicio INT,
    IN p_cve_mun_fin    INT
)
BEGIN
    DECLARE v_inicio INT;
    DECLARE v_fin    INT;

    IF p_cve_mun_inicio IS NULL OR p_cve_mun_fin IS NULL THEN
        SELECT
            'ERROR' AS estatus,
            'Debe proporcionar el rango inicial y final de municipio.' AS mensaje;
    ELSE
        -- Normaliza el rango si se envió invertido
        SET v_inicio = LEAST(p_cve_mun_inicio, p_cve_mun_fin);
        SET v_fin    = GREATEST(p_cve_mun_inicio, p_cve_mun_fin);

        SELECT
            ent.Clave_Entidad,
            ent.Nombre_Entidad,
            m.Clave_Municipio,
            m.Nombre_Municipio,
            COUNT(DISTINCT l.Clave_Localidad) AS total_localidades
        FROM entidad ent
        INNER JOIN municipio m
            ON m.Clave_Entidad = ent.Clave_Entidad
        LEFT JOIN localidad l
            ON l.Clave_Municipio = m.Clave_Municipio
        WHERE (p_clave_entidad IS NULL OR ent.Clave_Entidad = p_clave_entidad)
          AND m.Clave_Municipio BETWEEN v_inicio AND v_fin
        GROUP BY
            ent.Clave_Entidad,
            ent.Nombre_Entidad,
            m.Clave_Municipio,
            m.Nombre_Municipio
        ORDER BY
            ent.Clave_Entidad ASC,
            m.Clave_Municipio ASC;
    END IF;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 2: Gestión (alta y consulta) de vialidades y asentamientos
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_gestionar_vialidad_asentamiento;

DELIMITER //

CREATE PROCEDURE sp_gestionar_vialidad_asentamiento(
    IN p_operacion     VARCHAR(25),
    IN p_id            INT,
    IN p_nombre        VARCHAR(150),
    IN p_codigo_postal VARCHAR(10),
    IN p_clave_entidad INT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') en sp_gestionar_vialidad_asentamiento: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    IF UPPER(TRIM(p_operacion)) = 'ALTA_VIALIDAD' THEN
        IF p_id IS NULL OR p_id <= 0 OR p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
            ROLLBACK;
            SELECT
                'ERROR' AS estatus,
                'Para ALTA_VIALIDAD se requieren id_tipo_vialidad válido y descripcion_vialidad.' AS mensaje;
            LEAVE proc_label;
        END IF;

        SELECT COUNT(*) INTO v_existe
        FROM tipo_de_vialidad
        WHERE id_tipo_vialidad = p_id;

        IF v_existe > 0 THEN
            ROLLBACK;
            SELECT
                'ERROR' AS estatus,
                CONCAT('El id_tipo_vialidad ', p_id, ' ya existe en tipo_de_vialidad.') AS mensaje;
            LEAVE proc_label;
        END IF;

        INSERT INTO tipo_de_vialidad (id_tipo_vialidad, descripcion_vialidad)
        VALUES (p_id, TRIM(p_nombre));

        COMMIT;
        SELECT
            'OK' AS estatus,
            CONCAT('Tipo de vialidad registrado correctamente (ID: ', p_id, ').') AS mensaje;

    ELSEIF UPPER(TRIM(p_operacion)) = 'ALTA_ASENTAMIENTO' THEN
        IF p_id IS NULL OR p_id <= 0 OR p_nombre IS NULL OR TRIM(p_nombre) = '' OR p_clave_entidad IS NULL THEN
            ROLLBACK;
            SELECT
                'ERROR' AS estatus,
                'Para ALTA_ASENTAMIENTO se requieren id_asentamiento, nombre_asentamiento y Clave_Entidad.' AS mensaje;
            LEAVE proc_label;
        END IF;

        SELECT COUNT(*) INTO v_existe
        FROM entidad
        WHERE Clave_Entidad = p_clave_entidad;

        IF v_existe = 0 THEN
            ROLLBACK;
            SELECT
                'ERROR' AS estatus,
                CONCAT('La entidad con Clave_Entidad ', p_clave_entidad, ' no existe.') AS mensaje;
            LEAVE proc_label;
        END IF;

        SELECT COUNT(*) INTO v_existe
        FROM asentamiento
        WHERE id_asentamiento = p_id;

        IF v_existe > 0 THEN
            ROLLBACK;
            SELECT
                'ERROR' AS estatus,
                CONCAT('El id_asentamiento ', p_id, ' ya existe en asentamiento.') AS mensaje;
            LEAVE proc_label;
        END IF;

        INSERT INTO asentamiento (id_asentamiento, nombre_asentamiento, codigo_postal, Clave_Entidad)
        VALUES (p_id, TRIM(p_nombre), p_codigo_postal, p_clave_entidad);

        COMMIT;
        SELECT
            'OK' AS estatus,
            CONCAT('Asentamiento registrado correctamente (ID: ', p_id, ').') AS mensaje;

    ELSEIF UPPER(TRIM(p_operacion)) = 'CONSULTAR_VIALIDADES' THEN
        COMMIT;
        SELECT
            id_tipo_vialidad,
            descripcion_vialidad
        FROM tipo_de_vialidad
        WHERE p_nombre IS NULL OR TRIM(p_nombre) = ''
           OR descripcion_vialidad LIKE CONCAT('%', TRIM(p_nombre), '%')
        ORDER BY id_tipo_vialidad ASC;

    ELSEIF UPPER(TRIM(p_operacion)) = 'CONSULTAR_ASENTAMIENTOS' THEN
        COMMIT;
        SELECT
            a.id_asentamiento,
            a.nombre_asentamiento,
            a.codigo_postal,
            a.Clave_Entidad,
            e.Nombre_Entidad,
            a.fecha_registro
        FROM asentamiento a
        INNER JOIN entidad e
            ON a.Clave_Entidad = e.Clave_Entidad
        WHERE (p_clave_entidad IS NULL OR a.Clave_Entidad = p_clave_entidad)
          AND (p_nombre IS NULL OR TRIM(p_nombre) = ''
               OR a.nombre_asentamiento LIKE CONCAT('%', TRIM(p_nombre), '%'))
        ORDER BY a.id_asentamiento ASC;

    ELSE
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            'Operación no válida. Use: ALTA_VIALIDAD, ALTA_ASENTAMIENTO, CONSULTAR_VIALIDADES o CONSULTAR_ASENTAMIENTOS.' AS mensaje;
    END IF;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 3: Alta segura en `actividad` (validación previa de duplicados)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_insertar_actividad_segura;

DELIMITER //

CREATE PROCEDURE sp_insertar_actividad_segura(
    IN p_id_actividad          INT,
    IN p_descripcion_actividad VARCHAR(150)
)
proc_label: BEGIN
    DECLARE v_existe_id   INT DEFAULT 0;
    DECLARE v_existe_desc INT DEFAULT 0;
    DECLARE v_errno       INT DEFAULT 0;
    DECLARE v_errmsg      TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al insertar actividad: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    IF p_id_actividad IS NULL OR p_id_actividad <= 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            'El código id_actividad debe ser un entero positivo.' AS mensaje;
        LEAVE proc_label;
    END IF;

    IF p_descripcion_actividad IS NULL OR TRIM(p_descripcion_actividad) = '' THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            'La descripción de la actividad no puede estar vacía.' AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe_id
    FROM actividad
    WHERE id_actividad = p_id_actividad;

    IF v_existe_id > 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Operación rechazada: el código de actividad ', p_id_actividad, ' ya existe.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe_desc
    FROM actividad
    WHERE UPPER(TRIM(descripcion_actividad)) = UPPER(TRIM(p_descripcion_actividad));

    IF v_existe_desc > 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            'Operación rechazada: ya existe una actividad con la misma descripción.' AS mensaje;
        LEAVE proc_label;
    END IF;

    INSERT INTO actividad (id_actividad, descripcion_actividad)
    VALUES (p_id_actividad, TRIM(p_descripcion_actividad));

    COMMIT;

    SELECT
        'OK' AS estatus,
        CONCAT('Actividad ', p_id_actividad, ' registrada correctamente.') AS mensaje;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 3: Actualización segura en `actividad`
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_actualizar_actividad;

DELIMITER //

CREATE PROCEDURE sp_actualizar_actividad(
    IN p_id_actividad      INT,
    IN p_nueva_descripcion VARCHAR(150)
)
proc_label: BEGIN
    DECLARE v_existe      INT DEFAULT 0;
    DECLARE v_existe_desc INT DEFAULT 0;
    DECLARE v_errno       INT DEFAULT 0;
    DECLARE v_errmsg      TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al actualizar actividad: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    IF p_id_actividad IS NULL OR p_nueva_descripcion IS NULL OR TRIM(p_nueva_descripcion) = '' THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            'Debe proporcionar un id_actividad válido y una descripción no vacía.' AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe
    FROM actividad
    WHERE id_actividad = p_id_actividad;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('No existe ninguna actividad con id_actividad = ', p_id_actividad, '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe_desc
    FROM actividad
    WHERE UPPER(TRIM(descripcion_actividad)) = UPPER(TRIM(p_nueva_descripcion))
      AND id_actividad <> p_id_actividad;

    IF v_existe_desc > 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            'Operación rechazada: ya existe otra actividad con esa descripción.' AS mensaje;
        LEAVE proc_label;
    END IF;

    UPDATE actividad
    SET descripcion_actividad = TRIM(p_nueva_descripcion)
    WHERE id_actividad = p_id_actividad;

    COMMIT;

    SELECT
        'OK' AS estatus,
        CONCAT('Actividad ', p_id_actividad, ' actualizada correctamente.') AS mensaje;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Alta transaccional completa (`establecimiento` + `direccion`)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_establecimiento_completo;

DELIMITER //

CREATE PROCEDURE sp_registrar_establecimiento_completo(
    IN p_id_establecimiento INT,
    IN p_clee               VARCHAR(50),
    IN p_nom_estab          TEXT,
    IN p_raz_social         TEXT,
    IN p_id_actividad       INT,
    IN p_per_ocu            VARCHAR(50),
    IN p_telefono           VARCHAR(50),
    IN p_correoelec         VARCHAR(100),
    IN p_www                VARCHAR(100),
    IN p_tipoUniEco         VARCHAR(50),
    IN p_fecha_alta         VARCHAR(50),
    IN p_id_direccion       INT,
    IN p_numero_ext         VARCHAR(50),
    IN p_cod_postal         VARCHAR(10),
    IN p_latitud            VARCHAR(50),
    IN p_longitud           VARCHAR(50),
    IN p_cve_ent            INT,
    IN p_cve_mun            INT,
    IN p_cve_loc            INT,
    IN p_id_asentamiento    INT,
    IN p_id_tipo_vialidad   INT,
    IN p_nombre_vialidad    TEXT
)
proc_label: BEGIN
    DECLARE v_existe        INT DEFAULT 0;
    DECLARE v_nomb_asent    VARCHAR(150) DEFAULT NULL;
    DECLARE v_desc_vialidad VARCHAR(100) DEFAULT NULL;
    DECLARE v_errno         INT DEFAULT 0;
    DECLARE v_errmsg        TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al registrar establecimiento y dirección; transacción revertida: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    -- 1. Validar llaves primarias no duplicadas
    IF p_id_establecimiento IS NULL OR p_id_direccion IS NULL THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            'Los identificadores id_establecimiento e id_direccion son obligatorios.' AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe
    FROM establecimiento
    WHERE id_establecimiento = p_id_establecimiento;

    IF v_existe > 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Ya existe un establecimiento con id_establecimiento = ', p_id_establecimiento, '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe
    FROM direccion
    WHERE id_direccion = p_id_direccion;

    IF v_existe > 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Ya existe una dirección con id_direccion = ', p_id_direccion, '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    -- 2. Validar existencia de llaves foráneas / catálogos referenciados
    SELECT COUNT(*) INTO v_existe
    FROM actividad
    WHERE id_actividad = p_id_actividad;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Registro abortado: no existe la actividad con id_actividad = ', IFNULL(p_id_actividad, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe
    FROM entidad
    WHERE Clave_Entidad = p_cve_ent;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Registro abortado: no existe la entidad con Clave_Entidad = ', IFNULL(p_cve_ent, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe
    FROM municipio
    WHERE Clave_Entidad = p_cve_ent
      AND Clave_Municipio = p_cve_mun;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Registro abortado: no existe el municipio ', IFNULL(p_cve_mun, 'NULL'), ' en la entidad ', p_cve_ent, '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*), MAX(nombre_asentamiento)
    INTO v_existe, v_nomb_asent
    FROM asentamiento
    WHERE id_asentamiento = p_id_asentamiento;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Registro abortado: no existe el asentamiento con id_asentamiento = ', IFNULL(p_id_asentamiento, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*), MAX(descripcion_vialidad)
    INTO v_existe, v_desc_vialidad
    FROM tipo_de_vialidad
    WHERE id_tipo_vialidad = p_id_tipo_vialidad;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Registro abortado: no existe el tipo de vialidad con id_tipo_vialidad = ', IFNULL(p_id_tipo_vialidad, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    -- 3. Insertar en establecimiento (dispara trg_establecimiento_after_insert)
    INSERT INTO establecimiento (
        id_establecimiento,
        clee,
        nom_estab,
        raz_social,
        codigo_act,
        per_ocu,
        telefono,
        correoelec,
        www,
        tipoUniEco,
        fecha_alta
    ) VALUES (
        p_id_establecimiento,
        p_clee,
        p_nom_estab,
        p_raz_social,
        CAST(p_id_actividad AS CHAR),
        p_per_ocu,
        p_telefono,
        p_correoelec,
        p_www,
        p_tipoUniEco,
        p_fecha_alta
    );

    -- 4. Insertar en direccion
    INSERT INTO direccion (
        id_direccion,
        id_establecimiento,
        numero_ext,
        nomb_asent,
        cod_postal,
        latitud,
        longitud,
        cve_ent,
        cve_mun,
        cve_loc
    ) VALUES (
        p_id_direccion,
        p_id_establecimiento,
        p_numero_ext,
        v_nomb_asent,
        p_cod_postal,
        p_latitud,
        p_longitud,
        p_cve_ent,
        p_cve_mun,
        p_cve_loc
    );

    -- 5. Registrar vialidad asociada si se proporcionó nombre de vialidad
    IF p_nombre_vialidad IS NOT NULL AND TRIM(p_nombre_vialidad) <> '' THEN
        INSERT INTO detalle_vialidad (
            id_direccion,
            tipo_vialidad,
            nombre_vialidad
        ) VALUES (
            p_id_direccion,
            v_desc_vialidad,
            TRIM(p_nombre_vialidad)
        );
    END IF;

    COMMIT;

    SELECT
        'OK' AS estatus,
        CONCAT('Establecimiento ', p_id_establecimiento, ' y dirección ', p_id_direccion, ' registrados correctamente.') AS mensaje;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Actualización controlada en `establecimiento` y `direccion`
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_actualizar_establecimiento;

DELIMITER //

CREATE PROCEDURE sp_actualizar_establecimiento(
    IN p_id_establecimiento INT,
    IN p_nom_estab          TEXT,
    IN p_raz_social         TEXT,
    IN p_id_actividad       INT,
    IN p_per_ocu            VARCHAR(50),
    IN p_telefono           VARCHAR(50),
    IN p_correoelec         VARCHAR(100),
    IN p_www                VARCHAR(100),
    IN p_numero_ext         VARCHAR(50),
    IN p_cod_postal         VARCHAR(10),
    IN p_cve_ent            INT,
    IN p_cve_mun            INT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al actualizar establecimiento: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_existe
    FROM establecimiento
    WHERE id_establecimiento = p_id_establecimiento;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('No existe el establecimiento con id_establecimiento = ', IFNULL(p_id_establecimiento, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    IF p_id_actividad IS NOT NULL THEN
        SELECT COUNT(*) INTO v_existe
        FROM actividad
        WHERE id_actividad = p_id_actividad;

        IF v_existe = 0 THEN
            ROLLBACK;
            SELECT
                'ERROR' AS estatus,
                CONCAT('Actualización abortada: no existe la actividad con id_actividad = ', p_id_actividad, '.') AS mensaje;
            LEAVE proc_label;
        END IF;
    END IF;

    IF p_cve_ent IS NOT NULL AND p_cve_mun IS NOT NULL THEN
        SELECT COUNT(*) INTO v_existe
        FROM municipio
        WHERE Clave_Entidad = p_cve_ent
          AND Clave_Municipio = p_cve_mun;

        IF v_existe = 0 THEN
            ROLLBACK;
            SELECT
                'ERROR' AS estatus,
                CONCAT('Actualización abortada: no existe el municipio ', p_cve_mun, ' en la entidad ', p_cve_ent, '.') AS mensaje;
            LEAVE proc_label;
        END IF;
    END IF;

    -- Actualiza establecimiento (dispara trg_establecimiento_after_update)
    UPDATE establecimiento
    SET
        nom_estab  = COALESCE(p_nom_estab, nom_estab),
        raz_social = COALESCE(p_raz_social, raz_social),
        codigo_act = COALESCE(CAST(p_id_actividad AS CHAR), codigo_act),
        per_ocu    = COALESCE(p_per_ocu, per_ocu),
        telefono   = COALESCE(p_telefono, telefono),
        correoelec = COALESCE(p_correoelec, correoelec),
        www        = COALESCE(p_www, www)
    WHERE id_establecimiento = p_id_establecimiento;

    -- Actualiza direccion asociada
    UPDATE direccion
    SET
        numero_ext = COALESCE(p_numero_ext, numero_ext),
        cod_postal = COALESCE(p_cod_postal, cod_postal),
        cve_ent    = COALESCE(p_cve_ent, cve_ent),
        cve_mun    = COALESCE(p_cve_mun, cve_mun)
    WHERE id_establecimiento = p_id_establecimiento;

    COMMIT;

    SELECT
        'OK' AS estatus,
        CONCAT('Establecimiento ', p_id_establecimiento, ' y su dirección actualizados correctamente.') AS mensaje;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Baja controlada en `establecimiento` y `direccion`
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_eliminar_establecimiento;

DELIMITER //

CREATE PROCEDURE sp_eliminar_establecimiento(
    IN p_id_establecimiento INT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al eliminar establecimiento: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_existe
    FROM establecimiento
    WHERE id_establecimiento = p_id_establecimiento;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('No existe el establecimiento con id_establecimiento = ', IFNULL(p_id_establecimiento, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    -- 1. Eliminar detalles de vialidad asociados a las direcciones del establecimiento
    DELETE FROM detalle_vialidad
    WHERE id_direccion IN (
        SELECT id_direccion
        FROM direccion
        WHERE id_establecimiento = p_id_establecimiento
    );

    -- 2. Eliminar direcciones del establecimiento
    DELETE FROM direccion
    WHERE id_establecimiento = p_id_establecimiento;

    -- 3. Eliminar establecimiento (dispara trg_establecimiento_after_delete)
    DELETE FROM establecimiento
    WHERE id_establecimiento = p_id_establecimiento;

    COMMIT;

    SELECT
        'OK' AS estatus,
        CONCAT('Establecimiento ', p_id_establecimiento, ' y sus registros dependientes eliminados correctamente.') AS mensaje;
END //

DELIMITER ;


-- ============================================================================
-- SECCIÓN 5: STORED PROCEDURES COMPLEMENTARIOS (MÓDULO 4)
--   CRUD de `direccion` y `detalle_vialidad` sin DML directo desde Python.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MÓDULO 4: Alta de una dirección adicional para un establecimiento existente
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_agregar_direccion;

DELIMITER //

CREATE PROCEDURE sp_agregar_direccion(
    IN p_id_direccion       INT,
    IN p_id_establecimiento INT,
    IN p_numero_ext         VARCHAR(50),
    IN p_numero_int         VARCHAR(50),
    IN p_cod_postal         VARCHAR(10),
    IN p_tipo_asent         VARCHAR(50),
    IN p_nomb_asent         TEXT,
    IN p_latitud            VARCHAR(50),
    IN p_longitud           VARCHAR(50),
    IN p_ageb               VARCHAR(20),
    IN p_manzana            VARCHAR(20),
    IN p_cve_ent            INT,
    IN p_cve_mun            INT,
    IN p_cve_loc            INT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al agregar dirección: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    IF p_id_direccion IS NULL OR p_id_direccion <= 0 OR p_id_establecimiento IS NULL THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               'Se requieren id_direccion (positivo) e id_establecimiento.' AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe FROM establecimiento
    WHERE id_establecimiento = p_id_establecimiento;
    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe el establecimiento con id_establecimiento = ', p_id_establecimiento, '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe FROM direccion WHERE id_direccion = p_id_direccion;
    IF v_existe > 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('Ya existe una dirección con id_direccion = ', p_id_direccion, '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe FROM municipio
    WHERE Clave_Entidad = p_cve_ent AND Clave_Municipio = p_cve_mun;
    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe el municipio ', IFNULL(p_cve_mun, 'NULL'), ' en la entidad ', IFNULL(p_cve_ent, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    INSERT INTO direccion (
        id_direccion, id_establecimiento, numero_ext, numero_int, cod_postal,
        tipo_asent, nomb_asent, latitud, longitud, ageb, manzana,
        cve_ent, cve_mun, cve_loc
    ) VALUES (
        p_id_direccion, p_id_establecimiento, p_numero_ext, p_numero_int, p_cod_postal,
        p_tipo_asent, p_nomb_asent, p_latitud, p_longitud, p_ageb, p_manzana,
        p_cve_ent, p_cve_mun, p_cve_loc
    );

    COMMIT;

    SELECT 'OK' AS estatus,
           CONCAT('Dirección ', p_id_direccion, ' registrada para el establecimiento ', p_id_establecimiento, '.') AS mensaje,
           p_id_direccion AS id_direccion;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Actualización de una dirección (los parámetros NULL no se modifican)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_actualizar_direccion;

DELIMITER //

CREATE PROCEDURE sp_actualizar_direccion(
    IN p_id_direccion INT,
    IN p_numero_ext   VARCHAR(50),
    IN p_numero_int   VARCHAR(50),
    IN p_cod_postal   VARCHAR(10),
    IN p_tipo_asent   VARCHAR(50),
    IN p_nomb_asent   TEXT,
    IN p_latitud      VARCHAR(50),
    IN p_longitud     VARCHAR(50),
    IN p_ageb         VARCHAR(20),
    IN p_manzana      VARCHAR(20),
    IN p_cve_ent      INT,
    IN p_cve_mun      INT,
    IN p_cve_loc      INT
)
proc_label: BEGIN
    DECLARE v_existe  INT DEFAULT 0;
    DECLARE v_ent     INT DEFAULT NULL;
    DECLARE v_mun     INT DEFAULT NULL;
    DECLARE v_errno   INT DEFAULT 0;
    DECLARE v_errmsg  TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al actualizar dirección: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    SELECT COUNT(*), MAX(cve_ent), MAX(cve_mun)
    INTO v_existe, v_ent, v_mun
    FROM direccion
    WHERE id_direccion = p_id_direccion;

    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe la dirección con id_direccion = ', IFNULL(p_id_direccion, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    -- Valida el par entidad/municipio resultante (considerando valores actuales)
    IF p_cve_ent IS NOT NULL OR p_cve_mun IS NOT NULL THEN
        SELECT COUNT(*) INTO v_existe FROM municipio
        WHERE Clave_Entidad = COALESCE(p_cve_ent, v_ent)
          AND Clave_Municipio = COALESCE(p_cve_mun, v_mun);
        IF v_existe = 0 THEN
            ROLLBACK;
            SELECT 'ERROR' AS estatus,
                   CONCAT('No existe el municipio ', IFNULL(COALESCE(p_cve_mun, v_mun), 'NULL'),
                          ' en la entidad ', IFNULL(COALESCE(p_cve_ent, v_ent), 'NULL'), '.') AS mensaje;
            LEAVE proc_label;
        END IF;
    END IF;

    UPDATE direccion
    SET
        numero_ext = COALESCE(p_numero_ext, numero_ext),
        numero_int = COALESCE(p_numero_int, numero_int),
        cod_postal = COALESCE(p_cod_postal, cod_postal),
        tipo_asent = COALESCE(p_tipo_asent, tipo_asent),
        nomb_asent = COALESCE(p_nomb_asent, nomb_asent),
        latitud    = COALESCE(p_latitud, latitud),
        longitud   = COALESCE(p_longitud, longitud),
        ageb       = COALESCE(p_ageb, ageb),
        manzana    = COALESCE(p_manzana, manzana),
        cve_ent    = COALESCE(p_cve_ent, cve_ent),
        cve_mun    = COALESCE(p_cve_mun, cve_mun),
        cve_loc    = COALESCE(p_cve_loc, cve_loc)
    WHERE id_direccion = p_id_direccion;

    COMMIT;

    SELECT 'OK' AS estatus,
           CONCAT('Dirección ', p_id_direccion, ' actualizada correctamente.') AS mensaje;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Baja de una dirección y sus detalles de vialidad
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_eliminar_direccion;

DELIMITER //

CREATE PROCEDURE sp_eliminar_direccion(
    IN p_id_direccion INT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al eliminar dirección: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_existe FROM direccion WHERE id_direccion = p_id_direccion;
    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe la dirección con id_direccion = ', IFNULL(p_id_direccion, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    DELETE FROM detalle_vialidad WHERE id_direccion = p_id_direccion;
    DELETE FROM direccion        WHERE id_direccion = p_id_direccion;

    COMMIT;

    SELECT 'OK' AS estatus,
           CONCAT('Dirección ', p_id_direccion, ' y sus vialidades eliminadas correctamente.') AS mensaje;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Alta de detalle de vialidad (máximo 4 por dirección, como en las vistas)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_agregar_detalle_vialidad;

DELIMITER //

CREATE PROCEDURE sp_agregar_detalle_vialidad(
    IN p_id_direccion     INT,
    IN p_id_tipo_vialidad INT,
    IN p_nombre_vialidad  TEXT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_desc   VARCHAR(100) DEFAULT NULL;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al agregar detalle de vialidad: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    IF p_nombre_vialidad IS NULL OR TRIM(p_nombre_vialidad) = '' THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus, 'El nombre de la vialidad no puede estar vacío.' AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe FROM direccion WHERE id_direccion = p_id_direccion;
    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe la dirección con id_direccion = ', IFNULL(p_id_direccion, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*), MAX(descripcion_vialidad) INTO v_existe, v_desc
    FROM tipo_de_vialidad WHERE id_tipo_vialidad = p_id_tipo_vialidad;
    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe el tipo de vialidad con id_tipo_vialidad = ', IFNULL(p_id_tipo_vialidad, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    SELECT COUNT(*) INTO v_existe FROM detalle_vialidad WHERE id_direccion = p_id_direccion;
    IF v_existe >= 4 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               'Operación rechazada: una dirección admite como máximo 4 vialidades.' AS mensaje;
        LEAVE proc_label;
    END IF;

    INSERT INTO detalle_vialidad (id_direccion, tipo_vialidad, nombre_vialidad)
    VALUES (p_id_direccion, v_desc, TRIM(p_nombre_vialidad));

    SELECT LAST_INSERT_ID() INTO v_existe;

    COMMIT;

    SELECT 'OK' AS estatus,
           CONCAT('Detalle de vialidad ', v_existe, ' registrado correctamente.') AS mensaje,
           v_existe AS id_detalle;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Actualización de detalle de vialidad (parámetros NULL no se modifican)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_actualizar_detalle_vialidad;

DELIMITER //

CREATE PROCEDURE sp_actualizar_detalle_vialidad(
    IN p_id_detalle       INT,
    IN p_id_tipo_vialidad INT,
    IN p_nombre_vialidad  TEXT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_desc   VARCHAR(100) DEFAULT NULL;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al actualizar detalle de vialidad: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_existe FROM detalle_vialidad WHERE id_detalle = p_id_detalle;
    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe el detalle de vialidad con id_detalle = ', IFNULL(p_id_detalle, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    IF p_id_tipo_vialidad IS NOT NULL THEN
        SELECT COUNT(*), MAX(descripcion_vialidad) INTO v_existe, v_desc
        FROM tipo_de_vialidad WHERE id_tipo_vialidad = p_id_tipo_vialidad;
        IF v_existe = 0 THEN
            ROLLBACK;
            SELECT 'ERROR' AS estatus,
                   CONCAT('No existe el tipo de vialidad con id_tipo_vialidad = ', p_id_tipo_vialidad, '.') AS mensaje;
            LEAVE proc_label;
        END IF;
    END IF;

    IF p_nombre_vialidad IS NOT NULL AND TRIM(p_nombre_vialidad) = '' THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus, 'El nombre de la vialidad no puede estar vacío.' AS mensaje;
        LEAVE proc_label;
    END IF;

    UPDATE detalle_vialidad
    SET
        tipo_vialidad   = COALESCE(v_desc, tipo_vialidad),
        nombre_vialidad = COALESCE(TRIM(p_nombre_vialidad), nombre_vialidad)
    WHERE id_detalle = p_id_detalle;

    COMMIT;

    SELECT 'OK' AS estatus,
           CONCAT('Detalle de vialidad ', p_id_detalle, ' actualizado correctamente.') AS mensaje;
END //

DELIMITER ;


-- ----------------------------------------------------------------------------
-- MÓDULO 4: Baja de detalle de vialidad
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_eliminar_detalle_vialidad;

DELIMITER //

CREATE PROCEDURE sp_eliminar_detalle_vialidad(
    IN p_id_detalle INT
)
proc_label: BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_errno  INT DEFAULT 0;
    DECLARE v_errmsg TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_errno = MYSQL_ERRNO,
            v_errmsg = MESSAGE_TEXT;
        ROLLBACK;
        SELECT
            'ERROR' AS estatus,
            CONCAT('Error SQL (', v_errno, ') al eliminar detalle de vialidad: ', v_errmsg) AS mensaje;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_existe FROM detalle_vialidad WHERE id_detalle = p_id_detalle;
    IF v_existe = 0 THEN
        ROLLBACK;
        SELECT 'ERROR' AS estatus,
               CONCAT('No existe el detalle de vialidad con id_detalle = ', IFNULL(p_id_detalle, 'NULL'), '.') AS mensaje;
        LEAVE proc_label;
    END IF;

    DELETE FROM detalle_vialidad WHERE id_detalle = p_id_detalle;

    COMMIT;

    SELECT 'OK' AS estatus,
           CONCAT('Detalle de vialidad ', p_id_detalle, ' eliminado correctamente.') AS mensaje;
END //

DELIMITER ;