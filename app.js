var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var morgan = require('morgan');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('./config/database');


var index = require('./routes/index');
var users = require('./routes/users');

var app = express();



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


mongoose.connect(config.database);
var api = require('./routes/api');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(passport.initialize());

var sockIO = require('socket.io')();
app.sockIO = sockIO;
var jwt = require('jsonwebtoken');

var User = require("./models/user");


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.get('/', function(req, res) {
//   res.send('Page under construction.');
// });

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use('/api', api);

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


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


sockIO.use(function(socket, next){  
  if (socket.handshake.query && socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token, 'nodeauthsecret', function(err, decoded) {

      console.log(decoded);
      console.log("^^");

      if(err) { 
        return next(new Error('Authentication error'));
      }


    User.findOne({
      username: decoded.username
    }, function(err, user) {
      console.log(user);
      console.log("user^^");
        if (err) {
            console.log('error');
            console.log(err);
            throw err;
        }
        if (!user) {
            return next(new Error('Authentication error'));
        } else {
          // check if password matches
          console.log("user pass: "+user.password);
          console.log("decoded pass: "+decoded.password);

          if(user.password === decoded.password) {
               // if user is found and password is right create a token
                console.log('valid');
                socket.decoded = decoded;
                next();
            } else {
              // res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
              return next(new Error('Authentication error'));
            }

          // user.comparePassword(decoded.password, function (err, isMatch) {
          //   if (isMatch && !err) {
          //     // if user is found and password is right create a token
          //       console.log('valid');
          //       socket.decoded = decoded;
          //       next();
          //   } else {
          //     // res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
          //     return next(new Error('Authentication error'));
          //   }
          // });
        }
      });

      console.log('test');
      console.log(err);
      console.log(decoded);

    
   
    });
  } 
  // else {
  //     next(new Error('Authentication error'));
  // }    
})

var userSockets = [];

sockIO.on('connection', function(socket){
  var socketId = socket.id;
  userSockets.push(socketId);
  console.log("On connect: UserSockets");
  console.log(userSockets);
  sockIO.emit('chat message', 'connection established '+socketId);
  
  socket.on('chat message', function(msg){
    sockIO.emit('chat message', msg);
  });
  
   socket.on('disconnect', function(){
     
      for(var i=0; i < userSockets.length; i++){
          if(userSockets[i] === socket.id){
              userSockets.splice(i,1); 
          }
        }
            
    console.log("On disconnect: UserSockets");
    console.log(userSockets);
    console.log('user disconnected');
  });
  
});



// sockIO.on('connection', function(socket){
//   socket.on('chat message', function(msg){
//     sockIO.emit('chat message', msg);
//   });
// });

module.exports = app;
