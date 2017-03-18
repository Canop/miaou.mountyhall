// client side part of the !!oukonenest command
// That is: autocompletion
miaou(function(mountyhall){

	const completionSet = new Set;

	const cachetteRegexes = [
		/la cachette de la carte \((\d+)\)\./,
		/Carte de la Cachette # (\d+)/
	];

	mountyhall.seeMessage = function(m){
		const c = m.content;
		if (!c) return;
		// trolls & monstres
		for (var i=mountyhall.searchRegexes.length; i--;) {
			var m = c.match(mountyhall.searchRegexes[i]);
			if (m) {
				completionSet.add(m[1]+" ("+m[2]+")");
			}
		}
		// cachettes de capitan
		for (var i=cachetteRegexes.length; i--;) {
			var m = c.match(cachetteRegexes[i]);
			if (m) {
				completionSet.add("carte " + m[1]);
			}
		}
	}

	mountyhall.autocompleteOukonenestCommandArgument = function(ac){
		return {
			matches: Array.from(completionSet.values().reverse()),
			replaced: ac.args,
			mustCheck: true
		};
	}

});


