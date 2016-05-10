var express = require('express');
var router = express.Router();

var quizController =  require('../controllers/quiz_controller');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});


//Autoload de rutas que usen :quizId
router.param('quizId', quizController.load); //autoload :quizId

//Ruta pagina del autor
router.get('/author',  						quizController.author);

//Definición de rutas de /quizes
router.get('/quizes', 						quizController.index);
router.get('/quizes/:quizId(\\d+)', 		quizController.show);
router.get('/quizes/:quizId(\\d+)/check', 	quizController.check);
router.get('/quizes/new',					quizController.new);
router.post('/quizes',						quizController.create);

module.exports = router;
