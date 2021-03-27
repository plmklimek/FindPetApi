const mysql = require("mysql");
const express = require("express");
var nodemailer = require("nodemailer");
const multer = require("multer");
const sortByDistance = require("sort-by-distance");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

var transport = nodemailer.createTransport({
  maxConnections: 3,
  pool: true,
  service: "hotmail",
  auth: {
    user: "findpetapp@hotmail.com",
    pass: "Haslo.123",
  },
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    let customFileName = crypto.randomBytes(18).toString("hex");
    let fileExtension = path.extname(file.originalname).split(".")[1];
    cb(null, customFileName + "." + fileExtension);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype == "image/png"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

var app = express();
var async = require("async");
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(express.json());
app.use("/uploads", express.static(__dirname + "/uploads/"));
const mysqlConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "findpetapp",
  multipleStatements: true,
});

mysqlConnection.connect((err) => {
  console.log(err);
  if (!err) console.log("Connected");
  else JSON.stringify(err, undefined, 2);
});
app.listen(5100, () => console.log("Server is running on port 5100"));

app.use(express.static("uploads"));
app.post("/dodajobraz", upload.array("image", 4), (req, res) => {
  let temp = [];
  req.files.map((file) => {
    temp.push(file.originalname);
  });

  for (var i = 0; i < 5; i++) {
    console.log(temp[i]);
  }
});
app.get("/lokalizacja", (req, res) => {
  let sqlGetLocations = "SELECT * FROM lokalizacja";
  mysqlConnection.query(sqlGetLocations, (err, rows, fields) => {
    if (!err) res.send(rows);
    else res.send({ status: "failed", message: err.message });
  });
});

app.get("/lokalizacja/:id", (req, res) => {
  let sqlGetLocation = "SELECT * FROM lokalizacja WHERE idlokalizacja = ?";
  mysqlConnection.query(
    sqlGetLocation,
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else res.send({ status: "failed", message: err.message });
    }
  );
});

app.delete("/lokalizacja/:id", (req, res) => {
  let sqlDeleteLocation = "DELETE FROM lokalizacja WHERE idLokalizacja = ?";
  mysqlConnection.query(
    sqlDeleteLocation,
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Usunięto lokalizację");
      else res.send({ status: "failed", message: err.message });
    }
  );
});

app.post("/lokalizacja", (req, res) => {
  let body = req.body;
  let values = [
    body.Szerokosc_Geograficzna || null,
    body.Dlugosc_Geograficzna || null,
    body.obszar || null,
    body.Posty_idPosty || null,
  ];
  let sqlAddLocation =
    "SET @Szerokosc_Geograficzna = ?;SET @Dlugosc_Geograficzna = ?;SET @obszar = ?; SET @Posty_idPosty=?;INSERT INTO lokalizacja VALUES (NULL,@Szerokosc_Geograficzna,@Dlugosc_Geograficzna,@obszar,@Posty_idPosty);";
  mysqlConnection.query(sqlAddLocation, values, (err, rows, fields) => {
    if (!err) res.send("Dodano lokalizację");
    else {
      res.send({ status: "failed", message: err.message });
    }
  });
});

app.put("/lokalizacja", (req, res) => {
  let body = req.body;
  let location;
  async.parallel(
    [
      (callback) => {
        let sqlSelectLocation =
          "SET @id = ?;SELECT * FROM Lokalizacja WHERE idLokalizacja = @id;";
        mysqlConnection.query(
          sqlSelectLocation,
          body.id,
          (error, locationResult) => {
            location = locationResult[1][0];
            callback(error, locationResult[1]);
          }
        );
      },
    ],
    (err, results) => {
      let sqlUpdateLocation =
        "SET @idLokalizacja = ?;SET @Szerokosc_Geograficzna = ?;SET @Dlugosc_Geograficzna = ?;SET @obszar = ?; SET @Posty_idPosty=?;UPDATE lokalizacja SET Szerokosc_Geograficzna = @Szerokosc_Geograficzna,Dlugosc_Geograficzna=@Dlugosc_Geograficzna,obszar=@obszar,Posty_idPosty=@Posty_idPosty WHERE idLokalizacja = @idLokalizacja;";
      let values = [
        body.id || location.idLokalizacja,
        body.Szerokosc_Geograficzna || location.Szerokosc_Geograficzna,
        body.Dlugosc_Geograficzna || location.Dlugosc_Geograficzna,
        body.obszar || location.obszar,
        body.Posty_idPosty || location.Posty_idPosty,
      ];
      console.log(values);
      mysqlConnection.query(sqlUpdateLocation, values, (error, result) => {
        if (!err) res.send("Zaktualizowano lokalizację");
        else res.send({ status: "failed", message: err.message });
      });
    }
  );
});
app.get("/wspolrzedne", (req, res) => {
  let body = req.body;
  const check_a_point = (a, b, x, y, r) => {
    let dist_points = (a - x) * (a - x) + (b - y) * (b - y);
    r *= r;

    if (dist_points < r) {
      return true;
    }

    return false;
  };
  let Szerokosc_Geograficzna = body.Szerokosc_Geograficzna;
  let Dlugosc_Geograficzna = body.Dlugosc_Geograficzna;
  let obszar = body.obszar;
  let temp = [];
  mysqlConnection.query(
    "SELECT * FROM lokalizacja ",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) {
        rows.forEach((row) => {
          if (
            check_a_point(
              row.Szerokosc_Geograficzna,
              row.Dlugosc_Geograficzna,
              Szerokosc_Geograficzna,
              Dlugosc_Geograficzna,
              obszar
            ) == true
          ) {
            temp.push(row);
          }
        });
        res.send(temp);
      } else res.send({ status: "failed", message: err.message });
    }
  );
});
//użytownicy

app.get("/uzytkownicy", (req, res) => {
  let sqlGetUsers = "SELECT * FROM użytkownicy";
  mysqlConnection.query(sqlGetUsers, (err, rows, fields) => {
    if (!err) res.send(rows);
    else res.send({ status: "failed", message: err.message });
  });
});

app.get("/uzytkownicy/:id", (req, res) => {
  let sqlGetUser =
    "SET @idUzytkownik = ?;SELECT * FROM użytkownicy WHERE idUżytkownik = @idUzytkownik";
  mysqlConnection.query(sqlGetUser, [req.params.id], (err, rows, fields) => {
    if (!err) res.send(rows[1]);
    else res.send({ status: "failed", message: err.message });
  });
});

app.delete("/uzytkownicy/:id", (req, res) => {
  let sqlDeleteUser =
    "SET @idUzytkownik = ?;DELETE FROM użytkownicy WHERE idUżytkownik = @idUzytkownik";
  mysqlConnection.query(sqlDeleteUser, [req.params.id], (err, rows, fields) => {
    if (!err) res.send("Usunięto użytkownika");
    else res.send({ status: "failed", message: err.message });
  });
});

app.post("/uzytkownicy", (req, res) => {
  let body = req.body;
  let sqlAddUser =
    "SET @adres_mail = ?;SET @login = ?;SET @haslo = ?; SET @nr_telefonu = ?;SET @typ = ?;SET @punkty = ?;INSERT INTO użytkownicy VALUES (NULL,@adres_mail,@login,@haslo,@nr_telefonu,@typ,@punkty);";
  console.log(req.body);
  let values = [
    body.adres_mail || null,
    body.login || null,
    body.haslo || null,
    body.nr_telefonu || null,
    body.typ || "Z",
    body.punkty || 0,
  ];
  mysqlConnection.query(sqlAddUser, values, (error, result) => {
    if (!error) res.send("Dodano użytkownika");
    else res.send({ status: "failed", message: error.message });
  });
});

