var Animal = require('./abstract.js').Animal;

function Troll(id){
	this.id = id;
	this.init();
}

Troll.prototype = new Animal;

module.exports = Troll;
