
miaou(function(mountyhall){

	mountyhall.autocompleteTrollCommandArgument = function(ac){
		if (ac.previous || !ac.arg.length) return;
		var	lcarg = ac.arg.toLowerCase(),
			lcmap = mountyhall.lowerCasedTrollNames,
			matches = [];
		for (var lcname in lcmap) {
			if (!lcname.indexOf(lcarg)) {
				matches.push(lcmap[lcname]);
			}
		}
		return matches;
	}

});