app.put("/uzytkownicy", (req, res) => {
  let body = req.body;
  let users;
  let sqlSelectUser =
    "SET @idUzytkownik = ?;SELECT * FROM użytkownicy WHERE idUżytkownik = @idUzytkownik;";
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(sqlSelectUser, body.id, (error, userResult) => {
          users = userResult[1][0];
          callback(error, users);
        });
      },
    ],
    (err, results) => {
      let sqlUpdateUser =
        "SET @idUzytkownik = ?;SET @adres_mail = ?;SET @login = ?;SET @haslo = ?;SET @nr_telefonu = ?; SET @typ = ?;SET @punkty = ?;UPDATE użytkownicy SET adres_mail = @adres_mail,login = @login,haslo = @haslo,nr_telefonu = @nr_telefonu,typ = @typ,punkty = @punkty WHERE idUżytkownik = @idUzytkownik ";

      let values = [
        body.id || users.idUzytkownik,
        body.adres_mail || users.adres_mail,
        body.login || users.login,
        body.haslo || users.haslo,
        body.nr_telefonu || users.nr_telefonu,
        body.typ || users.typ,
        body.punkty || users.punkty,
      ];
      mysqlConnection.query(sqlUpdateUser, values, (error, result) => {
        if (!error) {
          res.send("Zaktualizowano użytkownika");
        } else res.send({ status: "failed", message: error.message });
      });
    }
  );
});
app.get("/logowanie", (req, res) => {
  let body = req.body;
  var sqlSelectUserByData =
    "SET @login = ?;SET @haslo = ?;SELECT * FROM użytkownicy WHERE login = @login AND haslo = @haslo";
  mysqlConnection.query(
    sqlSelectUserByData,
    [body.login, body.haslo],
    (err, rows, fields) => {
      if (!err) {
        if (rows[2].length == 1) {
          res.send({
            status: "success",
            message: "Zalogowano",
            ...rows[2],
          });
        } else {
          res.send({
            status: "failed",
            message: "Niepoprawna nazwa użytkownika lub hasło",
          });
        }
      } else res.send({ status: "failed", message: err.message });
    }
  );
});

app.put("/dodajpunkt", (req, res) => {
  let body = req.body;
  var sqlAddPoint =
    "SET @idUzytkownik = ?;UPDATE użytkownicy SET punkty = punkty + 1 WHERE idUżytkownik = @idUzytkownik";
  mysqlConnection.query(sqlAddPoint, [body.id], (err, rows, fields) => {
    if (!err) res.send("Dodano punkt");
    else res.send({ status: "failed", message: err.message });
  });
});

//zdjecia

app.get("/zdjecia", (req, res) => {
  let sqlGetImages = "SELECT * FROM zdjecia";
  mysqlConnection.query(sqlGetImages, (err, rows, fields) => {
    if (!err) res.send(rows);
    else res.send({ status: "failed", message: err.message });
  });
});

app.get("/zdjecia/:id", (req, res) => {
  let sqlGetImage =
    "SET @idZdjecia = ?;SELECT * FROM zdjecia WHERE idZdjecia = @idZdjecia";
  mysqlConnection.query(sqlGetImage, [req.params.id], (err, rows, fields) => {
    if (!err) res.send(rows[1]);
    else res.send({ status: "failed", message: err.message });
  });
});
app.get("/zdjeciaposty/:id", (req, res) => {
  let sqlImagesForPost =
    "SET @Posty_idPosty = ?;SELECT * FROM zdjecia WHERE Posty_idPosty = @Posty_idPosty";
  mysqlConnection.query(
    sqlImagesForPost,
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows[1]);
      else res.send({ status: "failed", message: err.message });
    }
  );
});
app.delete("/zdjecia/:id", (req, res) => {
  let sqlDeleteImage =
    "SET @idZdjecia = ?;DELETE FROM zdjecia WHERE idZdjecia = @idZdjecia";
  mysqlConnection.query(
    sqlDeleteImage,
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Usunięto zdjęcie");
      else res.send({ status: "failed", message: err.message });
    }
  );
});

app.post("/zdjecia", (req, res) => {
  let body = req.body;
  var sqlAddImage =
    "SET @zdjecie = ?;SET @Posty_idPosty = ?;INSERT INTO zdjecia VALUES (NULL,@zdjecie,@Posty_idPosty);";
  mysqlConnection.query(
    sqlAddImage,
    [body.zdjecie, body.Posty_idPosty],
    (err, rows, fields) => {
      if (!err) res.send("Dodano zdjęcie");
      else res.send({ status: "failed", message: err.message });
    }
  );
});

app.put("/zdjecia", (req, res) => {
  let body = req.body;
  let images;
  let sqlSelectImage =
    "SET @id = ?;SELECT * FROM Zdjecia WHERE idZdjecia = @id;";
  let sqlUpdateImage =
    "SET @idZdjecia = ?;SET @zdjecie = ?;SET @Posty_idPosty = ?;UPDATE zdjecia  SET zdjecie = @zdjecie,Posty_idPosty=@Posty_idPosty WHERE idZdjecia = @idZdjecia;";
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(
          sqlSelectImage,
          body.id,
          (error, resultImages) => {
            images = resultImages[1][0];
            callback(error, images);
          }
        );
      },
    ],
    (err, results) => {
      var values = [
        body.id,
        body.zdjecie || images.zdjecie || 0,
        body.Posty_idPosty || images.Posty_idPosty || null,
      ];
      mysqlConnection.query(sqlUpdateImage, values, (error, result) => {
        if (!err) res.send("Zaktualizowano zdjęcie");
        else res.send({ status: "failed", message: err.message });
      });
    }
  );
});

//zwierzeta

app.get("/zwierzeta", (req, res) => {
  let sqlGetAnimals = "SELECT * FROM zwierzeta";
  mysqlConnection.query(sqlGetAnimals, (err, rows, fields) => {
    if (!err) res.send(rows);
    else res.send({ status: "failed", message: err.message });
  });
});

app.get("/zwierzeta/:id", (req, res) => {
  let sqlGetAnimal =
    "SET @idZwierzecia = ?;SELECT * FROM zwierzeta WHERE idZwierzecia = @idZwierzecia";
  mysqlConnection.query(sqlGetAnimal, [req.params.id], (err, rows, fields) => {
    if (!err) res.send(rows[1]);
    else res.send({ status: "failed", message: err.message });
  });
});
app.delete("/zwierzeta/:id", (req, res) => {
  let sqlDeleteAnimal =
    "SET @idZwierzecia =? ;DELETE FROM zwierzeta WHERE idZwierzecia = @idZwierzecia;";
  mysqlConnection.query(
    sqlDeleteAnimal,
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Usunięto zwierzę");
      else res.send({ status: "failed", message: err.message });
    }
  );
});
app.post("/zwierzeta", (req, res) => {
  let body = req.body;
  let sqlAddAnimal =
    "SET @typ_zgloszenia = ?;SET @typ_zwierzecia = ?;SET @rasa = ?;SET @wielkosc = ?;SET @kolor_siersci= ?;SET @znaki_szczegolne =?;SET @nagroda = ?;INSERT INTO Zwierzeta VALUES(NULL,@typ_zgloszenia,@typ_zwierzecia,@rasa,@wielkosc,@kolor_siersci,@znaki_szczegolne,@nagroda)";
  let values = [
    body.typ_zgloszenia || 0,
    body.typ_zwierzecia || null,
    body.rasa || null,
    body.wielkosc || null,
    body.kolor_siersci || null,
    body.znaki_szczegolne || null,
    body.nagroda || null,
    body.data_time || null,
  ];
  mysqlConnection.query(sqlAddAnimal, values, (err, rows, fields) => {
    if (!err) res.send("Dodano zwierzę");
    else res.send({ status: "failed", message: err.message });
  });
});

