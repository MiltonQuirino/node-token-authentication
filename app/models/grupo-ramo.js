var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model
module.exports = mongoose.model('GrupoRamo', new Schema({ 
	id: Number, 
	criadoEm: Date, 
	atualizadoEm: Date,
    codigo: String,
    nome: String,
    apelido: String,
    guid: String
}));