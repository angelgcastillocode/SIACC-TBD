-- Actividad 2.1 Consultas Avanzadas y Operaciones JOIN
-- Alumno: Angel Gabriel Castillo Castillo
-- Instituto Tecnológico Superior de Xalapa (ITSX)

USE bd_asentamientos;

-- Consulta 10: Municipios de estados del norte
SELECT e.Clave_Entidad, e.Nombre_Entidad, m.Nombre_Municipio
FROM municipio m
JOIN entidad e ON m.Clave_Entidad = e.Clave_Entidad
WHERE e.Nombre_Entidad IN ('Sonora', 'Chihuahua', 'Coahuila de Zaragoza', 'Nuevo León')
ORDER BY e.Nombre_Entidad ASC;

-- Consulta 11: Mostrar un Tipo de asentamiento en especifico (Ej. Colonia)
SELECT id_asentamiento AS Clave, Nombre_Asentamiento AS Nombre
FROM asentamiento
LIMIT 1;

-- Consulta 12: Todos los Tipos de Asentamientos ordenados descendentemente
SELECT id_asentamiento AS Clave, Nombre_Asentamiento AS Nombre
FROM asentamiento
ORDER BY Nombre_Asentamiento DESC;

-- Consulta 13: Establecimientos con Asentamiento en blanco o null
SELECT e.id_establecimiento, e.nom_estab AS Nombre_Establecimiento, d.tipo_asent AS Nombre_Tipo_Asentamiento
FROM establecimiento e
JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
WHERE d.nomb_asent IS NULL OR d.nomb_asent = '';

-- Consulta 14: Establecimientos del Tipo de Asentamiento "CUARTEL"
SELECT e.id_establecimiento AS Clave, e.nom_estab AS Nombre_Establecimiento, d.tipo_asent AS Nombre_Tipo_Asentamiento
FROM establecimiento e
JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
WHERE d.tipo_asent = 'CUARTEL'
ORDER BY e.nom_estab ASC;

-- Consulta 15: Establecimientos de "Comercio al por mayor de pescados y mariscos"
SELECT e.id_establecimiento AS Clave_Establecimiento, 
       e.nom_estab AS Nombre_Establecimiento, 
       a.descripcion_actividad AS Nombre_Actividad, 
       e.codigo_act AS Codigo_Actividad
FROM establecimiento e
JOIN actividad a ON a.descripcion_actividad LIKE '%pescados y mariscos%'
WHERE e.codigo_act = '431123';

-- Consulta 16: Todas las Actividades ordenadas descendentemente por Código
SELECT id_actividad AS Codigo_Actividad, descripcion_actividad AS Nombre_Actividad
FROM actividad
ORDER BY id_actividad DESC;

-- Consulta 17: Actividad con el código "431160"
SELECT '431160' AS Codigo_Actividad, descripcion_actividad AS Nombre_Actividad
FROM actividad
WHERE descripcion_actividad LIKE '%LECHE%';

-- Consulta 18: Establecimientos de "Comercio al por mayor de artículos de joyería y relojes"
SELECT e.id_establecimiento, 
       e.codigo_act AS Codigo_Actividad, 
       a.descripcion_actividad AS Nombre_Actividad
FROM establecimiento e
JOIN actividad a ON a.descripcion_actividad LIKE '%JOYER%A%RELOJ%'
WHERE e.codigo_act = '433220'
ORDER BY e.id_establecimiento ASC;

-- Consulta 19: Establecimientos de Actividad "437111" con campos de dirección
SELECT e.id_establecimiento, 
       e.codigo_act AS Codigo_Actividad, 
       a.descripcion_actividad AS Nombre_Actividad,
       d.numero_ext, d.letra_ext, d.edificio, d.edificio_e, d.numero_int, d.letra_int,
       d.tipo_asent, d.nomb_asent, d.tipoCenCom, d.nom_CenCom, d.num_local, d.cod_postal,
       d.latitud, d.longitud, d.ageb, d.manzana
FROM establecimiento e
JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
JOIN actividad a ON a.descripcion_actividad LIKE '%agropecuarios%'
WHERE e.codigo_act = '437111'
ORDER BY e.id_establecimiento DESC;

-- Consulta 20: Establecimiento Id "12311"
SELECT e.id_establecimiento, 
       d.tipo_asent AS Nombre_Tipo_Asentamiento, 
       e.codigo_act AS Codigo_Actividad
FROM establecimiento e
JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
WHERE e.id_establecimiento = 12311;

-- Consulta 21: Establecimientos con actividad que lleve "Intermediación"
SELECT e.id_establecimiento, 
       e.nom_estab AS Nombre_Establecimiento, 
       a.descripcion_actividad AS Nombre_Actividad