app.put("/zwierzeta", (req, res) => {
  let body = req.body;
  let animals;
  let sqlSelectAnimal =
    "SET @id = ?;SELECT * FROM Zwierzeta WHERE idZwierzecia = @id;";
  let sqlUpdateAnimal =
    "SET @idZwierzecia = ?;SET @typ_zgloszenia = ?;SET @typ_zwierzecia = ?;SET @rasa = ?;SET @wielkosc = ?;SET @kolor_siersci = ?;SET @znaki_szczegolne = ?;SET @nagroda = ?;SET @data_time = ?;UPDATE Zwierzeta SET typ_zgloszenia = @typ_zgloszenia, typ_zwierzecia = @typ_zwierzecia, rasa = @rasa, wielkosc = @wielkosc, kolor_siersci = @kolor_siersci, znaki_szczegolowe = @znaki_szczegolne,nagroda = @nagroda WHERE idZwierzecia = @idZwierzecia";
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(
          sqlSelectAnimal,
          body.id,
          (error, resultAnimal) => {
            animals = resultAnimal[1][0];
            callback(error, animals);
          }
        );
      },
    ],
    (err, results) => {
      var values = [
        body.id,
        body.typ_zgloszenia || animals.typ_zgloszenia || 0,
        body.typ_zwierzecia || animals.typ_zwierzecia || null,
        body.rasa || animals.rasa || null,
        body.wielkosc || animals.wielkosc || null,
        body.kolor_siersci || animals.kolor_siersci || null,
        body.znaki_szczegolne || animals.znaki_szczegolne || null,
        body.nagroda || animals.nagroda || null,
        body.data_time || animals.data_time || null,
      ];
      mysqlConnection.query(sqlUpdateAnimal, values, (error, result) => {
        if (!err) res.send("Zaktualizowano zwierzę");
        else res.send({ status: "failed", message: err.message });
      });
    }
  );
});
//posty
app.get("/posty", (req, res) => {
  let sqlGetPosts = "SELECT * FROM Posty;";
  mysqlConnection.query(sqlGetPosts, (err, rows, fields) => {
    if (!err) res.send(rows);
    else res.send({ status: "failed", message: err.message });
  });
});

app.get("/komentarze/:id", (req, res) => {
  let sqlGetComments =
    "SET @idPost = ?;SELECT B.Uzytkownicy_idUzytkownik,B.tresc FROM Posty A JOIN Posty B ON A.idPosty = B.id_komentarz WHERE A.idPosty = @idPost";
  mysqlConnection.query(
    sqlGetComments,
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows[1]);
      else res.send({ status: "failed", message: err.message });
    }
  );
});

