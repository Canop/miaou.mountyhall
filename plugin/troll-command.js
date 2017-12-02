
// Problems:
//  * for a sane query, we'd need jsonb (and probably an index) which is only available from pg 9.4

exports.onTrollCommand = function(ct){
	if (!ct.args.length) return new Error("Cette commande nécessite un nom de troll");
	var trollName = ct.args;
	return this.queryRows(
		"select ppi.player, p.name, ppi.info from plugin_player_info ppi"+
		" join player p on p.id=ppi.player"+
		" where plugin='MountyHall' and lower((info#>'{troll,nom}')::varchar)=$1",
		['"'+trollName.toLowerCase()+'"'],
		"search-troll-ppi"
	).then(function(trolls){
		console.log('trolls:', trolls);
		var s;
		if (trolls.length) {
			s = trolls.map(function(troll){
				return "Le troll " + trollName + " est lié au compte @" + troll.name + ".";
			}).join("\n");
		} else {
			s = "Il semble qu'aucun compte Miaou ne soit lié au troll " + trollName + ".";
		}
		ct.reply(s);
	});
}

