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

