const	papi = require("./partage.js"),
	bench = require("../../libs/bench.js"),
	prefs = require("../../libs/prefs.js"),
	commands = {};


// FIXME mapping dupliqué avec le code client
async function urlBaseMH(con, userId){
	let userPrefs = await prefs.getUserGlobalPrefs(con, userId);
	let pref = userPrefs["mountyhall.url"];
	if (pref=="raistlin") {
		return "https://mh.mh.raistlin.fr/mountyhall/"
	}
	if (pref=="raistlin-mz") {
		return "https://mh2.mh.raistlin.fr/mountyhall/"
	}
	if (pref=="raistlin-mhp") {
		return "https://mhp.mh.raistlin.fr/mountyhall/"
	}
	if ((pref=="auto" && gui.mobile) || pref=="smartphone") {
		return "https://smartphone.mountyhall.com/mountyhall/";
	}
	return "https://games.mountyhall.com/mountyhall/";
}

// command adding a partage in the current room
commands["On"] = function(ct){
	if (!ct.shoe.room.private) {
		throw "Les partages ne sont disponibles que dans les salles privées";
	}
	return papi.updateProfilTroll.call(this, ct.shoe.publicUser.id, ct.shoe.publicUser.id)
	.then(function(){
		return this.execute(
			"insert into mountyhall_partage (room, player) values ($1, $2)",
			[ct.shoe.room.id, ct.shoe.publicUser.id],
			"insert_mountyhall_partage"
		);
	})
	.then(function(res){
		ct.reply("Partage ajouté");
	})
	.catch(function(e){
		ct.reply("Pas pu ajouter de partage.");
	})
}

// command removing a partage from a room
commands["Off"] = function(ct){
	var roomId = +ct.args.match(/\d+$/) || ct.shoe.room.id;
	return this.execute(
		"delete from mountyhall_partage where room=$1 and player=$2",
		[roomId, ct.shoe.publicUser.id],
		"delete_mountyhall_partage"
	)
	.then(function(res){
		ct.reply("Partage supprimé");
	})
	.catch(function(e){
		ct.reply("Pas pu enlever de partage.");
	})
}

// command removing a partage from the current room
commands["Remove"] = function(ct){
	ct.shoe.checkAuth("admin");
	var m = ct.args.match(/\s@([\w-]{2,30})$/);
	if (!m) throw "Vous devez passer en argument le nom du joueur";
	return  this.getUserByName(m[1])
	.then(function(user){
		if (!user) throw "Utilisateur non trouvé";
		return this.execute(
			"delete from mountyhall_partage where room=$1 and player=$2",
			[ct.shoe.room.id, user.id],
			"delete_mountyhall_partage"
		)
	})
	.then(function(res){
		ct.reply("Partage supprimé");
	})
	.catch(function(e){
		ct.reply("Pas pu enlever de partage: " + e);
	})
}

commands["List"] = function(ct){
	var shoe = ct.shoe;
	ct.nostore = true;
	return this.queryRows(
		"select room, name from mountyhall_partage p left join room on room.id=p.room where player=$1",
		[shoe.publicUser.id],
		"select_mountyhall_player_partages"
	)
	.then(function(partages){
		if (partages.length) {
			ct.reply(
				"Vous partagez les informations de votre troll dans les salles:"
				+ partages.map(p=>"\n* ["+p.name+"]("+p.room+"#)"),
				true
			);
		} else {
			ct.reply("Vous ne partagez les informations de votre troll dans aucune salle");
		}
	})
}

// username: optionel
function updateTroll(ct, script, options){
	var	promise,
		m = ct.args.match(/\s@([\w-]{2,30})$/);
	if (m) {
		console.log("requesting update of another troll:", m); // note: possibilité d'abus là
		promise = this.getUserByName(m[1]);
	} else {
		promise = Promise.resolve(ct.shoe.publicUser);
	}
	return promise.then((user)=>{
		return papi.updateTroll.call(this, user.id, ct.shoe.publicUser.id, script, options);
	})
}

commands["UpdateProfilTroll"] = function(ct){
	return updateTroll.call(this, ct, "Profil4", {json:1})
	.then(function(){
		return papi.getRoomTrolls.call(this, ct.shoe.room.id);
	})
	.then(function(trolls){
		ct.reply("troll mis à jour");
		trolls.forEach(function(troll){
			var socket = ct.shoe.userSocket(troll.miaouUser.id);
			if (socket) socket.emit("mountyhall.setRoomTrolls", trolls);
		});
	});
}

