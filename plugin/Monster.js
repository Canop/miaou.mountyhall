var Animal = require('./abstract.js').Animal;

function Monster(id){
	this.id = id;
	this.init();
}

Monster.prototype = new Animal;

module.exports = Monster;
