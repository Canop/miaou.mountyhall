const	papi = require("./partage.js"),
	bench = require("../../libs/bench.js"),
	commands = {};

// command adding a partage in the current room
commands["On"] = function(ct){
	if (!ct.shoe.room.private) {
		throw "Les partages ne sont disponibles que dans les salles privées";
	}
	return papi.updateTroll.call(this, ct.shoe.publicUser.id, ct.shoe.publicUser.id)
	.then(function(){
		return this.execute(
			"insert into mountyhall_partage (room, player) values ($1, $2)",
			[ct.shoe.room.id, ct.shoe.publicUser.id],
			"insert_mountyhall_partage",
			false
		);
	})
	.catch(function(e){
		ct.reply("Pas pu ajouter de partage.");
	})
	.then(function(res){
		ct.reply("Partage ajouté");
	})
}

// command removing a partage from a room
commands["Off"] = function(ct){
	var roomId = +ct.args.match(/\d+$/) || ct.shoe.room.id;
	return this.execute(
		"delete from mountyhall_partage where room=$1 and player=$2",
		[roomId, ct.shoe.publicUser.id],
		"delete_mountyhall_partage",
		false
	)
	.catch(function(e){
		ct.reply("Pas pu enlever de partage.");
	})
	.then(function(res){
		ct.reply("Partage supprimé");
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

commands["UpdateTroll"] = function(ct){
	var	promise,
		m = ct.args.match(/\s@([\w-]{2,30})$/);
	if (m) {
		console.log("requesting update of another troll:", m); // note: possibilité d'abus là
		promise = this.getUserByName(m[1]);
	} else {
		promise = Promise.resolve(ct.shoe.publicUser);
	}
	return promise.then(function(user){
		return papi.updateTroll.call(this, user.id, ct.shoe.publicUser.id)
	})
	.then(function(){
		return papi.getRoomTrolls.call(this, ct.shoe.room.id);
	})
	.then(function(trolls){
		ct.reply("troll mis à jour");
		trolls.forEach(function(troll){
			console.log("trying to send update to", troll.miaouUser.name);
			var socket = ct.shoe.userSocket(troll.miaouUser.id);
			if (socket) socket.emit("mountyhall.setRoomTrolls", trolls);
			else console.log("user not in the room");
		});
	});
}

commands["UpdateRoom"] = function(ct){
	return this.queryRows(
		"select player from mountyhall_partage where room=$1",
		[ct.shoe.room.id],
		"mh_get_room_partages"
	)
	.map(function(row){
		return papi.updateTroll.call(this, row.player, ct.shoe.publicUser.id)
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
				console.log("trying to send update to", troll.miaouUser.name);
				var socket = ct.shoe.userSocket(troll.miaouUser.id);
				if (socket) socket.emit("mountyhall.setRoomTrolls", trolls);
				else console.log("user not in the room");
			});
		})
	});
}

commands["RequestsUser"] = function(ct){
	ct.nostore = true;
	var players = [ct.shoe.publicUser.id];
	return this.queryOptionalRow(
		"select info->'troll'->'id' troll from plugin_player_info where player=$1",
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
	if (/^update[-\s]*troll\b/i.test(ct.args)) return doCommand("UpdateTroll");
	if (/^update[-\s]*room\b/i.test(ct.args)) return doCommand("UpdateRoom");
	if (/^requests[-\s]*user\b/i.test(ct.args)) return doCommand("RequestsUser");
	if (/^requests[-\s]*room\b/i.test(ct.args)) return doCommand("RequestsRoom");
	throw "Command not understood";
}