commands["UpdateVueTroll"] = function(ct){
	return updateTroll.call(this, ct, "Vue2", {Lieux:1})
	.then(function(trollView){
		ct.shoe.emit("mountyhall.setViewPlayer", trollView);
	});
}

commands["UpdateRoom"] = function(ct){
	return this.queryRows(
		"select player from mountyhall_partage where room=$1",
		[ct.shoe.room.id],
		"mh_get_room_partages"
	)
	.map(function(row){
		return papi.updateProfilTroll.call(this, row.player, ct.shoe.publicUser.id)
		.catch(function(e){
			console.log("Error while updating troll", e);
			// returning nothing here
		})
		.then(function(troll){
			return troll ? troll.nom + " mis à jour" : "échec pour " + row.player;
		})
	})
	.then(function(results){
		if (!results.length) {
			ct.reply("pas de partage dans cette salle");
			return;
		}
		ct.reply("Mise à jour des trolls:" + results.map(r=>"\n* "+r));
		return papi.getRoomTrolls.call(this, ct.shoe.room.id)
		.then(function(trolls){
			trolls.forEach(function(troll){
				var socket = ct.shoe.userSocket(troll.miaouUser.id);
				if (socket) socket.emit("mountyhall.setRoomTrolls", trolls);
			});
		})
	});
}

commands["PX"] = async function(ct){
	let con = this;
	let trolls = await papi.getRoomTrolls.call(con, ct.shoe.room.id);
	let url = await urlBaseMH(con, ct.shoe.publicUser.id);
	url += "MH_Play/Actions/Play_a_DonPX.php?dest=" + trolls.map(t=>t.id).join(",");
	ct.reply("Cette URL permet de partager les px si vous êtes connecté à MH:\n" + url, true);
}

commands["RequestsUser"] = function(ct){
	ct.nostore = true;
	var players = [ct.shoe.publicUser.id];
	return this.queryOptionalRow(
		"select info->'troll'->'id' troll from plugin_player_info"+
		" where plugin='MountyHall' and player=$1",
		players,
		"mh_get_player_troll"
	)
	.then(function(row){
		var trolls = [];
		if (row && row.troll) trolls.push(+row.troll);
		return papi.mdRecentSPRequests.call(this, trolls, players);
	})
	.then(function(md){
		ct.reply("Récentes requètes initiées par vous ou liées à votre troll:\n" + md, true);
	});
}

commands["RequestsRoom"] = function(ct){
	ct.nostore = true;
	return this.queryRows(
		"select mhp.player, info->'troll'->'id' troll from mountyhall_partage mhp"+
		" left join plugin_player_info ppi on ppi.player=mhp.player and plugin='MountyHall'"+
		" where room=$1",
		[ct.shoe.room.id],
		"mh_get_room_players_and_trolls"
	)
	.then(function(rows){
		if (!rows.length) {
			ct.reply("pas trouvé de partage dans cette salle", true);
			return;
		}
		var trolls = rows.map(r=>+r.troll).filter(Number);
		var players = rows.map(r=>r.player);
		return papi.mdRecentSPRequests.call(this, trolls, players);
	})
	.then(function(md){
		ct.reply("Récentes requètes liées aux partages de cette salle:\n" + md, true);
	});
}

exports.onPartageCommand = function(ct){
	if (!ct.args) {
		return ct.reply("The `!!partage` command needs argument. Try `!!help partage` for more information.", true);
	}
	const doCommand = cmd => {
		const bo = bench.start(`MountyHall/partage/${cmd}`);
		return commands[cmd].call(this, ct).then(function(value){
			bo.end();
			return value;
		});
	}
	if (/^list\b/i.test(ct.args)) return doCommand("List");
	if (/^on\b/i.test(ct.args)) return doCommand("On");
	if (/^off\b/i.test(ct.args)) return doCommand("Off");
	if (/^remove\b/i.test(ct.args)) return doCommand("Remove");
	if (/^update[-\s]*troll/i.test(ct.args)) return doCommand("UpdateProfilTroll");
	if (/^update[-\s]*vue/i.test(ct.args)) return doCommand("UpdateVueTroll");
	if (/^update[-\s]*room/i.test(ct.args)) return doCommand("UpdateRoom");
	if (/^requests[-\s]*user/i.test(ct.args)) return doCommand("RequestsUser");
	if (/^requests[-\s]*room/i.test(ct.args)) return doCommand("RequestsRoom");
	if (/^px$/i.test(ct.args)) return doCommand("PX");
	throw "Command not understood";
}


