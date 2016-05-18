var express = require('express');
var router = express.Router();

var quizController =  require('../controllers/quiz_controller');
var commentController = require('../controllers/comment_controller');
var userController = require('../controllers/user_controller');
var sessionController = require('../controllers/session_controller');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});


//Autoload de parametros
router.param('quizId', quizController.load); //autoload :quizId
router.param('userId', userController.load); //autoload :userId


//Ruta pagina del autor
router.get('/author',  								quizController.author);

//Definición de rutas de /quizes
router.get('/quizes:format?', 						quizController.index);
router.get('/quizes/:quizId(\\d+):format?', 		quizController.show);
router.get('/quizes/:quizId(\\d+)/check', 			quizController.check);
router.get('/quizes/new',							quizController.new);
router.post('/quizes',								quizController.create);
router.get('/quizes/:quizId(\\d+)/edit', 			quizController.edit);
router.put('/quizes/:quizId(\\d+)', 				quizController.update);
router.delete('/quizes/:quizId(\\d+)',				quizController.destroy);
//Definicion de rutas de comentarios
router.get('/quizes/:quizId(\\d+)/comments/new',	commentController.new);
router.post('/quizes/:quizId(\\d+)/comments', 		commentController.create);
//Definicion de rutas de cuenta
router.get('/users', 								userController.index);	//listado de usuarios
router.get('/users/:userId(\\d+)', 					userController.show);	//ver un usuario
router.get('/users/new',							userController.new);	//formulario sign in
router.post('/users',								userController.create);	//registrar usuario
router.get('/users/:userId(\\d+)/edit', 			userController.edit);	//editar cuenta
router.put('/users/:userId(\\d+)', 					userController.update);	//actualizar cuenta
router.delete('/users/:userId(\\d+)',				userController.destroy);//borrar cuenta
//Definicion de rutas de sesion
router.get('/session',								sessionController.new); 	//formulario de login
router.post('/session',								sessionController.create);	//crear tu sesion
router.delete('/session',							sessionController.destroy);	//destruir tu sesion

module.exports = router;
