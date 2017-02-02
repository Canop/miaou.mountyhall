// client side part of the !!troll command
// That is: autocompletion
miaou(function(mountyhall){

	mountyhall.autocompleteTrollCommandArgument = function(ac){
		if (!ac.args.length) return;
		var	lcarg = ac.args.toLowerCase(),
			lcmap = mountyhall.lowerCasedTrollNames,
			matches = [];
		for (var lcname in lcmap) {
			if (!lcname.indexOf(lcarg)) {
				matches.push(lcmap[lcname]);
			}
		}
		return {
			matches: matches,
			replaced: lcarg,
			mustCheck: false
		};
	}

});

