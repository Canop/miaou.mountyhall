
const	MAX_APPELS_DYNAMIQUES = 9,
	fmt = require("../../libs/fmt.js"),
	iconvlite = require('iconv-lite'),
	http = require('http'),
	Promise = require("bluebird");

// queries a SP ("script public")
// returns a promise which is resolved if all goes well with an array of arrays of strings (a csv table)
exports.fetchSP = function(sp, num, mdpr, options){
	var	p = Promise.defer(),
		path = "/SP_"+sp+".php?Numero="+num+"&Motdepasse="+encodeURIComponent(mdpr);
	if (options) {
		for (var key in options) {
			path += "&" + key + "=" + encodeURIComponent(options[key]);
		}
	}
	var req = http.request({
		hostname: "sp.mountyhall.com",
		path,
		method: "GET"
	}, function(res){
		var text = '';
		res.on('data', function(chunk){
			text += iconvlite.decode(chunk, 'ISO-8859-1').toString();
		}).on('end', function(){
			var lines = text.split("\n").map(
				s => s.split(';')
			);
			if (lines.length>0 && !/^\W*erreur/i.test(lines[0])) {
				p.resolve(lines);
			} else {
				p.reject(new Error('Error : ' + JSON.stringify(lines)));
			}
		});
	});
	req.on('error', function(e){
		p.reject(e);
	});
	req.end();
	return p.promise;
}

// must be called with context being an open DB connection
exports.getNbSpCallsInLast24h = function(trollId){
	var since = (Date.now()/1000|0) - 24*60*60;
	return this.queryRow(
		"select count(*) nb from mountyhall_sp_call where troll=$1 and call_date>$2",
		[trollId, since],
		"mh_count_sp_calls"
	)
	.then(function(row){
		return row.nb;
	});
}

// must be called with context being an open DB connection
exports.isPlayerInRoomPartages = function(roomId, playerId){
	return this.queryRow(
		"select count(*) b from mountyhall_partage where room=$1 and player=$2",
		[roomId, playerId],
		"mh_check_player_partage"
	)
	.then(function(row){
		return !!row.b;
	});
}

// must be called with context being an open DB connection
exports.getRoomTrolls = function(roomId, script){
	return this.queryRows(
		"select player, name from mountyhall_partage mhp join player p on p.id=mhp.player where room=$1",
		[roomId],
		"mh_get_room_partages_and_players"
	)
	.map(function(row){
		return this.getPlayerPluginInfo("MountyHall", row.player)
		.then(function(ppi){
			if (!ppi || !ppi.info || !ppi.info.troll) {
				return null;
			}
			ppi.info.troll.miaouUser = {
				id: row.player,
				name: row.name
			};
			return ppi.info.troll;
		});
	})
	.filter(Boolean);
}

// must be called with context being an open DB connection
exports.getView = function(trollId){
	return this.queryOptionalRow(
		"select update, vue from mountyhall_vue where troll=$1",
		[trollId],
		"mh_get_vue"
	)
	.then(function(troll){
		troll = troll || {};
		troll.id = trollId;
		return troll;
	});
}

// Returns recent sp requests as a markdown table
// must be called with context being an open DB connection
exports.mdRecentSPRequests = function(trollIds, playerIds){
	var since = Date.now()/1000|0 - 3*24*60;
	var cond = "requester in(" + playerIds + ")";
	if (trollIds.length) cond = "(troll in ("+trollIds+") or " + cond + ")";
	return this.queryRows(
		"select troll, call_date, requester, name, script, sp_result from mountyhall_sp_call"+
		" left join player on player.id=requester"+
		" where " + cond+
		" and call_date>"+since+
		" order by call_date desc",
		null,
		"select_requests", false
	)
	.then(function(rows){
		if (!rows.length) return "pas de requète dans les trois derniers jours";
		return	"Date|Troll|Demandeur|Script|Résultat\n"
		+ ":-:|:-:|:-:|:-:|:-:\n"
		+ rows.map(r =>
			`${fmt.date(r.call_date, "YYYY/MM/DD hh:mm")}|${r.troll}|${r.name}|${r.script}|${r.sp_result}`
		).join("\n");
	});
}

// ces fonctions sont appelées avec contexte une connexion BD
const stores = {};
stores.Profil2 = function(ppi, script, obj){
	ppi.info.troll['profil2'] = obj;
	return this.deletePlayerPluginInfo("MountyHall", ppi.player)
	.then(function(){
		return this.storePlayerPluginInfo("MountyHall", ppi.player, ppi.info);
	}).then(function(){
		return ppi.info.troll;
	});
}
stores.Vue2 = function(ppi, script, obj){
	var	now = Date.now()/1000|0,
		trollId = +ppi.info.troll.id;
	return this.execute(
		"delete from mountyhall_vue where troll=$1",
		[trollId],
		"delete_mh_vue"
	)
	.then(function(){
		return this.execute(
			"insert into mountyhall_vue (troll, update, vue) values ($1, $2, $3)",
			[trollId, now, obj],
			"insert_mh_vue"
		);
	})
	.then(function(){
		return {id:trollId, vue:obj};
	});
}

