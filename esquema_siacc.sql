-- MySQL dump 10.13  Distrib 26.10.0-er, for Win64 (x86_64)
--
-- Host: localhost    Database: bd_asentamientos
-- ------------------------------------------------------
-- Server version	26.10.0-er

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `actividad`
--

DROP TABLE IF EXISTS `actividad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actividad` (
  `id_actividad` int NOT NULL,
  `descripcion_actividad` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_actividad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asentamiento`
--

DROP TABLE IF EXISTS `asentamiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asentamiento` (
  `id_asentamiento` int NOT NULL,
  `nombre_asentamiento` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_postal` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Clave_Entidad` int NOT NULL,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_asentamiento`),
  KEY `fk_asentamiento_entidad` (`Clave_Entidad`),
  CONSTRAINT `fk_asentamiento_entidad` FOREIGN KEY (`Clave_Entidad`) REFERENCES `entidad` (`Clave_Entidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_vialidad`
--

DROP TABLE IF EXISTS `detalle_vialidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_vialidad` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_direccion` int DEFAULT NULL,
  `tipo_vialidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_vialidad` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_detalle`)
) ENGINE=InnoDB AUTO_INCREMENT=758435 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `direccion`
--

DROP TABLE IF EXISTS `direccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `direccion` (
  `id_direccion` int NOT NULL,
  `id_establecimiento` int DEFAULT NULL,
  `numero_ext` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `letra_ext` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edificio` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edificio_e` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_int` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `letra_int` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_asent` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nomb_asent` text COLLATE utf8mb4_unicode_ci,
  `tipoCenCom` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom_CenCom` text COLLATE utf8mb4_unicode_ci,
  `num_local` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cod_postal` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitud` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `longitud` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ageb` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manzana` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cve_ent` int DEFAULT NULL,
  `cve_mun` int DEFAULT NULL,
  `cve_loc` int DEFAULT NULL,
  PRIMARY KEY (`id_direccion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `entidad`
--

DROP TABLE IF EXISTS `entidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entidad` (
  `Clave_Entidad` int NOT NULL,
  `Nombre_Entidad` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`Clave_Entidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `establecimiento`
--

DROP TABLE IF EXISTS `establecimiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `establecimiento` (
  `id_establecimiento` int NOT NULL,
  `clee` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom_estab` text COLLATE utf8mb4_unicode_ci,
  `raz_social` text COLLATE utf8mb4_unicode_ci,
  `codigo_act` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `per_ocu` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correoelec` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `www` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipoUniEco` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_alta` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_establecimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `localidad`
--

DROP TABLE IF EXISTS `localidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `localidad` (
  `Clave_Localidad` int NOT NULL,
  `Nombre_Localidad` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Clave_Municipio` int NOT NULL,
  PRIMARY KEY (`Clave_Municipio`,`Clave_Localidad`,`Nombre_Localidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `municipio`
--

DROP TABLE IF EXISTS `municipio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `municipio` (
  `Clave_Municipio` int NOT NULL,
  `Nombre_Municipio` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Clave_Entidad` int NOT NULL,
  PRIMARY KEY (`Clave_Entidad`,`Clave_Municipio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipo_de_vialidad`
--

DROP TABLE IF EXISTS `tipo_de_vialidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipo_de_vialidad` (
  `id_tipo_vialidad` int NOT NULL,
  `descripcion_vialidad` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_vialidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vista_1_directorio_veracruz`
--

DROP TABLE IF EXISTS `vista_1_directorio_veracruz`;
/*!50001 DROP VIEW IF EXISTS `vista_1_directorio_veracruz`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_1_directorio_veracruz` AS SELECT 
 1 AS `Nombre_Establecimiento`,
 1 AS `Telefono`,
 1 AS `Sitio_Web`,
 1 AS `Correo_Electronico`,
 1 AS `Localidad`,
 1 AS `Municipio`,
 1 AS `Estado`,
 1 AS `Actividad`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_2_auditoria_direcciones`
--

DROP TABLE IF EXISTS `vista_2_auditoria_direcciones`;
/*!50001 DROP VIEW IF EXISTS `vista_2_auditoria_direcciones`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_2_auditoria_direcciones` AS SELECT 
 1 AS `CLEE`,
 1 AS `Nombre_Establecimiento`,
 1 AS `Numero_Exterior`,
 1 AS `Codigo_Postal`,
 1 AS `AGEB`,
 1 AS `Manzana`,
 1 AS `Latitud`,
 1 AS `Longitud`,
 1 AS `Tipo_Asentamiento`,
 1 AS `Nombre_Asentamiento`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_3_reporte_vialidades`
--

DROP TABLE IF EXISTS `vista_3_reporte_vialidades`;
/*!50001 DROP VIEW IF EXISTS `vista_3_reporte_vialidades`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_3_reporte_vialidades` AS SELECT 
 1 AS `Nombre_Establecimiento`,
 1 AS `Tipo_Vialidad_1`,
 1 AS `Nombre_Vialidad_1`,
 1 AS `Tipo_Vialidad_2`,
 1 AS `Nombre_Vialidad_2`,
 1 AS `Tipo_Vialidad_3`,
 1 AS `Nombre_Vialidad_3`,
 1 AS `Tipo_Vialidad_4`,
 1 AS `Nombre_Vialidad_4`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_4_estadistica_sector_municipio`
--

DROP TABLE IF EXISTS `vista_4_estadistica_sector_municipio`;
/*!50001 DROP VIEW IF EXISTS `vista_4_estadistica_sector_municipio`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_4_estadistica_sector_municipio` AS SELECT 
 1 AS `Municipio`,
 1 AS `Sector_Economico`,
 1 AS `Total_Unidades`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vista_5_denue_publico_descriptivo`
--

DROP TABLE IF EXISTS `vista_5_denue_publico_descriptivo`;
/*!50001 DROP VIEW IF EXISTS `vista_5_denue_publico_descriptivo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vista_5_denue_publico_descriptivo` AS SELECT 
 1 AS `Nombre_Establecimiento`,
 1 AS `Razon_Social`,
 1 AS `Actividad_Economica`,
 1 AS `Personal_Ocupado`,
 1 AS `Telefono`,
 1 AS `Correo_Electronico`,
 1 AS `Sitio_Web`,
 1 AS `Tipo_Unidad_Economica`,
 1 AS `Fecha_Alta`,
 1 AS `Tipo_Vialidad_1`,
 1 AS `Nombre_Vialidad_1`,
 1 AS `Tipo_Vialidad_2`,
 1 AS `Nombre_Vialidad_2`,
 1 AS `Tipo_Vialidad_3`,
 1 AS `Nombre_Vialidad_3`,
 1 AS `Tipo_Vialidad_4`,
 1 AS `Nombre_Vialidad_4`,
 1 AS `Tipo_Asentamiento`,
 1 AS `Nombre_Asentamiento`,
 1 AS `Localidad`,
 1 AS `Municipio`,
 1 AS `Estado`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vista_1_directorio_veracruz`
--

/*!50001 DROP VIEW IF EXISTS `vista_1_directorio_veracruz`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_1_directorio_veracruz` AS select `e`.`nom_estab` AS `Nombre_Establecimiento`,`e`.`telefono` AS `Telefono`,`e`.`www` AS `Sitio_Web`,`e`.`correoelec` AS `Correo_Electronico`,`l`.`Nombre_Localidad` AS `Localidad`,`m`.`Nombre_Municipio` AS `Municipio`,`ent`.`Nombre_Entidad` AS `Estado`,`a`.`descripcion_actividad` AS `Actividad` from (((((`establecimiento` `e` join `actividad` `a` on((`a`.`id_actividad` = ((`e`.`codigo_act` % 71) + 1)))) join `direccion` `d` on((`e`.`id_establecimiento` = `d`.`id_establecimiento`))) join `entidad` `ent` on((`d`.`cve_ent` = `ent`.`Clave_Entidad`))) join `municipio` `m` on(((`d`.`cve_mun` = `m`.`Clave_Municipio`) and (`d`.`cve_ent` = `m`.`Clave_Entidad`)))) left join (select `localidad`.`Clave_Municipio` AS `Clave_Municipio`,`localidad`.`Clave_Localidad` AS `Clave_Localidad`,max(`localidad`.`Nombre_Localidad`) AS `Nombre_Localidad` from `localidad` group by `localidad`.`Clave_Municipio`,`localidad`.`Clave_Localidad`) `l` on(((`d`.`cve_loc` = `l`.`Clave_Localidad`) and (`d`.`cve_mun` = `l`.`Clave_Municipio`)))) where ((`ent`.`Nombre_Entidad` like '%VERACRUZ%') and (`a`.`descripcion_actividad` like '%COMERCIO AL POR MAYOR%')) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_2_auditoria_direcciones`
--

/*!50001 DROP VIEW IF EXISTS `vista_2_auditoria_direcciones`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_2_auditoria_direcciones` AS select `e`.`clee` AS `CLEE`,`e`.`nom_estab` AS `Nombre_Establecimiento`,`d`.`numero_ext` AS `Numero_Exterior`,`d`.`cod_postal` AS `Codigo_Postal`,`d`.`ageb` AS `AGEB`,`d`.`manzana` AS `Manzana`,`d`.`latitud` AS `Latitud`,`d`.`longitud` AS `Longitud`,`d`.`tipo_asent` AS `Tipo_Asentamiento`,coalesce(`d`.`nomb_asent`,`asent`.`nombre_asentamiento`) AS `Nombre_Asentamiento` from ((`establecimiento` `e` join `direccion` `d` on((`e`.`id_establecimiento` = `d`.`id_establecimiento`))) left join `asentamiento` `asent` on((`asent`.`id_asentamiento` = `d`.`id_direccion`))) where ((`d`.`tipo_asent` is not null) and (`d`.`tipo_asent` <> '')) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_3_reporte_vialidades`
--

/*!50001 DROP VIEW IF EXISTS `vista_3_reporte_vialidades`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_3_reporte_vialidades` AS with `cte_vial` as (select `dv`.`id_direccion` AS `id_direccion`,`dv`.`tipo_vialidad` AS `tipo_vialidad`,`dv`.`nombre_vialidad` AS `nombre_vialidad`,row_number() OVER (PARTITION BY `dv`.`id_direccion` ORDER BY `dv`.`id_detalle` )  AS `rn` from (`detalle_vialidad` `dv` left join (select 1 AS `cat` from `tipo_de_vialidad` limit 1) `tv` on((1 = 1)))), `vialidades_pivot` as (select `cte_vial`.`id_direccion` AS `id_direccion`,max((case when (`cte_vial`.`rn` = 1) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_1`,max((case when (`cte_vial`.`rn` = 1) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_1`,max((case when (`cte_vial`.`rn` = 2) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_2`,max((case when (`cte_vial`.`rn` = 2) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_2`,max((case when (`cte_vial`.`rn` = 3) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_3`,max((case when (`cte_vial`.`rn` = 3) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_3`,max((case when (`cte_vial`.`rn` = 4) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_4`,max((case when (`cte_vial`.`rn` = 4) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_4` from `cte_vial` group by `cte_vial`.`id_direccion`) select `e`.`nom_estab` AS `Nombre_Establecimiento`,`v`.`Tipo_Vialidad_1` AS `Tipo_Vialidad_1`,`v`.`Nombre_Vialidad_1` AS `Nombre_Vialidad_1`,`v`.`Tipo_Vialidad_2` AS `Tipo_Vialidad_2`,`v`.`Nombre_Vialidad_2` AS `Nombre_Vialidad_2`,`v`.`Tipo_Vialidad_3` AS `Tipo_Vialidad_3`,`v`.`Nombre_Vialidad_3` AS `Nombre_Vialidad_3`,`v`.`Tipo_Vialidad_4` AS `Tipo_Vialidad_4`,`v`.`Nombre_Vialidad_4` AS `Nombre_Vialidad_4` from ((`establecimiento` `e` join `direccion` `d` on((`e`.`id_establecimiento` = `d`.`id_establecimiento`))) join `vialidades_pivot` `v` on((`d`.`id_direccion` = `v`.`id_direccion`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_4_estadistica_sector_municipio`
--

/*!50001 DROP VIEW IF EXISTS `vista_4_estadistica_sector_municipio`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_4_estadistica_sector_municipio` AS select `m`.`Nombre_Municipio` AS `Municipio`,`a`.`descripcion_actividad` AS `Sector_Economico`,count(distinct `e`.`id_establecimiento`) AS `Total_Unidades` from ((((`establecimiento` `e` join `actividad` `a` on((`a`.`id_actividad` = ((`e`.`codigo_act` % 71) + 1)))) join `direccion` `d` on((`e`.`id_establecimiento` = `d`.`id_establecimiento`))) join `municipio` `m` on(((`d`.`cve_mun` = `m`.`Clave_Municipio`) and (`d`.`cve_ent` = `m`.`Clave_Entidad`)))) left join (select `localidad`.`Clave_Municipio` AS `Clave_Municipio`,`localidad`.`Clave_Localidad` AS `Clave_Localidad`,max(`localidad`.`Nombre_Localidad`) AS `Nombre_Localidad` from `localidad` group by `localidad`.`Clave_Municipio`,`localidad`.`Clave_Localidad`) `l` on(((`d`.`cve_loc` = `l`.`Clave_Localidad`) and (`d`.`cve_mun` = `l`.`Clave_Municipio`)))) group by `m`.`Clave_Entidad`,`m`.`Clave_Municipio`,`m`.`Nombre_Municipio`,`a`.`descripcion_actividad` order by `Total_Unidades` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vista_5_denue_publico_descriptivo`
--

/*!50001 DROP VIEW IF EXISTS `vista_5_denue_publico_descriptivo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vista_5_denue_publico_descriptivo` AS with `cte_vial` as (select `dv`.`id_direccion` AS `id_direccion`,`dv`.`tipo_vialidad` AS `tipo_vialidad`,`dv`.`nombre_vialidad` AS `nombre_vialidad`,row_number() OVER (PARTITION BY `dv`.`id_direccion` ORDER BY `dv`.`id_detalle` )  AS `rn` from (`detalle_vialidad` `dv` left join (select 1 AS `cat` from `tipo_de_vialidad` limit 1) `tv` on((1 = 1)))), `vialidades_pivot` as (select `cte_vial`.`id_direccion` AS `id_direccion`,max((case when (`cte_vial`.`rn` = 1) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_1`,max((case when (`cte_vial`.`rn` = 1) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_1`,max((case when (`cte_vial`.`rn` = 2) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_2`,max((case when (`cte_vial`.`rn` = 2) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_2`,max((case when (`cte_vial`.`rn` = 3) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_3`,max((case when (`cte_vial`.`rn` = 3) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_3`,max((case when (`cte_vial`.`rn` = 4) then `cte_vial`.`tipo_vialidad` end)) AS `Tipo_Vialidad_4`,max((case when (`cte_vial`.`rn` = 4) then `cte_vial`.`nombre_vialidad` end)) AS `Nombre_Vialidad_4` from `cte_vial` group by `cte_vial`.`id_direccion`), `localidad_unica` as (select `localidad`.`Clave_Municipio` AS `Clave_Municipio`,`localidad`.`Clave_Localidad` AS `Clave_Localidad`,max(`localidad`.`Nombre_Localidad`) AS `Nombre_Localidad` from `localidad` group by `localidad`.`Clave_Municipio`,`localidad`.`Clave_Localidad`) select `e`.`nom_estab` AS `Nombre_Establecimiento`,`e`.`raz_social` AS `Razon_Social`,`a`.`descripcion_actividad` AS `Actividad_Economica`,`e`.`per_ocu` AS `Personal_Ocupado`,`e`.`telefono` AS `Telefono`,`e`.`correoelec` AS `Correo_Electronico`,`e`.`www` AS `Sitio_Web`,`e`.`tipoUniEco` AS `Tipo_Unidad_Economica`,`e`.`fecha_alta` AS `Fecha_Alta`,`v`.`Tipo_Vialidad_1` AS `Tipo_Vialidad_1`,`v`.`Nombre_Vialidad_1` AS `Nombre_Vialidad_1`,`v`.`Tipo_Vialidad_2` AS `Tipo_Vialidad_2`,`v`.`Nombre_Vialidad_2` AS `Nombre_Vialidad_2`,`v`.`Tipo_Vialidad_3` AS `Tipo_Vialidad_3`,`v`.`Nombre_Vialidad_3` AS `Nombre_Vialidad_3`,`v`.`Tipo_Vialidad_4` AS `Tipo_Vialidad_4`,`v`.`Nombre_Vialidad_4` AS `Nombre_Vialidad_4`,`d`.`tipo_asent` AS `Tipo_Asentamiento`,coalesce(`d`.`nomb_asent`,`asent`.`nombre_asentamiento`) AS `Nombre_Asentamiento`,`l`.`Nombre_Localidad` AS `Localidad`,`m`.`Nombre_Municipio` AS `Municipio`,`ent`.`Nombre_Entidad` AS `Estado` from (((((((`establecimiento` `e` left join `actividad` `a` on((`a`.`id_actividad` = ((`e`.`codigo_act` % 71) + 1)))) left join `direccion` `d` on((`e`.`id_establecimiento` = `d`.`id_establecimiento`))) left join `vialidades_pivot` `v` on((`d`.`id_direccion` = `v`.`id_direccion`))) left join `asentamiento` `asent` on((`asent`.`id_asentamiento` = `d`.`id_direccion`))) left join `entidad` `ent` on((`d`.`cve_ent` = `ent`.`Clave_Entidad`))) left join `municipio` `m` on(((`d`.`cve_mun` = `m`.`Clave_Municipio`) and (`d`.`cve_ent` = `m`.`Clave_Entidad`)))) left join `localidad_unica` `l` on(((`d`.`cve_loc` = `l`.`Clave_Localidad`) and (`d`.`cve_mun` = `l`.`Clave_Municipio`)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-16  0:46:35
