CREATE DEFINER=`root`@`localhost` PROCEDURE `dodaj_zgloszenie`(idUzytkownik INT,tresc VARCHAR(90) CHARSET utf8mb4,komentarz INT ,typ_zgloszenia VARCHAR(1) CHARSET utf8mb4,typ_zwierzecia VARCHAR(4) CHARSET utf8mb4,rasa VARCHAR(25) CHARSET utf8mb4,wielkosc VARCHAR(6) CHARSET utf8mb4,kolor_siersci VARCHAR(25) CHARSET utf8mb4,znaki_szczegolne VARCHAR(45) CHARSET utf8mb4, nagroda INT,data_stworzenia DATETIME,data_zaginiecia DATETIME,latitude FLOAT,longtitude FLOAT,obszar FLOAT,ilosc_zdjec INT,zdjecie1 VARCHAR(200),zdjecie2 VARCHAR(200),zdjecie3 VARCHAR(200),zdjecie4 VARCHAR(200))
BEGIN
DECLARE postid INT;
START TRANSACTION;
	INSERT INTO zwierzeta VALUES(NULL,typ_zgloszenia,typ_zwierzecia,rasa,wielkosc,kolor_siersci,znaki_szczegolne, nagroda);
    IF komentarz = -1 THEN
    INSERT INTO posty VALUES(NULL,tresc,NULL,LAST_INSERT_ID(),idUzytkownik,data_stworzenia, data_zaginiecia);
    ELSE
    INSERT INTO posty VALUES(NULL,tresc,komentarz,LAST_INSERT_ID(),idUzytkownik,data_stworzenia, data_zaginiecia);
    END IF;
    
    SET postid = LAST_INSERT_ID();
    IF ilosc_zdjec  = 1 THEN
		INSERT INTO zdjecia VALUES (NULL,zdjecie1,postid);
    END IF;
   IF ilosc_zdjec  = 2 THEN
		INSERT INTO zdjecia VALUES (NULL,zdjecie1,postid);
		INSERT INTO zdjecia VALUES (NULL,zdjecie2,postid);
    END IF;
	IF ilosc_zdjec  = 3 THEN
		INSERT INTO zdjecia VALUES (NULL,zdjecie1,postid);
        INSERT INTO zdjecia VALUES (NULL,zdjecie2,postid);
		INSERT INTO zdjecia VALUES (NULL,zdjecie3,postid);
    END IF;
	IF ilosc_zdjec  = 4 THEN
		INSERT INTO zdjecia VALUES (NULL,zdjecie1,postid);
        INSERT INTO zdjecia VALUES (NULL,zdjecie2,postid);
		INSERT INTO zdjecia VALUES (NULL,zdjecie3,postid);
		INSERT INTO zdjecia VALUES (NULL,zdjecie4,postid);
    END IF;
    INSERT INTO lokalizacja VALUES (NULL,latitude,longtitude,obszar,postid);
COMMIT;
END