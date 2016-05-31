var models = require('../models');
var Sequelize = require('sequelize');
var url = require('url');
var userController = require('./user_controller');

var timeLogin;

// Middleware: Se requiere hacer login.
//
// Si el usuario ya hizo login anteriormente entonces existira 
// el objeto user en req.session, por lo que continuo con los demas 
// middlewares o rutas.
// Si no existe req.session.user, entonces es que aun no he hecho 
// login, por lo que me redireccionan a una pantalla de login. 
// Guardo en redir cual es mi url para volver automaticamente a 
// esa url despues de hacer login; pero si redir ya existe entonces
// conservo su valor.
// 
exports.loginRequired = function (req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/session?redir=' + (req.param('redir') || req.url));
    }
};

// MW que permite gestionar un usuario solamente si el usuario logeado es:
//   - admin 
//   - o es el usuario a gestionar.
exports.adminOrMyselfRequired = function(req, res, next){

    var isAdmin      = req.session.user.isAdmin;
    var userId       = req.user.id;
    var loggedUserId = req.session.user.id;

    if (isAdmin || userId === loggedUserId) {
        next();
    } else {
      console.log('Ruta prohibida: no es el usuario logeado, ni un administrador.');
      res.send(403);    }
};

// MW que permite gestionar un usuario solamente si el usuario logeado es:
//   - admin
//   - y no es el usuario a gestionar.
exports.adminAndNotMyselfRequired = function(req, res, next){

    var isAdmin      = req.session.user.isAdmin;
    var userId       = req.user.id;
    var loggedUserId = req.session.user.id;

    if (isAdmin && userId !== loggedUserId) {
        next();
    } else {
      console.log('Ruta prohibida: no es el usuario logeado, ni un administrador.');
      res.send(403);    }
};

var authenticate = function(login, password){
	return models.User.findOne({ where: {username: login }})
			.then(function(user){
				if (user && user.verifyPassword(password)){
					return user;
				} else {
					return null;
				}
			});
};

//GET /session --Formulario de login
exports.new = function(req, res, next){
	var redir = req.query.redir || url.parse(req.headers.referer || "/").pathname;
	if (redir === '/session' || redir === '/users/new'){
		redir = "/";
	}
	res.render('session/new', { redir: redir });
};

//POST /session --Crear sesion
exports.create = function(req, res, next){
	var redir = req.body.redir || '/';
	var login = req.body.login;
	var password = req.body.password;
	var fecha = new Date();
	var expiracion = fecha.getMinutes();

	authenticate(login, password)
		.then(function(user){
			if(user) {
				timeLogin = (new Date().getMinutes() * 60) + new Date().getSeconds() ;
				req.session.user = { 	id: user.id,
										username: user.username, 
										timeLogin: timeLogin + 120,
										isAdmin:user.isAdmin};
				res.redirect(redir); //redirección a redir
			}else {
				req.flash('error', 'La autenticación ha fallado. Reinténtalo otra vez.');
				res.redirect("/session?redir=" + redir);
			}
		})
		.catch(function(error){
			req.flash('error', 'Se ha producido un error: ' + error);
			next(error);
		});
};

exports.logout = function(req, res, next){

	if(!req.session.user){
		next();
	}else{
		if( ((new Date().getMinutes() * 60) + new Date().getSeconds() ) >= (req.session.user.timeLogin )){
  			delete req.session.user;
  			next();
   		}else{
			req.session.user.timeLogin = (new Date().getMinutes() * 60) + new Date().getSeconds() + 120;
  			next();
  		}
 	}
};


//DELETE /session --destruir sesion
exports.destroy = function(req, res, next){
	delete req.session.user;
	res.redirect("/session"); //redirect a login
};