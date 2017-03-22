// client side part of the !!partage command
// That is: autocompletion
miaou(function(mountyhall){

	const argSequences = [
		["update", ["troll", "room"]],
		["requests", ["user", "room"]],
		["on"],
		["off"],
		["list"],
	];
	const NB_DEEP_ARGS = 2;
	const firstArgs = argSequences.map(function(v){
		return v[0];
	});

	mountyhall.autocompletePartageCommandArgument = function(ac){
		if (!ac.previous) return firstArgs;
		for (var i=0; i<NB_DEEP_ARGS; i++) {
			var arr = argSequences[i];
			if (arr.length>1 && arr[0]===ac.previous) {
				return arr[1];
			}
		}
	}

});