app.get("/wyslijmaila", (req, res) => {
  var message = {
    from: "<findpetapp@hotmail.com>",
    to: "plmateuszklimek@gmail.com",
    subject: "temat",
    text: "Bla bla",
  };

  transport.sendMail(message, (error) => {
    console.log("Error occured");
    if (error) {
      console.log(error.message);
    } else console.log("Message sent successfully!");
  });
});
app.get("/postyuzytkownik/:id", (req, res) => {
  let sqlLost =
    "SET @id = ?;SELECT posty.idPosty,posty.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE posty.id_komentarz IS NULL AND zwierzeta.typ_zgloszenia = 0 AND użytkownicy.idUżytkownik = @id ;";
  let sqlFind =
    "SET @id = ?;SELECT posty.idPosty,posty.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE posty.id_komentarz IS NULL AND zwierzeta.typ_zgloszenia <> 0 AND użytkownicy.idUżytkownik = @id ;";
  let sqlPostsByComments =
    "SET @id = ?;SELECT posty.idPosty,posty.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN Użytkownicy uzytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE posty.id_komentarz IS  NULL  AND posty.idPosty IN (SELECT id_komentarz FROM Posty WHERE Uzytkownicy_idUżytkownik = @id)";
  let sqlUserComments =
    "SET @id = ?;SELECT posty.idPosty,posty.id_komentarz,posty.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE posty.id_komentarz IS NOT NULL AND użytkownicy.idUżytkownik = @id ;";

  let sqlComments =
    "SELECT posty.idPosty,komentarze.idPosty Posty_idPosty,komentarze.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia FROM Posty posty JOIN Posty komentarze ON posty.idPosty = komentarze.id_komentarz JOIN Użytkownicy użytkownicy ON komentarze.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik JOIN Zwierzeta zwierzeta ON komentarze.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia;";
  let sqlImages = "SELECT * FROM zdjecia";
  let postsCommentedByUser;
  let commentsByUser;
  let finalResult = [];
  let result = [];
  let posts = [];
  let comments = [];
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(
          sqlLost,
          req.params.id,
          (error, resultSqlLost) => {
            posts.push(resultSqlLost[1]);
            callback(error, resultSqlLost);
          }
        );
      },
      (callback) => {
        mysqlConnection.query(sqlFind, req.params.id, (error, resultFind) => {
          posts.push(resultFind[1]);
          callback(error, resultFind[1]);
        });
      },
      (callback) => {
        mysqlConnection.query(
          sqlPostsByComments,
          req.params.id,
          (error, resultPostByComments) => {
            postsCommentedByUser = resultPostByComments[1];
            callback();
          }
        );
      },
      (callback) => {
        mysqlConnection.query(
          sqlUserComments,
          req.params.id,
          (error, resultUserComments) => {
            commentsByUser = resultUserComments[1];
            let temp = [];
            postsCommentedByUser.map((post) => {
              commentsByUser.map((comment) => {
                if (post.idPosty == comment.id_komentarz) {
                  temp.push(comment);
                }
              });
              post.komentarze = temp;
            });
            result.push(postsCommentedByUser);
            callback(error, postsCommentedByUser);
          }
        );
      },
      (callback) => {
        mysqlConnection.query(sqlComments, (error, resultComments) => {
          comments = resultComments;
          let temp = [];
          posts[0].map((post) => {
            comments.map((comment) => {
              if (post.idPosty == comment.idPosty) {
                temp.push(comment);
              }
            });
            post.komentarze = temp;
          });
          posts[1].map((post) => {
            comments.map((comment) => {
              if (post.idPosty == comment.idPosty) {
                temp.push(comment);
              }
            });
            post.komentarze = temp;
          });
          result.push(...posts);
          callback();
        });
      },
      (callback) => {
        mysqlConnection.query(sqlImages, (error, resultImages) => {
          images = resultImages;
          let temp;
          for (var i = 0; i < 3; i++) {
            temp = result[i].map((res) => {
              return {
                ...res,
                komentarze: res.komentarze.map((comment) => {
                  return {
                    ...comment,
                    zdjecie: images.filter(
                      (img) => img.Posty_idPosty == comment.Posty_idPosty
                    ),
                  };
                }),
                zdjecie: images.filter(
                  (img) => img.Posty_idPosty == res.idPosty
                ),
              };
            });
            finalResult.push(temp);
          }
          callback();
        });
      },
    ],
    (err, results) => {
      if (err) {
        res.json({ status: "failed", message: err.message });
      } else {
        res.send(finalResult);
      }
    }
  );
});
app.get("/postypoid/:id", (req, res) => {
  let sqlPost =
    "SET @id = ?;SELECT posty.idPosty,posty.tresc,posty.data_zgloszenia,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna,lokalizacja.obszar,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,posty.data_time,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty FROM Posty posty JOIN lokalizacja lokalizacja ON posty.idPosty = lokalizacja.Posty_idPosty JOIN zwierzeta zwierzeta ON posty.Zwierzeta_IdZwierzecia = zwierzeta.idZwierzecia JOIN użytkownicy użytkownicy ON posty.użytkownicy_idUżytkownik = użytkownicy.idUżytkownik  WHERE posty.idPosty = @id;";
  let sqlComments =
    "SET @id = ?;SELECT posty.idPosty,posty.id_komentarz,posty.tresc,posty.data_zgloszenia,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna,lokalizacja.obszar,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,posty.data_time,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty  FROM Posty posty JOIN lokalizacja lokalizacja ON posty.idPosty = lokalizacja.Posty_idPosty JOIN zwierzeta zwierzeta ON posty.Zwierzeta_IdZwierzecia = zwierzeta.idZwierzecia JOIN użytkownicy użytkownicy ON posty.użytkownicy_idUżytkownik = użytkownicy.idUżytkownik  WHERE id_komentarz = @id;";
  let sqlImages = "SELECT * FROM zdjecia;";
  let post;
  let comments;
  let images;
  let finalResult;
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(sqlPost, req.params.id, (error, resultPosts) => {
          post = resultPosts[1];
          callback(error, resultPosts);
        });
      },
      (callback) => {
        mysqlConnection.query(
          sqlComments,
          req.params.id,
          (error, resultComments) => {
            comments = resultComments[1];
            post.map((thisPost) => {
              thisPost.komentarze = comments;
            });
            callback(error, resultComments);
          }
        );
      },
      (callback) => {
        mysqlConnection.query(sqlImages, (error, resultImages) => {
          images = resultImages;
          finalResult = post.map((thisPost) => {
            return {
              ...thisPost,
              komentarze: thisPost.komentarze.map((comment) => {
                return {
                  ...comment,
                  zdjecie: images.filter(
                    (img) => img.Posty_idPosty == comment.Posty_idPosty
                  ),
                };
              }),
              zdjecie: images.filter(
                (img) => img.Posty_idPosty == thisPost.idPosty
              ),
            };
          });
          callback(error, resultImages);
        });
      },
    ],
    (err, results) => {
      if (err) {
        res.json({ status: "failed", message: err.message });
      } else {
        res.send(finalResult);
      }
    }
  );
});
app.get("/postydozmoderowania", (req, res) => {
  let sqlPosts =
    "SELECT posty.idPosty,posty.tresc,posty.data_zgloszenia,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna,lokalizacja.obszar,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,posty.data_time,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty FROM Posty posty JOIN lokalizacja lokalizacja ON posty.idPosty = lokalizacja.Posty_idPosty JOIN zwierzeta zwierzeta ON posty.Zwierzeta_IdZwierzecia = zwierzeta.idZwierzecia JOIN użytkownicy użytkownicy ON posty.użytkownicy_idUżytkownik = użytkownicy.idUżytkownik  WHERE zwierzeta.rasa IS NULL OR zwierzeta.wielkosc IS NULL OR zwierzeta.kolor_siersci IS NULL";
  let sqlImages = "SELECT * FROM Zdjecia";
  let posts;
  let images;
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(sqlPosts, (error, resultPosts) => {
          posts = resultPosts;
          callback(error, resultPosts);
        });
      },
      (callback) => {
        mysqlConnection.query(sqlImages, (error, resultImages) => {
          images = resultImages;
          posts.map((post) => {
            let temp = [];
            images.map((image) => {
              if (post.idPosty == image.Posty_idPosty) {
                temp.push(image);
              }
            });
            post.zdjecia = temp;
          });
          callback(error, resultImages);
        });
      },
    ],
    (err, results) => {
      if (err) {
        res.json({ status: "failed", message: err.message });
      } else {
        res.send(posts);
      }
    }
  );
});
app.get("/rasy", (req, res) => {
  let AllBreeds;
  let sqlGroupBreed =
    "SELECT rasa FROM Zwierzeta WHERE typ_zwierzecia LIKE ? GROUP BY rasa ;";
  let body = req.body;
  mysqlConnection.query(
    sqlGroupBreed,
    body.typ_zwierzecia || "%",
    (error, resultBreeds) => {
      res.send(resultBreeds);
    }
  );
});
app.get("/postykomentarze/:filter", (req, res) => {
  let comments = {};
  let sqlPosts;
  let body = req.body;
  let finalPosts = [];
  if (req.params.filter == 1) {
    sqlPosts =
      "SELECT posty.idPosty,posty.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna,lokalizacja.obszar FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik JOIN lokalizacja lokalizacja ON posty.idPosty = lokalizacja.Posty_idPosty WHERE posty.id_komentarz IS NULL AND zwierzeta.typ_zgloszenia <> 0 ;";
  } else if (req.params.filter == 0) {
    sqlPosts =
      "SELECT posty.idPosty,posty.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna,lokalizacja.obszar FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik JOIN lokalizacja lokalizacja ON posty.idPosty = lokalizacja.Posty_idPosty WHERE posty.id_komentarz IS NULL AND zwierzeta.typ_zgloszenia = 0 ;";
  } else if (req.params.filter == "all") {
    sqlPosts =
      "SELECT posty.idPosty,posty.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,posty.data_zgloszenia,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna,lokalizacja.obszar FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik JOIN lokalizacja lokalizacja ON posty.idPosty = lokalizacja.Posty_idPosty WHERE posty.id_komentarz IS NULL;";
  }
  //sort i filtry

  let objLocation = [];
  let sortedLocationArray = [];
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(sqlPosts, (error, resultPosts) => {
          finalPosts = resultPosts;
          let tempArray = [];
          let tempObj = {};
          finalPosts.map((post) => {
            tempObj.id = post.idPosty;
            tempObj.x = post.Dlugosc_Geograficzna;
            tempObj.y = post.Szerokosc_Geograficzna;
            tempArray.push(tempObj);
          });
          tempArray = [];
          if (
            body.Szerokosc_Geograficzna != undefined &&
            body.Dlugosc_Geograficzna != undefined &&
            body.sort_Lokalizacja != undefined
          ) {
            sortedLocationArray = sortByDistance(
              { x: body.Dlugosc_Geograficzna, y: body.Szerokosc_Geograficzna },
              objLocation
            );
            sortedLocationArray.map((sort) => {
              finalPosts.map((post) => {
                if (post.idPosty === sort.id) {
                  post.distance = sort.distance;
                  tempArray.push(post);
                }
              });
            });
            finalPosts = tempArray;
            if (body.sort_Lokalizacja == "DESC") {
              finalPosts = [...tempArray].reverse();
            }
          }
          if (
            body.Szerokosc_Geograficzna != undefined &&
            body.Dlugosc_Geograficzna != undefined &&
            body.filtr_Lokalizacja != undefined &&
            body.obszar != undefined
          ) {
            const check_a_point = (a, b, x, y, r) => {
              let dist_points = (a - x) * (a - x) + (b - y) * (b - y);
              r *= r;

              if (dist_points < r) {
                return true;
              }

              return false;
            };
            let Szerokosc_Geograficzna = body.Szerokosc_Geograficzna;
            let Dlugosc_Geograficzna = body.Dlugosc_Geograficzna;
            let obszar = body.obszar;
            tempArray = [];
            finalPosts.map((post) => {
              if (
                check_a_point(
                  post.Szerokosc_Geograficzna,
                  post.Dlugosc_Geograficzna,
                  Szerokosc_Geograficzna,
                  Dlugosc_Geograficzna,
                  obszar
                ) == true
              ) {
                tempArray.push(post);
              }
            });
            finalPosts = tempArray;
          }

          if (body.sort_data_dodania != undefined) {
            finalPosts.sort((a, b) => {
              var keyA = new Date(a.data_zgloszenia),
                keyB = new Date(b.data_zgloszenia);
              // Compare the 2 dates
              if (keyA < keyB) return -1;
              if (keyA > keyB) return 1;
              return 0;
            });
            if (body.sort_data_dodania == "DESC") {
              finalPosts = [...finalPosts].reverse();
            }
          }
          if (
            body.filter_data_dodania_typ != undefined &&
            body.filter_data_dodania != undefined
          ) {
            tempArray = [];
            if (body.filter_data_dodania_typ == "after") {
              finalPosts.map((post) => {
                if (
                  new Date(post.data_zgloszenia) >=
                  new Date(body.filter_data_dodania)
                ) {
                  tempArray.push(post);
                }
              });
            }
            if (body.filter_data_dodania_typ == "before") {
              finalPosts.map((post) => {
                if (
                  new Date(post.data_zgloszenia) <=
                  new Date(body.filter_data_dodania)
                ) {
                  tempArray.push(post);
                }
              });
            }
            finalPosts = tempArray;
          }
          if (body.sort_data_zaginiecia_zauwazenia != undefined) {
            finalPosts.sort((a, b) => {
              var keyA = new Date(a.data_time),
                keyB = new Date(b.data_time);
              // Compare the 2 dates
              if (keyA < keyB) return -1;
              if (keyA > keyB) return 1;
              return 0;
            });
            if (body.sort_data_zaginiecia_zauwazenia == "DESC") {
              finalPosts = [...finalPosts].reverse();
            }
          }
          if (
            body.filter_data_zaginiecia_zauwazenia_typ != undefined &&
            body.filter_data_zaginiecia_zauwazenia != undefined
          ) {
            tempArray = [];
            if (body.filter_data_zaginiecia_zauwazenia_typ == "after") {
              finalPosts.map((post) => {
                if (
                  new Date(post.data_time) >=
                  new Date(body.filter_data_zaginiecia_zauwazenia)
                ) {
                  tempArray.push(post);
                }
              });
            }
            if (body.filter_data_zaginiecia_zauwazenia_typ == "before") {
              finalPosts.map((post) => {
                if (
                  new Date(post.data_time) <=
                  new Date(body.filter_data_zaginiecia_zauwazenia)
                ) {
                  tempArray.push(post);
                }
              });
            }
            finalPosts = tempArray;
          }
          if (body.sort_rasa != undefined) {
            finalPosts.sort((a, b) => {
              if (a.rasa < b.rasa) {
                return -1;
              }
              if (a.rasa > b.rasa) {
                return 1;
              }
              return 0;
            });
            if (body.sort_rasa == "DESC") {
              finalPosts = [...finalPosts].reverse();
            }
          }
          if (body.filter_rasa != undefined) {
            tempArray = [];
            finalPosts.map((post) => {
              if (post.rasa.indexOf(body.filter_rasa) > -1)
                tempArray.push(post);
            });
            finalPosts = tempArray;
          }
          if (body.sort_typ_zwierzecia != undefined) {
            finalPosts.sort((a, b) => {
              if (a.typ_zwierzecia < b.typ_zwierzecia) {
                return -1;
              }
              if (a.typ_zwierzecia > b.typ_zwierzecia) {
                return 1;
              }
              return 0;
            });
            if (body.typ_zwierzecia == "DESC") {
              finalPosts = [...finalPosts].reverse();
            }
          }
          if (body.filter_typ_zwierzecia != undefined) {
            tempArray = [];
            finalPosts.map((post) => {
              if (post.typ_zwierzecia.indexOf(body.filter_typ_zwierzecia) > -1)
                tempArray.push(post);
            });
            finalPosts = tempArray;
          }
          if (body.sort_wielkosc != undefined) {
            finalPosts.sort((a, b) => {
              if (a.wielkosc < b.wielkosc) {
                return -1;
              }
              if (a.wielkosc > b.wielkosc) {
                return 1;
              }
              return 0;
            });
            if (body.sort_wielkosc == "DESC") {
              finalPosts = [...finalPosts].reverse();
            }
          }
          if (body.filter_wielkosc != undefined) {
            tempArray = [];
            finalPosts.map((post) => {
              if (post.wielkosc.indexOf(body.filter_wielkosc) > -1)
                tempArray.push(post);
            });
            finalPosts = tempArray;
          }
          callback(error, true);
        });
      },
      (callback) => {
        let sqlGetComments =
          "SELECT posty.idPosty,komentarze.tresc,zwierzeta.typ_zgloszenia,zwierzeta.typ_zwierzecia,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,użytkownicy.adres_mail,użytkownicy.login,użytkownicy.typ,użytkownicy.punkty,posty.data_time,komentarze.data_zgloszenia FROM Posty posty JOIN Posty komentarze ON posty.idPosty = komentarze.id_komentarz JOIN Użytkownicy użytkownicy ON komentarze.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik JOIN Zwierzeta zwierzeta ON komentarze.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia;";
        mysqlConnection.query(sqlGetComments, (error, resultComments) => {
          comments = resultComments;
          callback(error, true);
        });
      },
      (callback) => {
        let sqlGetImages = "SELECT * FROM Zdjecia";
        mysqlConnection.query(sqlGetImages, (error, resultImages) => {
          images = resultImages;

          callback(error, true);
        });
      },
    ],
    (err, results) => {
      if (err) {
        res.json({ status: "failed", message: error.message });
      } else {
        finalPosts.map((post) => {
          var temp = [];
          comments.map((komentarz) => {
            if (post.idPosty == komentarz.idPosty) {
              temp.push(komentarz);
            }
          });
          post.komentarze = temp;
        });

        finalPosts = finalPosts.map((post) => {
          return {
            ...post,
            komentarze: post.komentarze.map((comment) => {
              return {
                ...comment,
                zdjecie: images.filter(
                  (img) => img.Posty_idPosty == comment.Posty_idPosty
                ),
              };
            }),
            zdjecie: images.filter((img) => img.Posty_idPosty == post.idPosty),
          };
        });
        res.send(finalPosts);
      }
    }
  );
});

