CREATE DATABASE  IF NOT EXISTS `lol-mastery-db` /*!40100 DEFAULT CHARACTER SET latin1 */;
USE `lol-mastery-db`;
-- MySQL dump 10.13  Distrib 5.7.9, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: lol-mastery-db
-- ------------------------------------------------------
-- Server version	5.7.12

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `mastery`
--

DROP TABLE IF EXISTS `mastery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mastery` (
  `summoner_id` int(11) NOT NULL,
  `champion_id` int(11) NOT NULL,
  `score` int(11) NOT NULL,
  UNIQUE KEY `summoner_champion` (`summoner_id`,`champion_id`),
  KEY `fk_summoner_id_idx` (`summoner_id`),
  CONSTRAINT `fk_summoner_id` FOREIGN KEY (`summoner_id`) REFERENCES `summoners` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `summoners`
--

DROP TABLE IF EXISTS `summoners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `summoners` (
  `id` int(11) NOT NULL,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'lol-mastery-db'
--
/*!50003 DROP PROCEDURE IF EXISTS `get_summoner_champion_rank` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=CURRENT_USER PROCEDURE `get_summoner_champion_rank`(IN summoner_id INT, IN champion_id INT)
BEGIN
	# MySQL doesn't support ROW_NUMBER in SELECT statements, so we have to fake it by counting.
	SET @score := -1;
	SET @rank := 0;

	# Create a temporary table that holds the complete ranking data for a champion.
	DROP TEMPORARY TABLE IF EXISTS temp_ranks;
	CREATE TEMPORARY TABLE temp_ranks AS
    (
		SELECT mastery.summoner_id
			,mastery.score
			,@rank := if(mastery.score = @score, @rank, @rank + 1) as rank
			,@score := mastery.score as dummy
		FROM mastery

		WHERE mastery.champion_id = champion_id
		ORDER BY mastery.score DESC
	);
    
    SET @count := (SELECT COUNT(*) FROM temp_ranks);
    
    # Select the relevant data for the user, along with some aggregate data.
    SELECT summoner_id
		,champion_id
		,temp_ranks.score
        ,temp_ranks.rank
        ,@count AS total
        ,100.0 * (@count - temp_ranks.rank) / @count AS percentile
    FROM temp_ranks
    WHERE temp_ranks.summoner_id = summoner_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `get_summoner_champion_ranks` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=CURRENT_USER PROCEDURE `get_summoner_champion_ranks`(IN summoner_id INT)
BEGIN
	# MySQL doesn't support ROW_NUMBER in SELECT statements, so we have to fake it by counting.
	SET @score := -1;
	SET @rank := 0;
    SET @champ_id := -1;

	# Create a temporary table that holds the complete ranking data for a champion.
	DROP TEMPORARY TABLE IF EXISTS temp_ranks;
	CREATE TEMPORARY TABLE temp_ranks AS
    (
		SELECT mastery.summoner_id
			,mastery.champion_id
			,mastery.score
			,@rank := if(@champ_id = mastery.champion_id, if(mastery.score = @score, @rank, @rank + 1), 1) AS rank
            ,@champ_id := mastery.champion_id AS champ_id_dummy
			,@score := mastery.score AS score_dummy
		FROM mastery
		ORDER BY mastery.champion_id, mastery.score DESC
	);
    
    DROP TEMPORARY TABLE IF EXISTS temp_counts;
	CREATE TEMPORARY TABLE temp_counts AS
    (
		SELECT mastery.champion_id
			,COUNT(mastery.champion_id) AS total
		FROM mastery
		GROUP BY mastery.champion_id
	);
    
    # Select the relevant data for the user, along with some aggregate data.
    SELECT summoner_id
		,temp_ranks.champion_id
		,temp_ranks.score
        ,temp_ranks.rank
        ,temp_counts.total
        ,100.0 * (temp_counts.total - temp_ranks.rank) / temp_counts.total AS percentile
    FROM temp_ranks
    INNER JOIN temp_counts ON (temp_ranks.champion_id = temp_counts.champion_id)
    WHERE temp_ranks.summoner_id = summoner_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `get_top_champion_scores` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=CURRENT_USER PROCEDURE `get_top_champion_scores`(IN champion_id INT, IN num INT)
BEGIN
	SELECT mastery.summoner_id
		,summoners.name
		,mastery.score
	FROM mastery
    JOIN summoners ON (mastery.summoner_id = summoners.id)
	WHERE mastery.champion_id = champion_id
	ORDER BY mastery.score DESC
	LIMIT num;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2016-05-02 20:57:43
