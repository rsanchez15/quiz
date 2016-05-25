var models = require('../models');
var Sequelize = require('sequelize');

//Autoload el quiz asociado a :quizId
exports.load = function(req,res,next, quizId){
	models.Quiz.findById(quizId, {include: [ models.Comment ] })
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
	var authorId = req.session.user && req.session.user.id || 0;
	var quiz = models.Quiz.build( {	question: req.body.quiz.question,
									answer: req.body.quiz.answer,
									AuthorId: authorId });

	//gaurda en la BD los campos pregunta y respuesta quiz
	quiz.save({fields: ["question", "answer", "AuthorId"]})
	.then(function(quiz){
		req.flash('success', 'Quiz creado con éxito.');
		res.redirect('/quizes'); //res.redirect: Redirección HTTP a la lista de preguntas
	}).catch(Sequelize.ValidationError, function(error){
		req.flash('error', 'Errores en el formulario:');
		for (var i in error.errors) {
			req.flash('error', error.errors[i].value);
		};

		res.render('quizes/new', {quiz: quiz});
	}).catch(function(error){
		req.flash('error', 'Error al crear un Quiz: ' + error.message);
		next(error);
	});

};

//GET /quizes/:id/edit
exports.edit = function (req, res, next) {
	var quiz = req.quiz; //req.quiz de autoload de instacia de quiz
	res.render('quizes/edit', {quiz: quiz});
};

//PUT /quizes/:id
exports.update = function(req, res, next){
	req.quiz.question = req.body.quiz.question; //utilizamos autoload
	req.quiz.answer = req.body.quiz.answer;

	req.quiz.save({fields: ["question", "answer"]})
	.then (function(quiz){
		req.flash("success", "Quiz editado con éxito.");
		res.redirect('/quizes'); //Redirección HTTP a lista de preguntas
	}).catch(Sequelize.ValidationError, function(error){
		req.flash('error','Errores en el formulario:');
		for (var i in error.errors[i].value){
			reque.flash('error', error.errors[i].value);
		};
		res.render('quizes/edit', {quiz: req.quiz});
	}).catch(function(error){
		req.flash('error','Erroror al editar el Quiz: ' + error.message);
		next(error);
	});
};

//DELETE /quizes/:id
exports.destroy = function(req,res,next){
	req.quiz.destroy()
	.then(function() {
		req.flash('success', 'Quiz borrado con éxito.');
		res.redirect('/quizes');
	}).catch(function(error){
		req.flash('error', 'Error al editar el Quiz: ' + error.message);
		next(error);
	});
};

//GET /quizes
exports.index = function(req, res, next){
	var format = req.params.format || ".html";

	if (format === '.html'){
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

	}else if (format === '.json'){
		models.Quiz.findAll()
		.then(function(quizes){
			res.send(JSON.stringify(quizes));
		}).catch(function(error){
			req.flash('error', 'Error al solicitar el JSON del Quiz');
			next(error);
		});
	}else {
		next( new Error('Error de formato'));
	}
};

//GET /quizes/:id
exports.show = function(req, res,next){
	var format = req.params.format || ".html";
	var answer = req.query.answer || '';
	if (format === '.html'){
		res.render('quizes/show', {	quiz: req.quiz,
									answer : answer});

	}else if (format === '.json'){
		models.Quiz.findAll(
		).then(function(quizes){
			res.send(JSON.stringify(req.quiz));
		}).catch(function(error){
			req.flash('error', 'Error al solicitar el JSON del Quiz');
			next(error);
		});

	}else {
		next( new Error('Error de formato'));
	}
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