app.get("/posty/:id", (req, res) => {
  let sqlGetPost =
    "SET @idPosty = ?;SELECT * FROM Posty WHERE idPosty = @idPosty";
  mysqlConnection.query(sqlGetPost, [req.params.id], (err, rows, fields) => {
    if (!err) res.send(rows[1]);
    else res.send({ status: "failed", message: err.message });
  });
});
app.delete("/posty/:id", (req, res) => {
  //    fs.unlinkSync("uploads/2.jpg");    fs.unlinkSync("uploads/2.jpg");
  let sqlGetImagesByPosts =
    "SET @id = ?;SELECT * FROM Zdjecia WHERE Posty_idPosty = @id;";
  let images;
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(
          sqlGetImagesByPosts,
          [req.params.id],
          (error, resultImages) => {
            images = resultImages[1];
            callback(error, images);
          }
        );
      },
    ],
    (err, results) => {
      mysqlConnection.query(
        "SET @id = ?;call usun_zgloszenie(@id)",
        [req.params.id],
        async (err, rows, fields) => {
          if (!err) {
            await images.map((img) => {
              if (img.zdjecie != null) fs.unlinkSync(img.zdjecie);
            });
            res.send("Usunięto post");
          } else res.send({ status: "failed", message: err.message });
        }
      );
    }
  );
});
app.post("/posty", upload.array("zdjecia", 4), (req, res) => {
  //SELECT C.adres_mail,A.longtitude,A.latitude,A.obszar,A.Posty_idPosty FROM Lokalizacja A JOIN Posty B ON A.Posty_idPosty = B.idPosty JOIN Uzytkownicy C ON B.Uzytkownicy_idUzytkownik = C.idUzytkownik WHERE A.Posty_idPosty NOT IN(SELECT MAX(idPosty) FROM Posty);
  const inArea = (a, b, x, y, r) => {
    var dist_points = (a - x) * (a - x) + (b - y) * (b - y);
    r *= r;
    if (dist_points < r) {
      return true;
    }
    return false;
  };
  var result;
  var losts;
  var lostsArray = [];
  let images_array = [];
  req.files.map((file) => {
    if (file.originalname !== undefined)
      images_array.push(file.path.replace(/\\/g, "/"));
    else images_array.push(null);
  });
  var newSzerokosc_Geograficzna;
  var newDlugosc_Geograficzna;
  let body = req.body;
  let posts;
  let comments = [];

  let sqlAddPosts =
    "SET @idUżytkownik = ?;SET @tresc = ?;SET @komentarz = ?; SET @typ_zgloszenia = ?;SET @typ_zwierzecia = ?;SET @rasa = ?;SET @wielkosc = ?; SET @kolor_siersci = ?;SET @znaki_szczegolne = ?;SET @nagroda = ?;SET @data_time = ?; SET @data_zgloszenia = ?;SET @Szerokosc_Geograficzna = ?;SET @Dlugosc_Geograficzna = ?;SET @obszar = ?;SET @ilosc_zdjec = ?;SET @zdjecie1 = ?;SET @zdjecie2 = ?;SET @zdjecie3= ?;SET @zdjecie4 = ?;call dodaj_zgloszenie(@idUżytkownik,@tresc,@komentarz,@typ_zgloszenia,@typ_zwierzecia,@rasa,@wielkosc,@kolor_siersci,@znaki_szczegolne,@nagroda,@data_zgloszenia,@data_time,@Szerokosc_Geograficzna,@Dlugosc_Geograficzna,@obszar,@ilosc_zdjec,@zdjecie1,@zdjecie2,@zdjecie3,@zdjecie4);";
  console.log(body.komentarz);
  let values = [
    body.idUzytkownik || null,
    body.tresc || null,
    body.komentarz === "" ? null : body.komentarz,
    body.typ_zgloszenia === "" ? null : body.typ_zgloszenia,
    body.typ_zwierzecia || null,
    body.rasa || null,
    body.wielkosc || null,
    body.kolor_siersci || null,
    body.znaki_szczegolne || null,
    body.nagroda === "" ? null : body.nagroda,
    body.data_time || null,
    body.data_zgloszenia || null,
    body.Szerokosc_Geograficzna || null,
    body.Dlugosc_Geograficzna || null,
    body.obszar === "" ? null : body.obszar,
    body.ilosc_zdjec || null,
    images_array[0] || null,
    images_array[1] || null,
    images_array[2] || null,
    images_array[3] || null,
  ];
  if (
    body.komentarz == undefined ||
    (body.komentarz === "" && body.typ_zgloszenia != 0)
  ) {
    async.parallel(
      [
        (callback) => {
          mysqlConnection.query(
            sqlAddPosts,
            values,
            (error, resultAddPosts) => {
              newSzerokosc_Geograficzna = body.Szerokosc_Geograficzna;
              newDlugosc_Geograficzna = body.Dlugosc_Geograficzna;
              callback(error, resultAddPosts);
            }
          );
        },
        (callback) => {
          let sqlAllLost =
            "SELECT posty.data_zgloszenia,użytkownicy.login,użytkownicy.adres_mail,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna,lokalizacja.obszar FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_IdZwierzecia = zwierzeta.idZwierzecia JOIN Lokalizacja lokalizacja ON  posty.idPosty = lokalizacja.Posty_idPosty JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE zwierzeta.typ_zgloszenia = 0;";
          mysqlConnection.query(sqlAllLost, (error, resultAllLosts) => {
            result = resultAllLosts;
            result.map((res) => {
              if (
                inArea(
                  newSzerokosc_Geograficzna,
                  newDlugosc_Geograficzna,
                  res.Szerokosc_Geograficzna,
                  res.Dlugosc_Geograficzna,
                  res.obszar
                ) === true
              ) {
                lostsArray.push(res);
              }
            });
            callback(error, lostsArray);
          });
        },
        (callback) => {
          let sqlAllFind =
            "SELECT  użytkownicy.adres_mail,posty.idPosty,posty.tresc,posty.data_zgloszenia,zwierzeta.typ_zwierzecia,posty.data_time,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_IdZwierzecia = zwierzeta.idZwierzecia JOIN Lokalizacja lokalizacja ON  posty.idPosty = lokalizacja.Posty_idPosty JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE zwierzeta.typ_zgloszenia <> 0 AND posty.data_zgloszenia > DATE_SUB(now(), INTERVAL 6 MONTH);";
          mysqlConnection.query(sqlAllFind, (error, resultAllFind) => {
            result = resultAllFind;
            losts = lostsArray;
            console.log(losts.length);
            console.log(result.length);
            losts.map((lost) => {
              var temp = [];
              result.map((res) => {
                console.log(
                  res.Szerokosc_Geograficzna +
                    " " +
                    res.Dlugosc_Geograficzna +
                    " " +
                    lost.Szerokosc_Geograficzna +
                    " " +
                    lost.Dlugosc_Geograficzna +
                    " " +
                    lost.obszar
                );
                if (
                  inArea(
                    res.Szerokosc_Geograficzna,
                    res.Dlugosc_Geograficzna,
                    lost.Szerokosc_Geograficzna,
                    lost.Dlugosc_Geograficzna,
                    lost.obszar
                  ) === true
                ) {
                  temp.push(res);
                }
                lost.mailers = temp;
              });
            });
            callback(error, losts);
            losts.map((postsData) => {
              if (postsData.mailers.length > 0) {
                var welcomeName = postsData.login || postsData.adres_mail;
                var newMessage =
                  postsData.mailers[postsData.mailers.length - 1];
                newMessage.data_zgloszenia =
                  newMessage.data_zgloszenia || "nie określono";
                newMessage.rasa = newMessage.rasa || "nie określono";
                newMessage.wielkosc = newMessage.wielkosc || "nie określono";
                newMessage.znaki_szczegolne =
                  newMessage.znaki_szczegolne || "nie określono";
                newMessage.lokalizacja = "";
                if (
                  newMessage.Szerokosc_Geograficzna == undefined ||
                  newMessage.Dlugosc_Geograficzna == undefined
                ) {
                  newMessage.lokalizacja = "nie określono";
                } else {
                  newMessage.lokalizacja = `<img src="https://api.mapbox.com/v4/mapbox.streets/pin-s-heart+285A98(${newMessage.Dlugosc_Geograficzna},${newMessage.Szerokosc_Geograficzna})/${newMessage.Dlugosc_Geograficzna},${newMessage.Szerokosc_Geograficzna},15/300x150.jpg80?access_token=pk.eyJ1IjoibWtsaW1lazE5OTciLCJhIjoiY2szd3Z4ZW9rMTA5ajNkb3B4cXd6ZW9wNSJ9.060xIr41HznBuJS_UYt1IA"/>
                `;
                }
                var lostmessage = ``;
                var lostmessage = `<p>Witaj ${welcomeName}</p><p>W lokalizacji w której zgłosiłeś zaginięcie swojego zwierzęcia zostało zauważone nowe zwierzę :</p>
                <ul>
                <li>adres e-mail : ${newMessage.adres_mail}</li>
                <li>data stworzenia : ${newMessage.data_zgloszenia}</li>
                <li>rasa : ${newMessage.rasa}</li>
                <li>wielkość : ${newMessage.wielkosc}</li>
                <li>kolor sierści : ${newMessage.kolor_siersci}</li>
                <li>znaki szczególne : ${newMessage.znaki_szczegolne}</li>
                <li>Lokalizacja:${newMessage.lokalizacja} </li>
                </ul>
                <p>Pozostałe zauważone zwierzęta : </p>`;
                var allfound = ``;
                postsData.mailers.map((mailer, index) => {
                  if (postsData.mailers.length - 1 !== index) {
                    mailer.data_zgloszenia =
                      mailer.data_zgloszenia || "nie określono";
                    mailer.rasa = mailer.rasa || "nie określono";
                    mailer.wielkosc = mailer.wielkosc || "nie określono";
                    mailer.znaki_szczegolne =
                      mailer.znaki_szczegolne || "nie określono";

                    mailer.lokalizacja = "";
                    if (
                      mailer.Szerokosc_Geograficzna == undefined ||
                      mailer.Dlugosc_Geograficzna == undefined
                    ) {
                      mailer.lokalizacja = "nie określono";
                    } else {
                      mailer.lokalizacja = `<img src="https://api.mapbox.com/v4/mapbox.streets/pin-s-heart+285A98(${mailer.Dlugosc_Geograficzna},${mailer.Szerokosc_Geograficzna})/${mailer.Dlugosc_Geograficzna},${mailer.Szerokosc_Geograficzna},15/300x150.jpg80?access_token=pk.eyJ1IjoibWtsaW1lazE5OTciLCJhIjoiY2szd3Z4ZW9rMTA5ajNkb3B4cXd6ZW9wNSJ9.060xIr41HznBuJS_UYt1IA"/>
                  `;
                    }

                    allfound += `<ul>`;
                    allfound += `<li>adres e-mail : ${mailer.adres_mail}</li>`;
                    allfound += `<li>data stworzenia : ${mailer.data_zgloszenia}</li>`;
                    allfound += `<li>rasa : ${mailer.rasa}</li>`;
                    allfound += `<li>wielkość : ${mailer.wielkosc}</li>`;
                    allfound += `<li>kolor sierści : ${mailer.kolor_siersci}</li>`;
                    allfound += `<li>znaki szczególne : ${mailer.znaki_szczegolne}</li>`;
                    allfound += `<li>lokalizacja: ${mailer.lokalizacja}</li>`;
                    allfound += `</ul><hr>`;
                  }
                });
                lostmessage =
                  lostmessage +
                  allfound +
                  "Po więcej informacji wejdź na naszą stronę.";
                var message = {
                  from: "<findpetapp@hotmail.com>",
                  to: postsData.adres_mail,
                  subject:
                    "W lokalizacji w której zgłosiłeś zaginione zwierzę ,ktoś zauważył zwierzę ",
                  html: lostmessage,
                };
                transport.sendMail(message, (error) => {
                  console.log("Error occured");
                  if (error) {
                    console.log(error.message);
                  } else {
                    console.log("Message sent successfully!");
                  }
                });
              }
            });
          });
        },
      ],
      (err, results) => {
        if (err) {
          res.json({ status: "failed", message: err.message });
        } else {
          res.send({ status: "success", message: "Dodano post." });
        }
      }
    );
  } else if (body.komentarz != undefined) {
    async.parallel(
      [
        (callback) => {
          mysqlConnection.query(
            sqlAddPosts,
            values,
            (error, resultAddPosts) => {
              callback(error, resultAddPosts);
            }
          );
        },
        (callback) => {
          let sqlSelectPosts =
            "SET @komentarz = ?;SELECT  użytkownicy.adres_mail,posty.idPosty,posty.tresc,posty.data_zgloszenia,zwierzeta.typ_zwierzecia,posty.data_time,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_IdZwierzecia = zwierzeta.idZwierzecia JOIN Lokalizacja lokalizacja ON  posty.idPosty = lokalizacja.Posty_idPosty JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE posty.idPosty = @komentarz;";
          mysqlConnection.query(
            sqlSelectPosts,
            body.komentarz,
            (error, resultSelectPosts) => {
              posts = resultSelectPosts[1];
              console.log(posts);
              callback(error, posts);
            }
          );
        },
        (callback) => {
          let sqlSelectComments =
            "SELECT  użytkownicy.adres_mail,posty.idPosty,posty.id_komentarz,posty.tresc,posty.data_zgloszenia,zwierzeta.typ_zwierzecia,posty.data_time,zwierzeta.rasa,zwierzeta.wielkosc,zwierzeta.kolor_siersci,zwierzeta.znaki_szczegolne,zwierzeta.nagroda,lokalizacja.Szerokosc_Geograficzna,lokalizacja.Dlugosc_Geograficzna FROM Posty posty JOIN Zwierzeta zwierzeta ON posty.Zwierzeta_IdZwierzecia = zwierzeta.idZwierzecia JOIN Lokalizacja lokalizacja ON  posty.idPosty = lokalizacja.Posty_idPosty JOIN Użytkownicy użytkownicy ON posty.Użytkownicy_idUżytkownik = użytkownicy.idUżytkownik WHERE posty.id_komentarz IS NOT NULL AND posty.data_zgloszenia > DATE_SUB(now(), INTERVAL 6 MONTH)";
          mysqlConnection.query(
            sqlSelectComments,
            (error, resultSelectComments) => {
              comments = resultSelectComments;
              posts.map((post) => {
                var temp = [];
                comments.map((comment) => {
                  if (post.idPosty == comment.id_komentarz) {
                    temp.push(comment);
                  }
                  post.komentarze = temp;
                });
              });
              callback(error, posts);
              posts.map((postsData) => {
                if (postsData.komentarze.length > 0) {
                  var welcomeName = postsData.login || postsData.adres_mail;
                  var newMessage =
                    postsData.komentarze[postsData.komentarze.length - 1];
                  newMessage.data_zgloszenia =
                    newMessage.data_zgloszenia || "nie określono";
                  newMessage.rasa = newMessage.rasa || "nie określono";
                  newMessage.wielkosc = newMessage.wielkosc || "nie określono";
                  newMessage.znaki_szczegolne =
                    newMessage.znaki_szczegolne || "nie określono";

                  newMessage.lokalizacja = "";
                  if (
                    newMessage.Szerokosc_Geograficzna == undefined ||
                    newMessage.Dlugosc_Geograficzna == undefined
                  ) {
                    newMessage.lokalizacja = "nie określono";
                  } else {
                    newMessage.lokalizacja = `<img src="https://api.mapbox.com/v4/mapbox.streets/pin-s-heart+285A98(${newMessage.Dlugosc_Geograficzna},${newMessage.Szerokosc_Geograficzna})/${newMessage.Dlugosc_Geograficzna},${newMessage.Szerokosc_Geograficzna},15/300x150.jpg80?access_token=pk.eyJ1IjoibWtsaW1lazE5OTciLCJhIjoiY2szd3Z4ZW9rMTA5ajNkb3B4cXd6ZW9wNSJ9.060xIr41HznBuJS_UYt1IA"/>
                `;
                  }
                  var lostmessage = ``;
                  var lostmessage = `<p>Witaj ${welcomeName}</p><p>Pod twoim zgłoszeniem pojawił się nowy komentarze:</p>
                <ul>
                <li>adres e-mail : ${newMessage.adres_mail}</li>
                <li>data stworzenia : ${newMessage.data_zgloszenia}</li>
                <li>rasa : ${newMessage.rasa}</li>
                <li>wielkość : ${newMessage.wielkosc}</li>
                <li>kolor sierści : ${newMessage.kolor_siersci}</li>
                <li>znaki szczególne : ${newMessage.znaki_szczegolne}</li>
                <li>Lokalizacja:${newMessage.lokalizacja} </li>
                </ul>
                <p>Pozostałe komentarze : </p>`;
                  var allfound = ``;
                  postsData.komentarze.map((comment, index) => {
                    if (postsData.komentarze.length - 1 !== index) {
                      comment.data_zgloszenia =
                        comment.data_zgloszenia || "nie określono";
                      comment.rasa = comment.rasa || "nie określono";
                      comment.wielkosc = comment.wielkosc || "nie określono";
                      comment.znaki_szczegolne =
                        comment.znaki_szczegolne || "nie określono";

                      comment.lokalizacja = "";
                      if (
                        comment.Szerokosc_Geograficzna == undefined ||
                        comment.Dlugosc_Geograficzna == undefined
                      ) {
                        comment.lokalizacja = "nie określono";
                      } else {
                        comment.lokalizacja = `<img src="https://api.mapbox.com/v4/mapbox.streets/pin-s-heart+285A98(${comment.Dlugosc_Geograficzna},${comment.Szerokosc_Geograficzna})/${comment.Dlugosc_Geograficzna},${comment.Szerokosc_Geograficzna},15/300x150.jpg80?access_token=pk.eyJ1IjoibWtsaW1lazE5OTciLCJhIjoiY2szd3Z4ZW9rMTA5ajNkb3B4cXd6ZW9wNSJ9.060xIr41HznBuJS_UYt1IA"/>
                  `;
                      }

                      allfound += `<ul>`;
                      allfound += `<li>adres e-mail : ${comment.adres_mail}</li>`;
                      allfound += `<li>data stworzenia : ${comment.data_zgloszenia}</li>`;
                      allfound += `<li>rasa : ${comment.rasa}</li>`;
                      allfound += `<li>wielkość : ${comment.wielkosc}</li>`;
                      allfound += `<li>kolor sierści : ${comment.kolor_siersci}</li>`;
                      allfound += `<li>znaki szczególne : ${comment.znaki_szczegolne}</li>`;
                      allfound += `<li>lokalizacja: ${comment.lokalizacja}</li>`;
                      allfound += `</ul><hr>`;
                    }
                  });
                  lostmessage =
                    lostmessage +
                    allfound +
                    "Po więcej informacji wejdź na naszą stronę.";
                  var message = {
                    from: "<findpetapp@hotmail.com>",
                    to: postsData.adres_mail,
                    subject:
                      "Pod twoim zgłoszeniem pojawił się nowy komentarze",
                    html: lostmessage,
                  };

                  transport.sendMail(message, (error) => {
                    if (error) {
                      console.log("Error occured");
                      console.log(error.message);
                    } else {
                      console.log("Message sent successfully!");
                    }
                  });
                }
              });
            }
          );
        },
      ],
      (err, results) => {
        if (err) {
          res.send({ status: "failed", message: err.message });
        } else {
          res.send({ status: "success", message: "Dodano post." });
        }
      }
    );
  } else {
    mysqlConnection.query(sqlAddPosts, values, (err, rows, fields) => {
      if (!err) res.send({ status: "success", message: "Dodano post." });
      else res.send({ status: "failed", message: err.message });
    });
  }
});

