const	papi = require("./partage.js");

// command adding a partage in the current room
function doCommandOn(ct){
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
function doCommandOff(ct){
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

function doCommandList(ct){
	var shoe = ct.shoe;
	ct.nostore = true;
	return this.queryRows(
		"select room, name from mountyhall_partage p left join room on room.id=p.room where player=$1",
		[shoe.publicUser.id],
		"select_mountyhall_player_partages"
	)
	.then(function(partages){
		console.log('partages:', partages);
		if (partages.length) {
			ct.reply("Vous partagez les informations de votre troll dans les salles:"
				 + partages.map(p=>"\n* ["+p.name+"]("+p.room+"#)")
			);
		} else {
			ct.reply("Vous ne partagez les informations de votre troll dans aucune salle");
		}
	})
}

function doCommandUpdateTroll(ct){
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
			console.log("trying to send update to", troll.miaouUser.id);
			ct.shoe.userSocket(troll.miaouUser.id).emit("mountyhall.setRoomTrolls", trolls);
		});
	});
}

function doCommandUpdateRoom(ct){
	return this.queryRows(
		"select player from mountyhall_partage where room=$1",
		[ct.shoe.room.id],
		"mh_get_room_partages"
	)
	.map(function(row){
		return papi.updateTroll.call(this, row.player, ct.shoe.publicUser.id)
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
				console.log("trying to send update to", troll.miaouUser.id);
				ct.shoe.userSocket(troll.miaouUser.id).emit("mountyhall.setRoomTrolls", trolls);
			});
		})
	});
}

exports.onPartageCommand = function(ct){
	if (!ct.args) {
		return ct.reply("The `!!partage` command needs argument. Try `!!help partage` for more information.", true);
	}
	if (/^list\b/i.test(ct.args)) return doCommandList.call(this, ct);
	if (/^on\b/i.test(ct.args)) return doCommandOn.call(this, ct);
	if (/^off\b/i.test(ct.args)) return doCommandOff.call(this, ct);
	if (/^update[-\s]*troll\b/i.test(ct.args)) return doCommandUpdateTroll.call(this, ct);
	if (/^update[-\s]*room\b/i.test(ct.args)) return doCommandUpdateRoom.call(this, ct);
	var m = ct.args.match(/^cancel\s+(\d+)\b/i);
	if (m) return doCommandCancel.call(this, ct, +m[1]);
	return doCommandNew(ct);
}


