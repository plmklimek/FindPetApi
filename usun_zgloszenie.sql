CREATE DEFINER=`root`@`localhost` PROCEDURE `usun_zgloszenie`(id INT)
BEGIN
DECLARE zwierzetaid INT;
DECLARE lokalizacjaid INT;
SELECT A.idZwierzecia  FROM zwierzeta A JOIN posty B ON A.idZwierzecia = B.Zwierzeta_idZwierzecia WHERE B.idPosty = id INTO zwierzetaid; 
SELECT A.idLokalizacja FROM lokalizacja A WHERE A.Posty_idposty = id INTO lokalizacjaid;

START TRANSACTION;
    DELETE FROM Zdjecia WHERE Posty_idposty = id;
    DELETE FROM lokalizacja WHERE idLokalizacja = lokalizacjaid;
    DELETE FROM posty WHERE idPosty = id;
    DELETE FROM zwierzeta WHERE idZwierzecia = zwierzetaid;
    
	DELETE FROM posty WHERE id_komentarz = id AND idPosty <> id;
COMMIT;
END