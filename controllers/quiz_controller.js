var models = require('../models');

//Autoload el quiz asociado a :quizId
exports.load = function(req,res,next, quizId){
	models.Quiz.findById(quizId)
		.then(function(quiz) {
			if (quiz){
				req.quiz = quiz;
				next();
			} else {
				next( new Error('No existe el quizId=' + quizId));
			}
		}).catch(function(error){next(error); });
};

//GET /quizes/new
exports.new = function (req, res, next) {
	var quiz = models.Quiz.build({question: "", answer: ""});
	res.render('quizes/new', {quiz: quiz});
};

//POST /quizes/create
exports.create = function(req, res, next){
	var quiz = models.Quiz.build( {	question: req.body.quiz.question,
									answer: req.body.quiz.answer});

	//gaurda en la BD los campos pregunta y respuesta quiz
	quiz.save({fields: ["question", "answer"]})
	.then(function(quiz){
		req.flash('success', 'Quiz creado con éxito.');
		res.redirect('/quizes'); //res.redirect: Redirección HTTP a la lista de preguntas
	}).catch(function(error){
		req.flash('error', 'Error al crear un Quiz: ' + error.message);
		next(error);
	});

};

//GET /quizes
exports.index = function(req, res, next){
	if(!req.query.search){
		models.Quiz.findAll() //Busca la primera pregunta
		.then (function(quizes) {
			res.render('quizes/index.ejs', {quizes: quizes})
		}).catch(function(error) { next(error); });
	}else {
		models.Quiz.findAll({
			where: ["question like ?", "%" + req.query.search.split(" ").join("%") + "%"]
		}).then(function(quizes){
			var busqueda = req.query.search;
        	res.render( 'quizes/index', { quizes: quizes.sort(), busqueda: busqueda});
		}).catch(function(error) { next(error); });
	}
};

//GET /quizes/:id
exports.show = function(req, res,next){
	var answer = req.query.answer || '';
	res.render('quizes/show', {	quiz: req.quiz,
								answer : answer});
};

//GET /quizes/:id/check
exports.check = function(req,res,next){
	var answer = req.query.answer || '';
	var result = answer === req.quiz.answer ? 'Correcta' : 'Incorrecta';
	res.render('quizes/result', {	quiz: req.quiz,
									result: result,
									answer: answer});
};

//GET /author
exports.author = function(req,res,next){
	res.render('author', { title: 'Quiz' });
};