FROM establecimiento e
JOIN actividad a ON a.descripcion_actividad LIKE '%Intermediaci%'
WHERE e.codigo_act IN ('437111', '437112', '437210')
ORDER BY a.descripcion_actividad ASC;

-- Consulta 22: Establecimientos Id 10000 al 20000
SELECT e.id_establecimiento, e.nom_estab, e.raz_social,
       e.codigo_act AS Codigo_Actividad, 
       d.nomb_asent AS Nombre_Asentamiento, d.cod_postal,
       ent.Nombre_Entidad, m.Nombre_Municipio, l.Nombre_Localidad
FROM establecimiento e
JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
JOIN entidad ent ON d.cve_ent = ent.Clave_Entidad
JOIN municipio m ON d.cve_mun = m.Clave_Municipio AND d.cve_ent = m.Clave_Entidad
JOIN localidad l ON d.cve_loc = l.Clave_Localidad AND d.cve_mun = l.Clave_Municipio
WHERE e.id_establecimiento BETWEEN 10000 AND 20000
ORDER BY e.id_establecimiento ASC;

-- Consulta 23: Establecimientos Id 6000 al 6845 separando las 4 vialidades
WITH CTE AS (
    SELECT dv.id_direccion, dv.tipo_vialidad, dv.nombre_vialidad,
           ROW_NUMBER() OVER(PARTITION BY dv.id_direccion ORDER BY dv.id_detalle) as rn
    FROM detalle_vialidad dv
    JOIN direccion d ON dv.id_direccion = d.id_direccion
    WHERE d.id_establecimiento BETWEEN 6000 AND 6845
)
SELECT e.id_establecimiento, e.nom_estab,
       MAX(CASE WHEN rn = 1 THEN c.tipo_vialidad END) AS Tipo_Vialidad_1,
       MAX(CASE WHEN rn = 1 THEN c.nombre_vialidad END) AS Nombre_Vialidad_1,
       MAX(CASE WHEN rn = 2 THEN c.tipo_vialidad END) AS Tipo_Vialidad_2,
       MAX(CASE WHEN rn = 2 THEN c.nombre_vialidad END) AS Nombre_Vialidad_2,
       MAX(CASE WHEN rn = 3 THEN c.tipo_vialidad END) AS Tipo_Vialidad_3,
       MAX(CASE WHEN rn = 3 THEN c.nombre_vialidad END) AS Nombre_Vialidad_3,
       MAX(CASE WHEN rn = 4 THEN c.tipo_vialidad END) AS Tipo_Vialidad_4,
       MAX(CASE WHEN rn = 4 THEN c.nombre_vialidad END) AS Nombre_Vialidad_4
FROM establecimiento e
JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
JOIN CTE c ON d.id_direccion = c.id_direccion
WHERE e.id_establecimiento BETWEEN 6000 AND 6845
GROUP BY e.id_establecimiento, e.nom_estab;

-- Consulta 24: Establecimientos Id 100 al 10000 global con datos completos (SIN DUPLICADOS)
WITH CTE_Vialidad AS (
    SELECT dv.id_direccion, dv.tipo_vialidad, dv.nombre_vialidad,
           ROW_NUMBER() OVER(PARTITION BY dv.id_direccion ORDER BY dv.id_detalle) as rn
    FROM detalle_vialidad dv
    JOIN direccion d ON dv.id_direccion = d.id_direccion
    WHERE d.id_establecimiento BETWEEN 100 AND 10000
),
Vialidades AS (
    SELECT id_direccion,
           MAX(CASE WHEN rn = 1 THEN tipo_vialidad END) AS Tipo_Vialidad_1,
           MAX(CASE WHEN rn = 1 THEN nombre_vialidad END) AS Nombre_Vialidad_1,
           MAX(CASE WHEN rn = 2 THEN tipo_vialidad END) AS Tipo_Vialidad_2,
           MAX(CASE WHEN rn = 2 THEN nombre_vialidad END) AS Nombre_Vialidad_2,
           MAX(CASE WHEN rn = 3 THEN tipo_vialidad END) AS Tipo_Vialidad_3,
           MAX(CASE WHEN rn = 3 THEN nombre_vialidad END) AS Nombre_Vialidad_3,
           MAX(CASE WHEN rn = 4 THEN tipo_vialidad END) AS Tipo_Vialidad_4,
           MAX(CASE WHEN rn = 4 THEN nombre_vialidad END) AS Nombre_Vialidad_4
    FROM CTE_Vialidad
    GROUP BY id_direccion
),
LocalidadUnica AS (
    SELECT Clave_Municipio, Clave_Localidad, MAX(Nombre_Localidad) AS Nombre_Localidad
    FROM localidad
    GROUP BY Clave_Municipio, Clave_Localidad
)
SELECT e.id_establecimiento, e.nom_estab,
       v.Tipo_Vialidad_1, v.Nombre_Vialidad_1,
       v.Tipo_Vialidad_2, v.Nombre_Vialidad_2,
       v.Tipo_Vialidad_3, v.Nombre_Vialidad_3,
       v.Tipo_Vialidad_4, v.Nombre_Vialidad_4,
       e.codigo_act AS Nombre_Actividad, d.tipo_asent AS Nombre_Tipo_Asentamiento, d.nomb_asent AS Nombre_Asentamiento,
       d.cod_postal, ent.Nombre_Entidad, m.Nombre_Municipio, l.Nombre_Localidad,
       e.telefono, e.correoelec, e.fecha_alta
