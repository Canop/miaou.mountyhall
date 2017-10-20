

const checks = [
	{
		name: "Vrai Troll",
		level: "bronze",
		condition: "Etre identifié comme troll",
		checkPlayer: async function(con, player){
			var ppi = await con.getPlayerPluginInfo("MountyHall", player.id);
			if (!ppi || !ppi.info) return false;
			var troll = ppi.info.troll;
			return troll && troll.race && troll.id;
		}
	},
];


exports.registerBadges = async function(con, miaou){
	var badging = miaou.plugin("badging");
	if (!badging) {
		console.log("Badging plugin not available for MH badges");
		return;
	}
	var roomId = miaou.conf("pluginConfig", "MountyHall", "room");
	if (!roomId) {
		console.log("No Official Room specified for MountyHall. MH badges are disabled.");
		return;
	}
	for (var i=0; i<checks.length; i++) {
		var c = checks[i];
		await badging.register(con, {
			badge: {
				tag: "MountyHall",
				name: c.name,
				level: c.level,
				condition: c.condition
			},
			awardRoom: roomId,
			checkPlayer: c.checkPlayer
		});
	}
}