app.put("/posty", upload.array("zdjecia", 4), (req, res) => {
  let images_array = [];
  req.files.map((file) => {
    if (file.originalname !== undefined)
      images_array.push(file.path.replace(/\\/g, "/"));
    else images_array.push(null);
  });
  let body = req.body;
  let posts;
  let images;
  let arrayUpdateImages = [];
  let updateSql =
    "SET @id = ?;SET @idUżytkownik = ?;SET @idzwierzecia = ?;SET @tresc = ?; SET @komentarz = ?; SET @typ_zgloszenia = ?; SET @typ_zwierzecia = ?; SET @rasa = ?; SET @wielkosc = ?;SET @kolor_siersci = ?; SET @znaki_szczegolne = ?; SET @nagroda = ?;SET @data_time = ?; SET @data_zgloszenia = ?;  SET @Szerokosc_Geograficzna = ?; SET @Dlugosc_Geograficzna = ?;SET @obszar = ?;  SET @zdjecie1 = ?; SET @zdjecie2 = ?; SET @zdjecie3 = ?; SET @zdjecie4 = ?;call edytuj_zgloszenie(@id,@idUżytkownik,@idzwierzecia,@tresc,@komentarz,@typ_zgloszenia,@typ_zwierzecia,@rasa,@wielkosc,@kolor_siersci,@znaki_szczegolne,@nagroda,@data_zgloszenia,@data_time,@Szerokosc_Geograficzna,@Dlugosc_Geograficzna,@obszar,@zdjecie1,@zdjecie2,@zdjecie3,@zdjecie4)";
  let postsSql =
    "SET @id = ?;SELECT * FROM Posty posty JOIN zwierzeta zwierzeta ON posty.Zwierzeta_idZwierzecia = zwierzeta.idZwierzecia JOIN lokalizacja lokalizacja ON posty.idPosty = lokalizacja.Posty_idPosty WHERE posty.idPosty = @id;";
  let imagesSql =
    "SET @id = ?;SELECT * FROM zdjecia WHERE Posty_idPosty = @id;";
  async.parallel(
    [
      (callback) => {
        mysqlConnection.query(postsSql, body.id, (error, postsResult) => {
          posts = postsResult[1][0];
          callback(error, posts);
        });
      },
      (callback) => {
        mysqlConnection.query(imagesSql, body.id, (error, imagesResult) => {
          images = imagesResult[1];
          images.map((image) => arrayUpdateImages.push(image));
          callback(error, arrayUpdateImages);
        });
      },
    ],
    (err, results) => {
      if (err) {
        res.send({ status: "failed", message: err.message });
      } else {
        let values = [
          body.id,
          body.idUzytkownik || posts.Uzytkownicy_idUzytkownik,
          body.idzwierzecia || posts.Zwierzeta_idZwierzecia,
          body.tresc || posts.tresc,
          body.komentarz || posts.id_komentarz,
          body.typ_zgloszenia || posts.typ_zgloszenia,
          body.typ_zwierzecia || posts.typ_zwierzecia,
          body.rasa || posts.rasa,
          body.wielkosc || posts.wielkosc,
          body.kolor_siersci || posts.kolor_siersci,
          body.znaki_szczegolne || posts.znaki_szczegolne,
          body.nagroda || posts.nagroda,
          body.data_time || posts.data_time,
          body.data_zgloszenia || posts.data_zgloszenia,
          body.Szerokosc_Geograficzna || posts.Szerokosc_Geograficzna,
          body.Dlugosc_Geograficzna || posts.Dlugosc_Geograficzna,
          body.obszar || posts.obszar,
          images_array[0]
            ? images_array[0]
            : arrayUpdateImages[0]
            ? arrayUpdateImages[0].zdjecie
            : null,
          images_array[1]
            ? images_array[1]
            : arrayUpdateImages[1]
            ? arrayUpdateImages[1].zdjecie
            : null,
          images_array[2]
            ? images_array[2]
            : arrayUpdateImages[2]
            ? arrayUpdateImages[2].zdjecie
            : null,
          images_array[3]
            ? images_array[3]
            : arrayUpdateImages[3]
            ? arrayUpdateImages[3].zdjecie
            : null,
        ];

        for (var i = 0; i < 4; i++) {
          if (
            images_array[i] !== arrayUpdateImages[i] &&
            arrayUpdateImages[i] !== null
          ) {
            fs.unlinkSync(arrayUpdateImages[i].zdjecie);
            console.log("usunieto");
          }
        }

        mysqlConnection.query(updateSql, values, (err, result) => {
          if (!err) res.send("Zaktualizowano post");
          else {
            console.log(err);
            res.send({ status: "failed", message: err.message });
          }
        });
      }
    }
  );
});
