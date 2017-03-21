
const	MAX_APPELS_DYNAMIQUES = 9,
	iconvlite = require('iconv-lite'),
	http = require('http'),
	Promise = require("bluebird");

// queries a SP ("script public")
// returns a promise which is resolved if all goes well with an array of arrays of strings (a csv table)
exports.fetchSP = function(sp, num, mdpr){
	var p = Promise.defer();
	var req = http.request({
		hostname: "sp.mountyhall.com",
		path: "/SP_"+sp+".php?Numero="+num+"&Motdepasse="+encodeURIComponent(mdpr),
		method: "GET"
	}, function(res){
		var lines = [];
		res.on('data', function(chunk){
			lines.push(iconvlite.decode(chunk, 'ISO-8859-1').toString().split(';'));
		}).on('end', function(){
			if (lines.length>0 && lines[0].length>1) {
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
exports.getRoomTrolls = function(roomId){
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
exports.updateTroll = function(playerId, requester){
	console.log("updating troll for player", playerId);
	var	now = Date.now()/1000|0,
		troll,
		ppi,
		script = 'Profil2';
	return this.getPlayerPluginInfo("MountyHall", playerId)
	.then(function(_ppi){
		ppi = _ppi;
		console.log('ppi:', ppi);
		if (!ppi || !ppi.info) throw "Vous devez lier un troll à votre utilisateur Miaou (voir les *settings*)";
		troll = ppi.info.troll;
		console.log('troll:', troll);
		if (!troll) throw "Troll non trouvé";
		if (!ppi.info.mdpr) throw "Mot de passe restreint inconnu de Miaou";
		return exports.getNbSpCallsInLast24h.call(this, troll.id);
	})
	.then(function(nbCalls){
		console.log('nbCalls:', nbCalls);
		if (nbCalls>MAX_APPELS_DYNAMIQUES) {
			throw `Trop d'appels aux scripts publics pour le troll ${troll.id}`;
		}
		return exports.fetchSP(script, troll.id, ppi.info.mdpr)
		.catch(spError=>{
			console.log('spError:', spError);
			return this.execute(
				"insert into mountyhall_sp_call (troll, call_date, requester, script, sp_result)"+
				" values ($1, $2, $3, $4, $5)",
				[troll.id, now, requester, script, "error"],
				"mh_insert_sp_call"
			).then(function(){
				throw `L'appel du script public ${script} a échoué`;
			});
		})
		.then(csv=>{
			console.log('csv:', csv);
			return this.execute(
				"insert into mountyhall_sp_call (troll, call_date, requester, script, sp_result)"+
				" values ($1, $2, $3, $4, $5)",
				[troll.id, now, requester, script, "ok"],
				"mh_insert_sp_call"
			).then(function(){
				return profil2CsvToObject(csv);
			});
		});
	})
	.then(function(profil2){
		console.log('profil2:', profil2);
		profil2.requestTime = now;
		ppi.info.troll.profil2 = profil2;
		return this.deletePlayerPluginInfo("MountyHall", playerId);
	}).then(function(){
		return this.storePlayerPluginInfo("MountyHall", playerId, ppi.info);
	}).then(function(){
		return ppi.info.troll;
	});
}

function profil2CsvToObject(csv){
	var	l = csv[0].map(v=>v==+v?+v:v),
		i = 0;
	return {
		id: l[i++],
		x: l[i++],
		y: l[i++],
		n: l[i++],
		pv: l[i++],
		pvMax: l[i++],
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
	};
}

/*
csv: [ [ '110000',
    '-52',
    '-84',
    '-62',
    '65',
    '60',
    '6',
    '2017-03-19 23:48:00',
    '4',
    '3',
    '11',
    '1',
    '4',
    '23',
    '951',
    '533',
    '0',
    '4',
    '0',
    '0',
    '0',
    '0',
    '0',
    '639',
    '-175',
    '1',
    '0',
    '0',
    '0',
    '0',
    '0\n' ] ]
   */
