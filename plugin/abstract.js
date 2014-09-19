	
var patterns = [
	{re:/Vous avez utilis. le Sortil.ge : (\w+)/i, res:['sort']},
	{re:/Le Monstre Cibl. fait partie des :[^\(\)]+\(\s*([^\(]+)\s*-\s*N°(\d+)\)/i, res:['nom','id'], vals:{cdm:'ok'}},
	{re:/CONNAISSANCE DES MONSTRES sur une?\s+([^\(]+)\s+\((\d{7})\)/i, res:['nom','id'], vals:{cdm:'ok'}},
	{re:/La Cible subit donc pleinement l'effet/i, vals:{full:true}},
	{re:/Le sortil.ge a donc un EFFET REDUIT/i, vals:{full:false}},
	{re:/Le sortil.ge (.*) a eu l'effet/, res:['sort']},
	{re:/Seuil de R.sistance de la Cible[\._\s]*: (\d+) %/, res:['seuilres']},
	{re:/(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):\d\d MORT .* \( (\d+) \) a débarrassé le Monde Souterrain de la présence maléfique d´une? ([^\(]+) \(\s?(\d+)\s?\)/, res:['J','M','A','h','m','killer','nom','id']},
	{re:/Vous avez attaqu. une? ([^\(]+) \(\s?(\d+)\s?\) .* comp/, res:['nom','id'], vals:{catatt:'comp'}},
	{re:/Vous avez attaqu. une? ([^\(]+) \(\s?(\d+)\s?\) .* sortil/, res:['nom','id'], vals:{catatt:'sort'}},
	{re:/Vous avez attaqu. une? ([^\(]+) \(\s?(\d+)\s?\)/, res:['nom','id'], vals:{typeatt:'AN'}},
	{re:/Le Jet d'Esquive de votre adversaire est de[\._\s]*: (\d+)/, res:['esq']},
	{re:/Vous avez donc RAT. votre adversair/, vals:{touché:false}},
	{re:/Vous avez donc TOUCH. votre adversaire par un coup critique/, vals:{touché:true, critique:true}},
	{re:/Vous avez donc TOUCH. votre adversaire/, vals:{touché:true, critique:false}}, // due to last one
	{re:/Vous lui avez infligé (\d+) points de dég/, res:['degbrut']},
	{re:/Son Armure le prot.ge et il ne perdra que (\d+) points de vie/, res:['degnet']},
	{re:/Il était alors aux alentours de : (\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):\d\d/, res:['J','M','A','h','m']},
	{re:/Résultat du Combat : (.*)/, res:['typeatt']},
	{re:/Votre Jet d'Attaque est de[\._\s]+: (\d+)/, res:['att']},
	{re:/Le Monstre Cibl. fait partie des : \w+ \(([^\-]+) - N°\s*(\d+)\s*\)/, res:['nom','id']},
	{re:/Niveau\s*:\s*[^>:\(\)]*\s*\([^\(]+\)/, res:['niveau']},
	{re:/Blessure\D+(\d+)\s*%/, res:['blessure']},
	{re:/Armure\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['armuremin','armuremax']},
	{re:/Armure\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['armuremin']},
	{re:/Esquive\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['esquivemin','esquivemax']},
	{re:/Esquive\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['esquivemin']},
	{re:/Points de Vie\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['pvmin','pvmax']},
	{re:/Points de Vie\s*:\s*[^\(]+\(\s*sup.rieur\s+.\s+(\d+)\s*\)/i, res:['pvmin']},
	{re:/Attaque\s*:\s*[^\(]+\(([^\)]+)\)/, res:['att']},
	{re:/une?\s+([^\(]+)\s+\((\d{7})\) a .t. influenc. par l'effet du sort/i, res:['nom','id']},
	{re:/Hypnotis.e jusqu'. sa prochaine Date Limite d'Action/i, res:[], vals:{sort:'Hypnotisme'}},
	{re:/Vous l'avez TU. et avez d.barrass. le Monde Souterrain de sa pr.sence mal.fique/i, vals:{kill:true}},
	{re:/vous avez gagn. un total de (\d+) PX/, res:['px']},
	{re:/Il sera, de plus, fragilis. lors des prochaines esquives/i, res:[], vals:{done:true}},
	{re:/PV : -\d+D\d+ \(-(\d+)\)/, res:['degnet']},
	{re:/ a .t. tu. par cet effet/, vals:{kill:true}},
	//~ {re://, res:[]},
];


var MMM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDateDDMMM(date){
	var d = date.getDate();
	return (d<10 ? '0' : '') + d + ' ' + MMM[date.getMonth()];
}
function formatTime(t){
	var date = new Date(t*1000), now = new Date,
		m = date.getMinutes(), h = date.getHours(), Y = date.getFullYear();
		s = s = (h<10?'0':'')+h+':'+(m<10?'0':'')+m;
	if (now.getFullYear()===Y && now.getMonth()===date.getMonth() && now.getDate()===date.getDate()) {
		return s;
	}
	return formatDateDDMMM(date) + (Y!==now.getFullYear() ? (' '+Y) : '')  + ' ' + s;
}

function cpl(){
	var cur = arguments[0];
	for (var i=1; i<arguments.length; i++) {
		if (cur[arguments[i]]===undefined) return false;
	}
	return true;
}

function Monster(id){
	this.id = id;
	this.items = [];
	this.nbMessages = 0;
}
Monster.prototype.addItem = function(item, message){
	this.items.push(item);
	this.nom = item.nom;
	item.message = '['+message.authorname+' '+formatTime(message.created)+'](#'+message.id+')';
}
// returns a (shared) {min,max} object
Monster.prototype.reduce = function(name, min, max){
	var o = this[name.toLowerCase()];
	if (name==='pv') {
		if (min && min%10) min += 5;
		if (max && max%10) max -= 5;
	}
	if (!o) return this[name]={min:min,max:max};
	if (!(o.min>min)) o.min=min;
	if (!(o.max<max)) o.max=max;
	return o;
}
Monster.prototype.rangeCell = function(name, range){
	var o = range || this[name.toLowerCase()];
	if (!o) return '';
	if (o.min==o.max) return name+': '+o.min;
	if (!o.min) return name+' < '+o.max;
	if (!o.max) return name+' > '+o.min;
	return name+': '+o.min+' à '+o.max;
}
Monster.prototype.dicesCell = function(name, nbsides){
	var o = this[name.toLowerCase()];
	if (!o) return '';
	var m = o.max ? (o.min+o.max)/2 : o.min;
	return name+': '+Math.round(m*(nbsides+1)/2);
}

// prend en entrée un accumulateur des propriétés trouvées via les patterns dans les lignes de message
// et renvoie un "item" (équivalent {Message|Action|PV|Détails} d'une ligne de rapport)
Monster.prototype.getReportItem = function(o, isAtEnd){
	if (o.id!=this.id || !o.nom) return;
	var r = {nom:o.nom, id:o.id};
	if (cpl(o, 'touché') && (o.typeatt || o.catatt)) {
		r.action = (o.typeatt || o.catatt)
			.replace(/vampirisme/i,'vampi')
			.replace(/coub de butoir/i,'CDB')
			.replace(/botte secrète/i,'BS');
		r.détails = '';
		if (o.touché && cpl(o, 'degbrut', 'degnet') && (isAtEnd||o.done||(o.px!==undefined))) {
			if (o.critique) r.action += ' critique';
			if (o.full===false) r.action += ' résisté';
			r.pv = '**-'+o.degnet+' PV**';
			if (o.degbrut) r.pv += ' (-'+o.degbrut+')';
			if (o.att) r.détails += 'att: '+o.att+'|';
			if (o.esq) r.détails += 'esq: '+o.esq+'|';
			if (o.kill) {
				if (o.px!==undefined) r.détails += '**'+o.px+' PX**';
			} else {
				if (o.seuilres) r.détails += 'Seuil res: '+o.seuilres+' %';				
			}
			return r;
		} else if (!o.touché && cpl(o, 'typeatt')) {
			r.action += ' esquivé';
			if (o.att) r.détails += 'att: '+o.att+'|';
			if (o.esq) r.détails += 'esq: '+o.esq+'|';
			return r;
		}
	}
	if (cpl(o, 'armuremin', 'esquivemin', 'pvmin', 'blessure')) {
		var pv = this.reduce('pv', +o.pvmin, +o.pvmax),
			blessure = +o.blessure;
		this.reduce('armure', +o.armuremin, +o.armuremax);
		this.reduce('esq', +o.esquivemin, +o.esquivemax);
		r.action = 'CDM';
		r.détails = '*' + this.rangeCell('Armure') + '*|*' + this.dicesCell('Esq',6) + '*|*' + this.rangeCell('PV') + '*|';
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
			// fixme comment déterminer s'il est mort ?
		}
		r.action = o.sort
			.replace(/hypnotisme/i,'hypno')
			.replace(/faiblesse pasagère/i,'FP');
		if (!o.full) r.action += ' réduit';
		r.détails = '';
		if (o.seuilres) r.détails += 'Seuil res: '+o.seuilres+' %|';
		return r;
	}
}
// receives a message and adds to the array of displayable objects {Message|Action|PV|Détails}
Monster.prototype.parse = function(message){
	var cur = {}, lines = message.content.replace(/\.{2,}/g,'_').split(/[\n\.]+/), item;
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
			if (item = this.getReportItem(cur, false)) {
				this.addItem(item, message);
				cur = {};
			}
			break;
		}
	}
	if (item = this.getReportItem(cur, true)) {
		this.addItem(item, message);
	}	
}
// construit le markdown envoyé à l'utilisateur
Monster.prototype.mdReport = function(){
	if (this.items.length) {
		return (
			"*oukonenest* : " + this.nom + ' ('+this.id+')\n'+
			"Message|Action|PV|Détails\n"+
			":-----|:----:|:-:|-------\n"+
			this.items.map(function(i){
				return (i.message||' ')+'|'+(i.action||' ')+'|'+(i.pv||' ')+'|'+(i.détails||' ')
			}).join('\n')
		);
	} else {
		var r = "*oukonenest* : Rien d'intéressant trouvé dans cette salle pour le monstre "+this.id+" (";
		switch (this.nbMessages) {
			case 0:  r += "aucun message ne semble le mentionner)."; break;
			case 1:  r += "un seul message le mentionne)."; break;
			default: r += this.nbMessages+" messages)."; 
		}
		return r;
	}
}

exports.onMonster = function(bot, shoe, id){
	//~ console.log("==================================\noukonenest "+id);
	var db = shoe.db;
	db.on([shoe.room.id, id+'&!oukonenest', 'english', 50])
	.spread(db.search_tsquery)
	.then(function(messages){
		var monster = new Monster(id);
		for (var i=messages.length; i--;) monster.parse(messages[i]);
		shoe.botMessage(bot, monster.mdReport());
	})
	.catch(function(e){
		shoe.botMessage(bot, 'A pas marché :(');
		console.log(e);		
	})
	.finally(db.off);	
}
