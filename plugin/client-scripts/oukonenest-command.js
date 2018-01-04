// client side part of the !!oukonenest command
// That is: autocompletion
miaou(function(mountyhall){

	const	completionSet = new Set,
		// cette regex est détaillée dans plugin/sciz-oukonenest.js
		scizEventRegex = /^\d\d\/\d\d\/20\d\d \d\dh\d\d:\d\d [A-zÀ-ÿ]{3,}(?: [A-zÀ-ÿ\[\]]{2,})*(?: \(([^)]+)\))? de ([^(]+) \((\d+)\) sur ([^(]+) \((\d+)\)/,
		scizBotName = "SCIZ-Bot";

	const cachetteRegexes = [
		/la cachette de la carte \((\d+)\)\./,
		/Carte de la Cachette # (\d+)/
	];

	mountyhall.seeMessage = function(message){
		const c = message.content;
		if (!c) return;
		// message SCIZ
		if (message.authorname==scizBotName) {
			var match = message.content.match(scizEventRegex);
			console.log('match:', match);
			if (match) {
				completionSet.add(match[4]+" ("+match[5]+")");
			}
			return;
		}
		// trolls & monstres
		for (var i=mountyhall.searchRegexes.length; i--;) {
			var match = c.match(mountyhall.searchRegexes[i]);
			if (match) {
				completionSet.add(match[1]+" ("+match[2]+")");
			}
		}
		// cachettes de capitan
		for (var i=cachetteRegexes.length; i--;) {
			var match = c.match(cachetteRegexes[i]);
			if (match) {
				completionSet.add("carte " + match[1]);
			}
		}
	}

	mountyhall.autocompleteOukonenestCommandArgument = function(ac){
		return {
			matches: Array.from(completionSet.values()).reverse(),
			replaced: ac.args,
			mustCheck: true
		};
	}

});


