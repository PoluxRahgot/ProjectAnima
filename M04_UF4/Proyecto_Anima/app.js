var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');

//A lo mejor he de comentar estas dos lineas de abajo
//var index = require('./routes/index');
//var users = require('./routes/users');

/*
var db = require('knex')({
    client: 'sqlite',
    connection: {
        filename: "./Anima_Libros.db"
    },
    useNullAsDefault: true
});
*/

var passport = require('passport');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var jwt = require('jsonwebtoken');

var bcrypt = require('bcrypt');
const saltRounds = 10;

//Quizas el password esta equivocado, es un posible error
const dbUrl = "mongodb://pene:pene@ds137019.mlab.com:37019/anima_libros?authMechanism=SCRAM-SHA-1";
const db = require('monk')(dbUrl);

const libros = db.get('Anima_Libros');
const users = db.get('users');

var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
opts.secretOrKey = "pene";

passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
    users.findOne({"_id": jwt_payload._id})
        .then(function (user) {
            if(user){
                done(null, user);
            } else {
                done(null, false);
            }
        }).catch(function (error){
            console.log("ERROR " + error);
    });
}));

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());

/*
app.use('/', index);
app.use('/users', users);
*/

app.post('/api/auth/register', function (req, res) {
   var data = req.body;

   if (!data.username || !data.password) {
       res.json({success: false, msg: 'Eres tonto pon un usuario y/o contraseña antes de dar a enter'});
   } else {
       users.findOne({username: data.username})
           .then(function (user) {
               console.log(user);

               if (!user){

                   bcrypt.hash(data.password, saltRounds, function(err, hash) {
                       data.password = hash;

                       users.insert(data);
                   });

                   return res.json({success: true, msg: 'Usuario creado.'});
               } else {
                   return res.json({success: false, msg: 'Usuario ya existente'});
               }
           });
   }
});

app.post('/api/auth/login', function (req, res) {
    var data = req.body;
    console.log("ENTRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa");
    console.log(data);
    users.findOne({username: data.username})
        .then(function (user){
            console.log(user);
            if (!user){
                res.status(401).send({success: false, msg: 'Usuario no encontrado'});
            } else {
                bcrypt.hash(data.password, saltRounds, function(err, hash) {
                    console.log("1");
                    console.log(hash);
                });
                console.log("2");
                console.log(data.password)
                console.log("3");
                console.log(user.password)

                if (bcrypt.compareSync(data.password, user.password)){
                    console.log("comparacion correcta");
                //data.password = bcrypt.genSaltSync(saltRounds);
                //if (data.password === user.password){
                    var token = jwt.sign(
                        {
                            "_id": user._id,
                            "username": user.username
                        },
                        opts.secretOrKey
                    );

                    //Falla aqui porque no se define el result
                    res.json({success: true, token: 'JWT ' + token});
                } else {
                    res.status(401).send({success: false, msg: 'Contrasenya erronea'})
                }
            }
        })
});

app.get('/api/Anima', function (req, res) {
    //db.select().from("Anima_Libros")
    libros.find({})
        .then(function (data) {
            console.log(data);
            res.json({Anima_Libros: data});
        }).catch(function (error){
        console.log(error);
    });
});

app.post('/api/Anima', function (req, res) {
    var data = req.body;

    //db.insert(data).into("Anima_Libros")
    libros.insert(data)
        .then(function (data) {
            res.json({Anima_Libros: data});
        }).catch(function (error) {
        console.log(error);
    });
});

app.get('/api/Anima/:id', function (req, res) {
    var id = req.params.id;

    //db.select().from("Anima_Libros").where("id", id)
    libros.find({"_id": id})
        .then(function (data) {
            res.json(data);
        }).catch(function (error){
        console.log(error);
    });
});

app.post('/api/Anima/:id', function (req, res) {
    var id = req.params.id;
    var data = req.body;

    //db("Anima_Libros").update(data).where("id", id)
    libros.update({"_id": id}, data)
        .then(function (data) {
            res.json(data);
        }).catch(function (error) {
        console.log(error);
    });
});

/*
app.delete('/api/Anima/:id', function (req, res) {
    var id = parseInt(req.params.id);

    db.delete().from("Anima_Libros").where("id", id)
        .then(function (data) {
            res.json(data);
        }).catch(function (error) {
        console.log(error)
    });
});
*/

/*
app.delete('/api/Anima/:id', passport.authenticate('jwt', {session: false}), function (req, res) {
    var _id = req.params.id;

    db.delete().from("Anima_Libros").where("id", id);
    libros.remove({"_id": _id})
        .then(function (data) {
            res.json(data);
        }).catch(function (error) {
        console.log(error);
    });
});
*/


app.delete('/api/Anima/:id', passport.authenticate('jwt', {session: false}), function (req, res) {
    if (req.user) {
        let id = req.params.id;


        libros.remove({"_id": id})
            .then(function (data) {
                console.log(data);
                res.json(data);
            }).catch(function (error){
                console.log("ERROR "+error);
        });
    } else {
        return res.status(403).send({success: false, msg: 'No autorizado'})
    }
});

/*app.post('/api/form', function (req, res) {
    var id = parseInt(req.params.id);
    var data = req.body;

    db("form").insert(data).where("id", id)
        .then(function (data) {
            res.json(data);
        }).catch(function (err) {
        console.log(err);
    });
});*/

app.get('/rss', function (req, res) {
    db.select().from("Anima_Libros")
        .then(function (data) {
            console.log(data);
            var rss =
                `<?xml version="1.0" encoding="UTF-8" ?>
                    <rss version="2.0">

                    <channel>
                        <title>Anima_Libros</title>
                        <link>localhost</link>
                        <description>Anima_Libros</description>`;

            for (var i = 0; i < data.length; i++) {
                rss += `
                            <item>
                                <title>${data[i].Titulo}</title>
                                <date>${data[i].Ano}</date>
                                <pages>${data[i].Paginas}</pages>
                                <theme>${data[i].Temas}</theme>
                            </item>`;
            }
            rss += `
                    </channel>
                    </rss>`;
            res.set('Content-Type', 'text/xml');
            res.send(rss);
        }).catch(function (error) {
        console.log(error);
    });
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;