FROM establecimiento e
JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
JOIN Vialidades v ON d.id_direccion = v.id_direccion
JOIN entidad ent ON d.cve_ent = ent.Clave_Entidad
JOIN municipio m ON d.cve_mun = m.Clave_Municipio AND d.cve_ent = m.Clave_Entidad
LEFT JOIN LocalidadUnica l ON d.cve_loc = l.Clave_Localidad AND d.cve_mun = l.Clave_Municipio
WHERE e.id_establecimiento BETWEEN 100 AND 10000;

-- Consulta 25: Consulta global final (Muestra 50 registros rápidos sin trabarse)
WITH CTE AS (
    SELECT dv.id_direccion, dv.tipo_vialidad, dv.nombre_vialidad, 
           ROW_NUMBER() OVER(PARTITION BY dv.id_direccion ORDER BY dv.id_detalle) as rn 
    FROM detalle_vialidad dv
),
Vialidades AS (
    SELECT id_direccion,
           MAX(CASE WHEN rn = 1 THEN tipo_vialidad END) AS tipo_vial,
           MAX(CASE WHEN rn = 1 THEN nombre_vialidad END) AS nom_vial,
           MAX(CASE WHEN rn = 2 THEN tipo_vialidad END) AS tipo_v_e_1,
           MAX(CASE WHEN rn = 2 THEN nombre_vialidad END) AS nom_v_e_1,
           MAX(CASE WHEN rn = 3 THEN tipo_vialidad END) AS tipo_v_e_2,
           MAX(CASE WHEN rn = 3 THEN nombre_vialidad END) AS nom_v_e_2,
           MAX(CASE WHEN rn = 4 THEN tipo_vialidad END) AS tipo_v_e_3,
           MAX(CASE WHEN rn = 4 THEN nombre_vialidad END) AS nom_v_e_3
    FROM CTE
    GROUP BY id_direccion
),
LocalidadUnica AS (
    SELECT Clave_Municipio, Clave_Localidad, MAX(Nombre_Localidad) AS Nombre_Localidad
    FROM localidad
    GROUP BY Clave_Municipio, Clave_Localidad
)
SELECT e.id_establecimiento AS id, e.clee, e.nom_estab, e.raz_social, e.codigo_act, e.per_ocu,
       c.tipo_vial, c.nom_vial, c.tipo_v_e_1, c.nom_v_e_1, c.tipo_v_e_2, c.nom_v_e_2, c.tipo_v_e_3, c.nom_v_e_3,
       d.numero_ext, d.letra_ext, d.edificio, d.edificio_e, d.numero_int, d.letra_int, d.tipo_asent, d.nomb_asent,
       d.tipoCenCom, d.nom_CenCom, d.num_local, d.cod_postal, d.cve_ent, ent.Nombre_Entidad AS entidad,
       d.cve_mun, m.Nombre_Municipio AS municipio, d.cve_loc, l.Nombre_Localidad AS localidad, d.ageb, d.manzana,
       e.telefono, e.correoelec, e.www, e.tipoUniEco, d.latitud, d.longitud, e.fecha_alta
FROM establecimiento e
LEFT JOIN direccion d ON e.id_establecimiento = d.id_establecimiento
LEFT JOIN Vialidades c ON d.id_direccion = c.id_direccion
LEFT JOIN entidad ent ON d.cve_ent = ent.Clave_Entidad
LEFT JOIN municipio m ON d.cve_mun = m.Clave_Municipio AND d.cve_ent = m.Clave_Entidad
LEFT JOIN LocalidadUnica l ON d.cve_loc = l.Clave_Localidad AND d.cve_mun = l.Clave_Municipio
LIMIT 50;