var models = require('../models');
var Sequelize = require('sequelize');
var cloudinary = require('cloudinary');
var fs = require('fs');

// Opciones para imagener subidas a cloudinary
var cloudinary_image_options = {crop: 'limit' , width : 200 , height :200 , radius:5 ,
                         border : "3px_solid_blue", tags: ['core', 'mi-quiz-16-rsanchez15']};

//Autoload el quiz asociado a :quizId
exports.load = function(req,res,next, quizId){
	
 models.Quiz.findById(quizId, {attributes: ['id', 'question', 'answer', 'AuthorId'], include: [   {model: models.Comment, include: [ 
                                      {model: models.User, as: 'Author', attributes: ['username']}]},   models.Attachment, 
                                      {model: models.User, as: 'Author', attributes: ['username']} ] })
		.then(function(quiz) {
			if (quiz){
				req.quiz = quiz;
				next();
			} else {
				next( new Error('No existe el quizId=' + quizId));
			}
		}).catch(function(error){next(error); });
};

// MW que permite acciones solamente si al usuario logeado es admin o es el autor del quiz.
exports.ownershipRequired = function(req, res, next){

    var isAdmin      = req.session.user.isAdmin;
    var quizAuthorId = req.quiz.AuthorId;
    var loggedUserId = req.session.user.id;

    if (isAdmin || quizAuthorId === loggedUserId) {
        next();
    } else {
      console.log('Operación prohibida: El usuario logeado no es el autor del quiz, ni un administrador.');
      res.send(403);
    }
};

//GET /quizes/new
exports.new = function (req, res, next) {
	var quiz = models.Quiz.build({question: "", answer: ""});
	res.render('quizes/new', {quiz: quiz});
};

// MW que permite acciones solamente si al usuario logeado es admin o es el autor del quiz.
exports.ownershipRequired = function(req, res, next){

    var isAdmin      = req.session.user.isAdmin;
    var quizAuthorId = req.quiz.AuthorId;
    var loggedUserId = req.session.user.id;

    if (isAdmin || quizAuthorId === loggedUserId) {
        next();
    } else {
      console.log('Operación prohibida: El usuario logeado no es el autor del quiz, ni un administrador.');
      res.send(403);
    }
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

		if (!req.file) { 
            req.flash('info', 'Es un Quiz sin imagen.');
            return; 
        }    

        // Salvar la imagen en Cloudinary
        return uploadResourceToCloudinary(req)
        .then(function(uploadResult) {
            // Crear nuevo attachment en la BBDD.
            return createAttachment(req, uploadResult, quiz);
        });


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

		// Sin imagen: Eliminar attachment e imagen viejos.
        if (!req.file) { 
            req.flash('info', 'Tenemos un Quiz sin imagen.');
            if (quiz.Attachment) {
                cloudinary.api.delete_resources(quiz.Attachment.public_id);
                return quiz.Attachment.destroy();
            }
            return; 
        }  

        // Salvar la imagen nueva en Cloudinary
        return uploadResourceToCloudinary(req)
        .then(function(uploadResult) {
            // Actualizar el attachment en la BBDD.
            return updateAttachment(req, uploadResult, quiz);
        });


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
	if (req.quiz.Attachment) {
        cloudinary.api.delete_resources(req.quiz.Attachment.public_id);
    }

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
			models.Quiz.findAll({include: [models.Attachment, {model: models.User, as: 'Author', attributes: ['username']}]}) //Busca la primera pregunta
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


function createAttachment(req, uploadResult, quiz) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    return models.Attachment.create({ public_id: uploadResult.public_id,
                                      url: uploadResult.url,
                                      filename: req.file.originalname,
                                      mime: req.file.mimetype,
                                      QuizId: quiz.id })
    .then(function(attachment) {
        req.flash('success', 'Imagen nueva guardada con éxito.');
    })
    .catch(function(error) { // Ignoro errores de validacion en imagenes
        req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
        cloudinary.api.delete_resources(uploadResult.public_id);
    });
}


function updateAttachment(req, uploadResult, quiz) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    // Recordar public_id de la imagen antigua.
    var old_public_id = quiz.Attachment ? quiz.Attachment.public_id : null;

    return quiz.getAttachment()
    .then(function(attachment) {
        if (!attachment) {
            attachment = models.Attachment.build({ QuizId: quiz.id });
        }
        attachment.public_id = uploadResult.public_id;
        attachment.url = uploadResult.url;
        attachment.filename = req.file.originalname;
        attachment.mime = req.file.mimetype;
        return attachment.save();
    })
    .then(function(attachment) {
        req.flash('success', 'Imagen nueva guardada con éxito.');
        if (old_public_id) {
            cloudinary.api.delete_resources(old_public_id);
        }
    })
    .catch(function(error) { // Ignoro errores de validacion en imagenes
        req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
        cloudinary.api.delete_resources(uploadResult.public_id);
    });
}


function uploadResourceToCloudinary(req) {
    return new Promise(function(resolve,reject) {
        var path = req.file.path;
        cloudinary.uploader.upload(path, function(result) {
                fs.unlink(path); // borrar la imagen subida a ./uploads
                if (! result.error) {
                    resolve({ public_id: result.public_id, url: result.secure_url });
                } else {
                    req.flash('error', 'No se ha podido salvar la nueva imagen: '+result.error.message);
                    resolve(null);
                }
            },
            cloudinary_image_options
        );
    })
}