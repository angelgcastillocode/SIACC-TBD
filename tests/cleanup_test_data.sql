-- Limpieza de los datos de prueba creados por tests/smoke_test.py
-- (los mÃ³dulos 2 y 3 no exponen SP de baja, por eso se limpian aquÃ­, fuera del backend).
-- Uso: mysql -u root -p bd_asentamientos < tests/cleanup_test_data.sql
USE bd_asentamientos;

CALL sp_eliminar_establecimiento(99999101);   -- por si una corrida previa falló a medias
CALL sp_eliminar_establecimiento(99999201);   -- tests/roles_test.py   -- por si una corrida previa fallÃ³ a medias
DELETE FROM detalle_vialidad WHERE id_direccion IN (99999102, 99999104);
DELETE FROM direccion        WHERE id_direccion IN (99999102, 99999104);
DELETE FROM actividad        WHERE id_actividad IN (99999, 99998, 99997);
DELETE FROM asentamiento     WHERE id_asentamiento = 99999103;
DELETE FROM tipo_de_vialidad WHERE id_tipo_vialidad = 99999;
