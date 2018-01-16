// gère les sockets pour le partage
const	papi = require('./partage.js');

var	db;

exports.init = function(miaou){
	db = miaou.db;
}

exports.getRoomTrolls = function(shoe){
	db.on()
	.then(function(){
		return papi.isPlayerInRoomPartages.call(this, shoe.room.id, shoe.publicUser.id);
	})
	.then(function(allowed){
		if (!allowed) return;
		return papi.getRoomTrolls.call(this, shoe.room.id);
	})
	.then(function(trolls){
		shoe.socket.emit("mountyhall.setRoomTrolls", trolls);
	})
	.finally(db.off);
}

exports.getViewPlayer = function(shoe, targetPlayer){
	db.on()
	.then(function(){
		return papi.isPlayerInRoomPartages.call(this, shoe.room.id, shoe.publicUser.id);
	})
	.then(function(allowed){
		if (!allowed) throw new Error("unauthorized requester for mh.getView");
		return papi.isPlayerInRoomPartages.call(this, shoe.room.id, targetPlayer);
	})
	.then(function(allowed){
		if (!allowed) throw new Error("get view target player not in room partage");
		return this.queryRow(
			"select info->'troll'->'id' troll from plugin_player_info"+
			" where plugin='MountyHall' and player=$1",
			[targetPlayer],
			"mh_get_player_troll"
		);
	})
	.then(function(row){
		var trollId = +row.troll;
		return papi.getView.call(this, trollId);
	})
	.then(function(troll){
		shoe.socket.emit("mountyhall.setViewPlayer", troll);
	})
	.catch(function(err){
		console.log('err in mh.getView:', err);
	})
	.finally(db.off);
}