// must be called with context being an open DB connection
exports.updateTroll = function(playerId, requester, script, options){
	console.log("updating ", script, " for player", playerId);
	var	now = Date.now()/1000|0,
		troll,
		ppi;
	return this.getPlayerPluginInfo("MountyHall", playerId)
	.then(function(_ppi){
		ppi = _ppi;
		if (!ppi || !ppi.info) throw "Vous devez lier un troll à votre utilisateur Miaou (voir les *settings*)";
		troll = ppi.info.troll;
		if (!troll) throw "Troll non trouvé";
		if (!ppi.info.mdpr) throw "Mot de passe restreint inconnu de Miaou";
		return exports.getNbSpCallsInLast24h.call(this, troll.id);
	})
	.then(function(nbCalls){
		console.log('nbCalls:', nbCalls);
		if (nbCalls>MAX_APPELS_DYNAMIQUES) {
			throw `Trop d'appels aux scripts publics pour le troll ${troll.id}`;
		}
		return exports.fetchSP(script, troll.id, ppi.info.mdpr, options)
		.catch(spError=>{
			console.log('spError:', spError);
			var badPassword = /mot de passe incorrect/.test(spError.toString());
			return this.execute(
				"insert into mountyhall_sp_call (troll, call_date, requester, script, sp_result)"+
				" values ($1, $2, $3, $4, $5)",
				[troll.id, now, requester, script, badPassword ? "bad-password" : "error"],
				"mh_insert_sp_call"
			).then(function(){
				throw `L'appel du script public ${script} a échoué`;
			});
		})
		.then(csv=>{
			return this.execute(
				"insert into mountyhall_sp_call (troll, call_date, requester, script, sp_result)"+
				" values ($1, $2, $3, $4, $5)",
				[troll.id, now, requester, script, "ok"],
				"mh_insert_sp_call"
			).then(function(){
				return parsers[script](csv);
			});
		});
	})
	.then(function(obj){
		obj.requestTime = now;
		return stores[script].call(this, ppi, script, obj)
	});
}

// met à jour le profil du troll
// must be called with context being an open DB connection
exports.updateProfilTroll = function(playerId, requester){
	return exports.updateTroll.call(this, playerId, requester, "Profil2");
}

const parsers = {};
parsers.Profil2 = function(csv){
	var	l = csv[0].map(v=>v==+v?+v:v),
		i = 0;
	return {
		id: l[i++],
		x: l[i++],
		y: l[i++],
		n: l[i++],
		pv: l[i++],
		pvPasMax: l[i++],
		pa: l[i++],
		dla: Date.parse(l[i++])/1000|0, // ceci marche uniquement si le serveur est en TimeZone CET
		désAtt: l[i++],
		désEsq: l[i++],
		désDég: l[i++],
		désReg: l[i++],
		vue: l[i++],
		arm: l[i++],
		mm: l[i++],
		rm: l[i++],
		atts: l[i++],
		fat: l[i++],
		cam: !!l[i++],
		invi: !!l[i++],
		int: !!l[i++],
		parades: l[i++],
		contras: l[i++],
		dur: l[i++],
		bonDur: l[i++],
		armNat: l[i++],
		mDésArmNat: l[i++],
		glué: !!l[i++],
		auSol: !!l[i++],
		course: !!l[i++],
		lévite: !!l[i++],
		pvMax: l[i++],
		niveau: l[i++]
	};
}
parsers.Vue2 = function(csv){
	var	vue = {},
		obj,
		arr;
	csv.forEach(line=>{
		console.log('line:', line);
		var match = line[0].match(/^#(DEBUT|FIN) (TROLLS|LIEUX|MONSTRES|ORIGINE)$/);
		if (match) {
			if (match[1]==="FIN") arr = null;
			else arr = vue[match[2].toLowerCase()] = [];
			return;
		}
		if (!arr) return;
		var i = 0;
		arr.push(obj={id:+line[i++]});
		if (line.length===5) obj.nom = line[i++];
		obj.x = +line[i++];
		obj.y = +line[i++];
		obj.n = +line[i++];
	});
	// l'origine arrive de façon spéciale, on la corrige
	if (Array.isArray(vue.origine)) {
		obj = vue.origine[0];
		vue.origine = {
			portée: obj.id,
			x: obj.x,
			y: obj.y,
			n: obj.n
		};
	}
	console.log('vue (au parsage):', vue);
	return vue;
}
