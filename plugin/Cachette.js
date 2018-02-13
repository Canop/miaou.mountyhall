var	bench = require("../../libs/bench.js"),
	rex = require("../../libs/rex.js"),
	utils = require("./utils.js");

const	searchRegex = rex`
		Vous êtes en X = (-)?(\d)?(\d) Y = (-)?(\d)?(\d) N = (-)?(\d)?(\d)[^\w]+
		Vous n'avez pas trouv. la cachette de la carte \((\d+)\)\.[^\w]+
		Mais voici quelques indications[^\w]+
		Vous .{1,3}tes(\spas)? dans le bon Xcoin[^\w]+
		Vous .{1,3}tes(\spas)? dans le bon Ycoin[^\w]+
		Vous avez retrouvé (\d+) chiffres? de la caverne
		`,
	deathRegexEnd = "[\\s\\S]*?J.ai .t. tu. en X = (-?)(\\d)?(\\d) Y = (-?)(\\d)?(\\d) N = -?(\\d)?(\\d)";

function Cachette(id){
	this.id = id;
	this.searches = [];
	this.searchesSet = new Set; // contains the digits as string, for faster deduplication
	this.deathRegex = new RegExp(this.id+deathRegexEnd);
}
module.exports = Cachette;
var fn = Cachette.prototype;

fn.parse = function(message){
	var m = message.content.match(this.deathRegex);
	if (m) {
		this.digits = [+m[2]||0, +m[3], +m[5]||0, +m[6], +m[7]||0, +m[8]];
		return;
	}
	m = message.content.match(searchRegex);
	if (!m) {
		return;
	}
	if (m[10]!=this.id) return;
	var search = {
		message: '['+message.authorname+' '+utils.formatTime(message.created)+'](#'+message.id+')',
		digits: [+m[2]||0, +m[3], +m[5]||0, +m[6], +m[8]||0, +m[9]],
		xcoin: !m[11] == !m[1] ? "+" : "-",
		ycoin: !m[12] == !m[4] ? "+" : "-",
	 	nbDigits: +m[13]
	};
	var key = search.digits.join("");
	if (this.searchesSet.has(key)) {
		return;
	}
	this.searchesSet.add(key);
	this.searches.push(search);
}

function nbEquals(arr1, arr2){
	var equals = 0;
	for (var i=0; i<6; i++) {
		if (arr1[i]===arr2[i]) equals++;
	}
	return equals;
}

fn.findPossibleLocations = function(){
	if (!this.digits || !this.searches.length) return;
	var	digits = this.digits.slice(),
		locations = this.possibleLocations = [],
		set = new Set,
		searches = this.searches;
	function swap(i, j){
		var t = digits[i];
		digits[i] = digits[j];
		digits[j] = t;
	}
	function permute(k){
		for (var i=k; i<6; i++) {
			swap(i, k);
			permute(k+1);
			swap(k, i);
		}
		if (k!==5) return;
		var key = digits.join("");
		if (set.has(key)) return;
		set.add(key);
		// Ici, digits est l'une des 720 possibles combinaisons de chiffres
		for (var j=searches.length; j-->0;) {
			if (nbEquals(searches[j].digits, digits) != searches[j].nbDigits) return;
		}
		locations.push(digits.slice());
	}
	permute(0);
}

fn.findXYCoins = function(){
	if (!this.digits || !this.searches.length) return;
	// pour l'instant on va supposer que les recherches sont cohérentes
	this.xneg = this.searches[0].xcoin === "-";
	this.yneg = this.searches[0].ycoin === "-";
}

fn.mdDigits = function(){
	return "Chiffres:" + this.digits.join(" ") + "\n";
}

fn.mdSearches = function(){
	return "## Recherches:\n"+
	"message|x|y|z|chiffres\n"+
	":-:|:-:|:-:|:-:|:-:\n"+
	this.searches.map(s=>
		s.message + "|"
		+s.digits[0]+s.digits[1] + "|"
		+s.digits[2]+s.digits[3] + "|"
		+s.digits[4]+s.digits[5] + "|"
		+s.nbDigits+"\n"
	).join("");
}

fn.mdPossibleLocations = function(){
	if (!this.possibleLocations) return "";
	var n = this.possibleLocations.length;
	if (n>12) return n + " possibilités\n";
	var r = "## " + n + " Possibilités:\n";
	for (var i=0; i<n; i++) {
		var loc = this.possibleLocations[i];
		r += "* X=";
		if (this.xneg) r+="-";
		r += loc[0]||"";
		r += loc[1];
		r += " Y=";
		if (this.yneg) r+="-";
		r += loc[2]||"";
		r += loc[3];
		r += " N=-";
		r += loc[4]||"";
		r += loc[5];
		r += "\n";
	}
	return r;
}

fn.mdReport = function(){
	var r = "*oukonenest* carte " + this.id + ":\n";
	if (!this.digits) {
		return r + "Je n'ai pas trouvé de message contenant le texte de la carte";
	} else if (!this.searches.length) {
		return r + "Je n'ai pas trouvé de message de recherche de carte";
	}
	r += this.mdDigits();
	r += this.mdSearches();
	r += this.mdPossibleLocations();
	return r;
}

fn.reply = function(messages, ct){
	var benchOperation = bench.start("MountyHall / !!oukonenest / Cachette");
	for (var i=messages.length; i--;) this.parse(messages[i]);
	this.findPossibleLocations();
	this.findXYCoins();
	var md = this.mdReport();
	benchOperation.end();
	ct.reply(md);
}

