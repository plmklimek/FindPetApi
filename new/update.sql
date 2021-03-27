CREATE DEFINER=`root`@`localhost` PROCEDURE `edytuj_zgloszenie`(_id INT,_idUzytkownik INT ,_idzwierzecia INT,_tresc VARCHAR(90) CHARSET utf8mb4,_komentarz INT,_typ_zgloszenia VARCHAR(1) CHARSET utf8mb4,_typ_zwierzecia VARCHAR(4) CHARSET utf8mb4,_rasa VARCHAR(25) CHARSET utf8mb4,_wielkosc VARCHAR(6) CHARSET utf8mb4,_kolor_siersci VARCHAR(25) CHARSET utf8mb4,_znaki_szczegolne VARCHAR(45) CHARSET utf8mb4, _nagroda INT, _data_stworzenia DATETIME,_data_zaginiecia DATETIME,_latitude FLOAT,_longtitude FLOAT, _obszar  INT, _zdjecie1 VARCHAR(200), _zdjecie2 VARCHAR(200),_zdjecie3 VARCHAR(200),_zdjecie4 VARCHAR(200))
BEGIN
DECLARE ilosc_zdjec INT;
DECLARE idzwierz INT;
DECLARE idzdj_1 INT;
DECLARE idzdj_2 INT;
DECLARE idzdj_3 INT;
DECLARE idzdj_4 INT;
SELECT A.idZwierzecia INTO idzwierz FROM zwierzeta A JOIN posty B ON A.idZwierzecia = B.Zwierzęta_idZwierzecia WHERE B.idPosty = _id;
SELECT idZdjecia INTO idzdj_1 FROM zdjecia WHERE Posty_idPosty = _id LIMIT 0,1;
SELECT idZdjecia INTO idzdj_2 FROM zdjecia WHERE Posty_idPosty = _id LIMIT 1,1;
SELECT idZdjecia INTO idzdj_3 FROM zdjecia WHERE Posty_idPosty = _id LIMIT 2,1;
SELECT idZdjecia INTO idzdj_4 FROM zdjecia WHERE Posty_idPosty = _id LIMIT 3,1;
START TRANSACTION;
	SELECT COUNT(*) INTO ilosc_zdjec FROM zdjecia WHERE Posty_idPosty = _id;
	UPDATE zwierzeta SET typ_zgloszenia = _typ_zgloszenia, typ_zwierzecia = _typ_zwierzecia , rasa = _rasa, wielkosc = _wielkosc, kolor_siersci = _kolor_siersci , znaki_szczegolowe = _znaki_szczegolne , nagroda = _nagroda WHERE idZwierzecia = idzwierz;
    UPDATE posty SET treść = _tresc,id_komentarz = _komentarz,Zwierzęta_idZwierzecia =  _idzwierzecia,Użytkownicy_idUżytkownik = _idUzytkownik, data_zgloszenia = _data_stworzenia, data_time = _data_zaginiecia WHERE idPosty = _id;
    IF ilosc_zdjec  = 1 THEN
		UPDATE zdjecia SET zdjecie=_zdjecie1,Posty_idPosty = _id WHERE idZdjecia = idzdj_1;
    END IF;
   IF ilosc_zdjec  = 2 THEN
		UPDATE zdjecia SET zdjecie=_zdjecie1,Posty_idPosty = _id WHERE idZdjecia = idzdj_1;
		UPDATE zdjecia SET zdjecie=_zdjecie2,Posty_idPosty = _id WHERE idZdjecia = idzdj_2;
   END IF;
	IF ilosc_zdjec  = 3 THEN
		UPDATE zdjecia SET zdjecie=_zdjecie1,Posty_idPosty = _id WHERE idZdjecia = idzdj_1;
		UPDATE zdjecia SET zdjecie=_zdjecie2,Posty_idPosty = _id WHERE idZdjecia =idzdj_2;
        UPDATE zdjecia SET zdjecie=_zdjecie3,Posty_idPosty = _id WHERE idZdjecia =idzdj_3;
    END IF;
	IF ilosc_zdjec  = 4 THEN
		UPDATE zdjecia SET zdjecie=_zdjecie1,Posty_idPosty = _id WHERE idZdjecia =idzdj_1;
		UPDATE zdjecia SET zdjecie=_zdjecie2,Posty_idPosty = _id WHERE idZdjecia =idzdj_2;
        UPDATE zdjecia SET zdjecie=_zdjecie3,Posty_idPosty = _id WHERE idZdjecia =idzdj_3;
		UPDATE zdjecia SET zdjecie=_zdjecie4,Posty_idPosty = _id WHERE idZdjecia =idzdj_4;
   END IF;
	UPDATE lokalizacja SET latitude = _latitude,longtitude = _longtitude,obszar = _obszar WHERE Posty_idPosty = _id;
COMMIT;
END