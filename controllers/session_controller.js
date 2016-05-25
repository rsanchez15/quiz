var models = require('../models');
var Sequelize = require('sequelize');
var url = require('url');
var userController = require('./user_controller');

var timeLogin;

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
										timeLogin: timeLogin + 120};
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