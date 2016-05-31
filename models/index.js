var path = require('path');

//Cargar Modelo ORM
var Sequelize = require('sequelize');

//Usar BBDD SQLite:
//	DATABASE_URL = sqlite:///
//	DATABASE_STORAGE = quiz.sqlite
//Usar BBDD Postgres:
//	DATABASE_URL = postgres://user:passwd@host:port/database
var url, storage;

if(!process.env.DATABASE_URL){
	url = "sqlite:///";
	storage = "quiz.sqlite";
} else {
	url = process.env.DATABASE_URL;
	storage = process.env.DATABASE_STORAGE || "";
}

var sequelize = new Sequelize(url,
						{ storage: storage, omitNull: true}
					);

//Importar la definiión de la tabla Quiz de quiz.js
var Quiz = sequelize.import(path.join(__dirname,'quiz'));

//Importar la definición de la tabla Comments de comment.js
var Comment = sequelize.import(path.join(__dirname,'comment'));

//Importar la definición de la tabla Users de user.js
var User = sequelize.import(path.join(__dirname,'user'));


/*//sequelize.sync() crea en inicializa la tabla de preguntas en DB
sequelize.sync().then(function() { 		//sync() crea la tabla quiz
	Quiz.count().then(function (c) {
		if (c===0) {	//la tabla se inicializa si está vacía
			Quiz.bulkCreate ([	{ question: 'Capital de Italia', answer: 'Roma'},
								{ question: 'Capital de Portugal', answer: 'Lisboa'}
							])
					.then(function() {
					console.log('Base de datos inicializada con datos');
				});
		}
	});
}).catch(function(error) {
	console.log("Error Sincronizando las tablas de la BBDD:", error);
	process.exit(1);
});*/

// Relacion 1 a N entre Quiz y Comments
Comment.belongsTo(Quiz);
Quiz.hasMany(Comment);

// Relacion 1 a N entre User y Quiz
User.hasMany(Quiz, {foreignKey: "AuthorId"});
Quiz.belongsTo(User, {as: 'Author', foreignKey: 'AuthorId'});

// Relacion 1 a N entre User y Comments
User.hasMany(Comment, {foreignKey: "AuthorId"});
Comment.belongsTo(User, {as: "Author", foreignKey: "AuthorId"});

exports.Quiz = Quiz; //exportar la definición de la tabla Quiz
exports.Comment = Comment; //exportar la definición de la tabla Comment
exports.User = User; //exportar la definición de la tabla User