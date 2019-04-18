

const badges = [
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
	{
		name: "Outilleur Miaou",
		level: "silver",
		condition: "Avoir développé un outil pour MountyHall intégré à Miaou",
	},
	{
		name: "Assistant Outilleur Miaou",
		level: "bronze",
		condition: "Avoir aidé à développer un outil pour MountyHall intégré à Miaou",
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
	for (var i=0; i<badges.length; i++) {
		let badge = badges[i];
		badge.tag = "MountyHall";
		let checkPlayer = badge.checkPlayer;
		badge.checkPlayer = null;
		if (badge.condition) {
			await badging.register(con, {
				badge,
				awardRoom: roomId,
				checkPlayer,
			});
		} else {
			badge.manual = true;
			await badging.initBadge(con, badge);
		}
	}
}

