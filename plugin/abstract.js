// Analyse des messages concernant un monstre afin d'en tirer les infos nécessaires
//  pour la chasse (pv, esquive, résultats frappes précédentes, etc.).
// TODO kill à la rune

var	bench = require("../../libs/bench.js"),
	utils = require("./utils.js");

/*eslint-disable max-len*/
var patterns = [
	{re:/ONNAISSANCE DES MONSTRES sur une?\s+([^\(]+)\s+\((\d+)\)/i, clear:true, res:['nom', 'id'], vals:{cdm:'ok'}},
	{re:/NALYSE ANATOMIQUE sur ([^\(]+)\s+\((\d+)\)/i, clear:true, res:['nom', 'id'], vals:{aa:'ok'}},
	{re:/ous avez utilis. le Sortil.ge : (\w+)/i, clear:true, res:['sort']},
	{re:/Cibl. fait partie des :[^\(\)]+\(\s*([^\(]+)\s*-\s*N°(\d+)\)/i, res:['nom', 'id'], vals:{cdm:'ok'}},
	{re:/(.*)\s+\((\d+)\) a les caract.ristiques suivantes/i, clear:true, res:['nom', 'id'], vals:{aa:'ok'}},
	{re:/(.*)\s+\((\d+)\) a .t. influenc. par l'effet du sort/i, res:['nom', 'id']},
	{re:/Le Monstre une? (.*)\s+\((\d+)\) a .t. victime du pi.ge/i, clear:true, res:['nom', 'id'], vals:{piege:true}},
	{re:/a Cible subit donc pleinement l'effet/i, vals:{full:true}},
	{re:/e sortil.ge a donc un EFFET REDUIT/i, vals:{full:false}},
	{re:/e sortil.ge (.*) a eu l'effet/, res:['sort']},
	{re:/euil de R.sistance de la Cible[\._\s]*: (\d+) %/, res:['seuilres']},
	{re:/(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):\d\d MORT .* \( (\d+) \) a débarrassé le Monde Souterrain de la présence maléfique d´une? ([^\(]+) \(\s?(\d+)\s?\)/, res:['J', 'M', 'A', 'h', 'm', 'killer', 'nom', 'id']},
	{re:/ous avez attaqu. ([^\(]+) \(\s?(\d+)\s?\) .* comp/, clear:true, res:['nom', 'id'], vals:{catatt:'comp'}},
	{re:/ous avez attaqu. ([^\(]+) \(\s?(\d+)\s?\) .* sortil/, clear:true, res:['nom', 'id'], vals:{catatt:'sort'}},
	{re:/ous avez attaqu. ([^\(]+) \(\s?(\d+)\s?\)/, clear:true, res:['nom', 'id'], vals:{typeatt:'AN'}},
	{re:/le Tr.ll (.*)\s+\((\d+)\) s'est interpos. avec bravoure/, clear:true, res:['nom', 'id'], vals:{typeatt:'interpo'}},
	{re:/e Jet d'Esquive de votre adversaire est de[\._\s]*: (\d+)/, res:['esq']},
	{re:/ous avez donc RAT. votre adversair/, vals:{touché:false}},
	{re:/ous avez donc TOUCH. votre adversaire par un coup critique/, vals:{touché:true, critique:true}},
	{re:/ous avez donc TOUCH. votre adversaire/, vals:{touché:true, critique:false}}, // due to last one
	{re:/ous lui avez infligé (\d+) points de dég/, res:['degbrut']},
	{re:/on Armure le prot.ge et il ne perdra que (\d+) points de vie/, res:['degnet']},
	{re:/l était alors aux alentours de : (\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):\d\d/, res:['J', 'M', 'A', 'h', 'm']},
	{re:/ésultat du Combat : (.*)/, res:['typeatt']},
	{re:/otre Jet d'Attaque est de[\._\s]+: (\d+)/, res:['att']},
	{re:/e Monstre Cibl. fait partie des : \w+ \(([^\-]+) - N°\s*(\d+)\s*\)/, res:['nom', 'id']},
	{re:/iveau\s*:\s*[^>:\(\)]*\s*\([^\(]+\)/, res:['niveau']},
	{re:/lessure\D+(\d+)\s*%/, res:['blessure']},
	{re:/rmure Physique\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['armurephysmin', 'armurephysmax']},
	{re:/rmure Physique\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['armurephysmin']},
	{re:/rmure Physique\s*:\s*[^\(]+\(\s*inf.rieur\s+.\s+(\d+)\s*\)/i, res:['armurephysmax'], vals:{armurephysmin:0}},
	{re:/rmure Magique\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['armuremagmin', 'armuremagmax'], vals:{aArmure:true}},
	{re:/rmure Magique\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['armuremagmin'], vals:{aArmure:true}},
	{re:/rmure Magique\s*:\s*[^\(]+\(\s*inf.rieur\s+.\s+(\d+)\s*\)/i, res:['armuremagmax'], vals:{armuremagmin:0, aArmure:true}},
	{re:/rmure\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['armuremin', 'armuremax'], vals:{aArmure:true}},
	{re:/rmure\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['armuremin'], vals:{aArmure:true}},
	{re:/rmure\s*:\s*[^\(]+\(\s*inf.rieur\s+.\s+(\d+)\s*\)/i, res:['armuremax'], vals:{armuremin:0, aArmure:true}},
	{re:/squive\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['esquivemin', 'esquivemax'], vals:{aEsquive:true}},
	{re:/squive\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['esquivemin'], vals:{aEsquive:true}},
	{re:/squive\s*:\s*[^\(]+\(\s*inf.rieur\s+.\s+(\d+)\s*\)/i, res:['esquivemax'], vals:{esquivemin:0, aEsquive:true}},
	{re:/oints de Vie\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['pvmin', 'pvmax'], vals:{aPV:true}},
	{re:/oints de Vie\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['pvmin'], vals:{aPV:true}},
	{re:/oints de Vie\s*:\s*[^\(]+\(\s*inf.rieur\s+.\s+(\d+)\s*\)/i, res:['pvmax'], vals:{pvmin:0, aPV:true}},
	{re:/ttaque\s*:\s*[^\(]+\(([^\)]+)\)/, res:['att']},
	{re:/ne?\s+([^\(]+)\s+\((\d{7})\) a .t. influenc. par l'effet du sort/i, res:['nom', 'id']},
	{re:/ypnotis.e jusqu'. sa prochaine Date Limite d'Action/i, res:[], vals:{sort:'Hypnotisme'}},
	{re:/ous l'avez TU.\s/i, vals:{kill:true}},
	{re:/ous avez gagn. un total de (\d+) PX/, res:['px']},
	{re:/ous n..?avez gagn. aucun PX/, vals:{px:0}},
	{re:/l sera, de plus, fragilis. lors des prochaines esquives/i, res:[], vals:{done:true}},
	{re:/PV : -\d+D\d+ \(-(\d+)\)/, res:['degnet']},
	{re:/a subi (\d+) points de d.g.ts/i, res:['degnet']},
	{re:/ a .t. tu. par cet effet/, vals:{kill:true}},
];
/*eslint-enable max-len*/

function cpl(){
	var cur = arguments[0];
	for (var i=1; i<arguments.length; i++) {
		if (cur[arguments[i]]===undefined) return false;
	}
	return true;
}

var Animal = exports.Animal = function(id){
	this.id = id;
}

Animal.prototype.init = function(){
	this.items = [];
	this.nbMessages = 0;
}

Animal.prototype.addItem = function(item, message){
	this.items.push(item);
	this.nom = item.nom;
	item.message = '['+message.authorname+' '+utils.formatTime(message.created)+'](#'+message.id+')';
	item.time = message.created;
}
// returns a (shared) {min,max} object
Animal.prototype.reduce = function(name, min, max){
	var o = this[name.toLowerCase()];
	if (name==='pv') {
		if (min && min%10) min += 5;
		if (max && max%10) max -= 5;
	}
	if (!o) return this[name]={min:min, max:max};
	if (!(o.min>min)) o.min=min;
	if (!(o.max<max)) o.max=max;
	return o;
}
Animal.prototype.rangeCell = function(name, range){
	var o = range || this[name.toLowerCase()];
	if (!o) return '';
	if (o.min==o.max) return name+': '+o.min;
	if (!o.min) return name+' < '+o.max;
	if (!o.max) return name+' > '+o.min;
	return name+': '+o.min+' à '+o.max;
}
Animal.prototype.dicesCell = function(name, nbsides){
	var o = this[name.toLowerCase()];
	if (!o) return '';
	var m = o.max ? (o.min+o.max)/2 : o.min;
	return name+': '+Math.round(m*(nbsides+1)/2);
}

// prend en entrée un accumulateur des propriétés trouvées via les patterns dans les lignes de message
// et renvoie un "item" (équivalent {Message|Action|PV|Détails} d'une ligne de rapport)
Animal.prototype.getReportItem = function(o, isAtEnd){
	if (o.id!=this.id || !o.nom) return;
	var r = {nom:o.nom, id:o.id};
	if (cpl(o, 'touché') && (o.typeatt||o.catatt)) {
		r.action = (o.typeatt || o.catatt)
			.replace(/vampirisme/i, 'vampi')
			.replace(/coup de butoir/i, 'CDB')
			.replace(/botte secrète/i, 'BS');
		r.détails = '';
		if (o.touché && cpl(o, 'degbrut') && (isAtEnd||o.done||(o.px!==undefined))) {
			if (o.critique) r.action += ' critique';
			if (o.full===false) r.action += ' résisté';
			if (o.degnet) {
				r.pv = '**-'+o.degnet+' PV**';
				if (o.degbrut) r.pv += ' (-'+o.degbrut+')';
				r.deg = o.degnet;
			} else {
				r.pv = '**-'+o.degbrut+' PV**';
				r.deg = o.degbrut;
			}
			if (o.att) r.détails += 'att: '+o.att+'|';
			if (o.esq) r.détails += 'esq: '+o.esq+'|';
			if (o.kill) {
				if (o.px!==undefined) r.détails += '**'+o.px+' PX**';
			} else if (o.seuilres) {
				r.détails += 'Seuil res: '+o.seuilres+' %';
			}
			return r;
		} else if (!o.touché && cpl(o, 'typeatt')) {
			r.action += ' esquivé';
			if (o.att) r.détails += 'att: '+o.att+'|';
			if (o.esq) r.détails += 'esq: '+o.esq+'|';
			return r;
		}
	}
	if (o.aArmure && o.blessure!==undefined && o.aPV) {
		var	pv = this.reduce('pv', +o.pvmin, +o.pvmax),
			blessure = +o.blessure;
		if (o.armuremin||o.armuremax) this.reduce('armure', +o.armuremin, +o.armuremax);
		if (o.armuremagmin||o.armuremagmax) {
			this.reduce('armuremag', +o.armuremagmin, +o.armuremagmax);
			this.reduce('armurephys', +o.armurephysmin, +o.armurephysmax);
			this.reduce('armure', this.armuremag.min+this.armurephys.min, this.armuremag.max+this.armurephys.max);
		}
		this.reduce('esq', +o.esquivemin, +o.esquivemax);
		r.action = o.aa ? 'AA' : 'CDM';
		r.détails = '*' + this.rangeCell('Armure') + '*|';
		r.détails += '*' + this.dicesCell('Esq', 6) + '*|*' + this.rangeCell('PV') + '*|';
		r.détails += '*blessure: '+o.blessure+'%*';
		if (pv.min && pv.max) {
			if (!blessure) r.pv = Math.floor(0.95*pv.min)+' à '+Math.floor(pv.max);
			else if (blessure===95) r.pv = '< '+Math.ceil(0.075*pv.max);
			else r.pv = Math.floor((100-(blessure+5))*pv.min/100)+' à '+Math.floor((100-(blessure-5))*pv.max/100);
		} else if (pv.min) {
			if (!blessure) r.pv = '> '+Math.floor(0.95*pv.min);
			else if (blessure===95) r.pv = 'pas grand chose';
			else r.pv = '> '+Math.floor((100-(blessure+5))*pv.min/100);
		}
		r.pv = '*'+r.pv+'*';
		return r;
	}
	if (cpl(o, 'sort', 'full')) {
		if (/explosion/i.test(o.sort)) {
			if (!cpl(o, 'degnet')) return;
			r.pv = '**-'+o.degnet+' PV**';
			r.deg = o.degnet;
			// fixme comment déterminer s'il est mort ?
		}
		r.action = o.sort
			.replace(/hypnotisme/i, 'hypno')
			.replace(/faiblesse pasagère/i, 'FP');
		if (!o.full) r.action += ' réduit';
		r.détails = '';
		if (o.seuilres) r.détails += 'Seuil res: '+o.seuilres+' %|';
		return r;
	}
	if (o.piege && isAtEnd) {
		console.dir(o);
		r.action = "Piège";
		r.deg = o.degnet;
		r.pv = "**-"+o.degnet+" PV**";
		if (o.kill) r.action += " mortel";
		console.log('r:', r);
		return r;
	}
}

Animal.prototype.lookForReportItem = function(cur, isAtEnd, message){
	var item = this.getReportItem(cur, isAtEnd);
	if (!item) return cur;
	this.addItem(item, message);
	return {};
}

// receives a message and adds to the array of displayable objects {Message|Action|PV|Détails}
Animal.prototype.parse = function(message){
	var	cur = {},
		lines = message.content.replace(/\.{2,}/g, '_').split(/[\n\.]+/);
	this.nbMessages++;
	for (var l=0; l<lines.length; l++) {
		var line = lines[l];
		if (l<lines.length-1) {
			if (
				/blessure.*:\s*$/i.test(line) ||
				(/CONNAISSANCE DES MONSTRES sur\D*$/i.test(line) && /^\D*\(\d{7}\)\s*/.test(lines[l+1]))
			) {
				line += lines[++l];
			}
		}
		console.log(line);
		for (var i=0; i<patterns.length; i++) {
			var p = patterns[i], m = line.match(p.re);
			if (!m) continue;
			if (p.clear) {
				console.log("--- clear ---");
				this.lookForReportItem(cur, true, message);
				cur = {};
			}
			for (var j=1; j<m.length; j++) {
				cur[p.res[j-1]] = m[j].trim();
				console.log(' -> ', p.res[j-1], ' = ', m[j]);
			}
			if (p.vals) {
				for (var k in p.vals) {
					cur[k] = p.vals[k];
					console.log(' -> ', k, ' = ', p.vals[k]);
				}
			}
			cur = this.lookForReportItem(cur, false, message);
			break;
		}
	}
	this.lookForReportItem(cur, true, message);
}

Animal.prototype.table = function(){
	return (
		"Message|Action|PV|Détails\n"+
		"-|:-:|:-:|-\n"+
		this.items.map(function(i){
			return (i.message||' ')+'|'+(i.action||' ')+'|'+(i.pv||' ')+'|'+(i.détails||' ')
		}).join('\n')
	);
}

// if there's an interesting abstracted conclusion, returns it
Animal.prototype.abstract = function(){
	var sum = 0, nb = 0, t = 0;
	for (var i=this.items.length; i--;) {
		var item = this.items[i];
		if (item.action==='CDM') break;
		if (item.deg) {
			if (t && (t-item.time>86400)) break; // 24h de coupure max
			sum += +item.deg;
			nb++;
		}
	}
	if (nb<2) return "";
	return "\n" + nb + " dernières frappes : **-"+sum+" PV**";
}

// construit le markdown envoyé à l'utilisateur
Animal.prototype.mdReport = function(){
	var r = "*oukonenest* : ";
	if (this.items.length) {
		r += this.nom + ' ('+this.id+')\n';
		r += this.table() + this.abstract();
	} else {
		r += "Rien d'intéressant trouvé dans cette salle pour " + this.id + " (";
		switch (this.nbMessages) {
		case 0:
			r += "aucun message ne semble le mentionner).";
			break;
		case 1:
			r += "un seul message le mentionne).";
			break;
		default:
			r += this.nbMessages+" messages).";
		}
	}
	return r;
}

// query the DB, parse the found messages, build the markdown of the answer
//  and send it to the room
// Returns a promise.
Animal.prototype.reply = function(messages, ct){
	var benchOperation = bench.start("Mounty Hall / !!oukonenest / Animal");
	for (var i=messages.length; i--;) this.parse(messages[i]);
	var md = this.mdReport();
	benchOperation.end();
	ct.reply(md);
}
