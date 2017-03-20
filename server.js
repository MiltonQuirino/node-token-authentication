// =================================================================
// get the packages we need ========================================
// =================================================================
var express 	= require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var cors		= require('cors');
var uuidV4 = require('uuid/v4');
app.use(cors());

var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var User   = require('./app/models/user'); // get our mongoose model
var GrupoRamo = require('./app/models/grupo-ramo'); // get our mongoose model

// =================================================================
// configuration ===================================================
// =================================================================
var port = process.env.PORT || 8080; // used to create, sign, and verify tokens
mongoose.connect(config.database); // connect to database
app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

var idGrupo = 0;

// =================================================================
// routes ==========================================================
// =================================================================
app.get('/setup', function(req, res) {

	// create a sample user
	var nick = new User({ 
		nome: 'fulano', 
		senha: 'fulano',
		email: 'fulano@fulano.com',
		admin: true 
	});
	nick.save(function(err) {
		if (err) throw err;

		console.log('User saved successfully');
		res.json({ success: true });
	});
});

app.get('/setup/grupo-ramo', function (req, res) {
	var grupos = [];

	grupos.push(createGrupoRamo(getId(), 1, 'Patrimonial', 'PATR'));
	grupos.push(createGrupoRamo(getId(), 2, 'Riscos Especiais', 'RIESP'));
	grupos.push(createGrupoRamo(getId(), 3, 'Responsabilidades', 'RESP'));
	grupos.push(createGrupoRamo(getId(), 5, 'Automóvel', 'AUTO'));
	grupos.push(createGrupoRamo(getId(), 6, 'Transportes', 'TRANSP'));
	grupos.push(createGrupoRamo(getId(), 7, 'Riscos Financeiros', 'RISFINAN'));
	grupos.push(createGrupoRamo(getId(), 10, 'Habitacional', 'HABIT'));

	saveList(grupos);	
	
	res.json({ success: true });
});

function getId() {
	return idGrupo++;
}

function createGrupoRamo(id, codigo, nome, apelido) {
	return new GrupoRamo({
		id: id, 
		criadoEm: new Date(), 
		atualizadoEm: new Date(),
		codigo: codigo,
		nome: nome,
		apelido: apelido,
		guid: uuidV4()
	});
}

function saveList(objects) {
	var object = objects.pop();

	if (object) {
		object.save(function(err) {
			if (err) throw err;

			console.log('Object saved successfully');
			saveList(objects);
		});
	}
}

function saveAllMongoose(objects) {

}

// basic route (http://localhost:8080)
app.get('/', function(req, res) {
	res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// ---------------------------------------------------------
// get an instance of the router for api routes
// ---------------------------------------------------------
var apiRoutes = express.Router(); 

// ---------------------------------------------------------
// authentication (no middleware necessary since this isnt authenticated)
// ---------------------------------------------------------
// http://localhost:8080/api/authenticate
apiRoutes.post('/authenticate', function(req, res) {

console.log("body da request!!1 123", req.body);
	// find the user
	User.findOne({
		email: req.body.email
	}, function(err, user) {

		console.log(err);
		if (err) throw err;

		if (!user) {
			res.json({ success: false, message: 'Authentication failed. User not found.' });
		} else if (user) {

			// check if password matches
			console.log('UserFound:', user);
			console.log('ReqUser:', req.body);
		
			if (user.senha !== req.body.senha) {
				res.json({ success: false, message: 'Authentication failed. Wrong password.' });
			} else {

				// if user is found and password is right
				// create a token
				var token = jwt.sign(user, app.get('superSecret'), {
					expiresIn: 86400 // expires in 24 hours
				});

				res.json({
					success: true,
					message: 'Enjoy your token!',
					usuario: {
						nome: user.nome,
						email: user.email,
						token: token
					}				
				});
			}		

		}

	});
});

// ---------------------------------------------------------
// route middleware to authenticate and check token
// ---------------------------------------------------------
apiRoutes.use(function(req, res, next) {

	// check header or url parameters or post parameters for token
	var token = req.body.token || req.param('token') || req.headers['x-access-token'];
	
	// decode token
	if (token) {

		// verifies secret and checks exp
		jwt.verify(token, app.get('superSecret'), function(err, decoded) {			
			if (err) {
				return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });		
			} else {
				// if everything is good, save to request for use in other routes
				req.decoded = decoded;	
				next();
			}
		});

	} else {

		// if there is no token
		// return an error
		return res.status(403).send({ 
			success: false, 
			message: 'No token provided.'
		});
		
	}
	
});

// ---------------------------------------------------------
// authenticated routes
// ---------------------------------------------------------
apiRoutes.get('/', function(req, res) {
	res.json({ message: 'Welcome to the coolest API on earth!' });
});

apiRoutes.get('/users', function(req, res) {
	User.find({}, function(err, users) {
		res.json(users);
	});
});

apiRoutes.get('/check', function(req, res) {
	res.json(req.decoded);
});

apiRoutes.get('/grupo-seguros', function(req, res) {
	GrupoRamo.find({}).sort({nome: 1}).exec(function(err, grupoSeguros) {
		res.json(grupoSeguros);
	});
});

apiRoutes.get('/grupo-seguros/:guid', function(req, res) {
	var guid = req.params.guid;
	console.log("GUID:", guid);
	GrupoRamo.findOne({guid: guid}, function(err, grupoSeguros) {
		res.json(grupoSeguros);
	});
});

apiRoutes.put('/grupo-seguros/:guid/editar', function(req, res) {
	var guid = req.params.guid;
	console.log("BODY", req.body);
	var newGrupoSeguros = {
		codigo: req.body.codigo,
		nome: req.body.nome,
		apelido: req.body.apelido,
		atualizadoEm: new Date()
	};

	// console.log("OBJETO NOVO:", newGrupoSeguros);

    GrupoRamo.findOne({guid: guid}).then((grupoSeguros) => {
        return Object.assign(grupoSeguros, newGrupoSeguros);
    }).then((model) => {
        return model.save();
    }).then((updatedModel) => {
		var model = {
			guid: updatedModel.guid,
			codigo: updatedModel.codigo,
			nome: updatedModel.nome,
			apelido: updatedModel.apelido
		};
		
        res.json({
            msg: 'model updated',
            updatedModel: model
        });
    }).catch((err) => {
        res.send(err);
    });
});


app.use('/api', apiRoutes);

// =================================================================
// start the server ================================================
// =================================================================
app.listen(port);
console.log('Magic happens at http://localhost:' + port);
