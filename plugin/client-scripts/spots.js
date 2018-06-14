// récupère des spots marqués dans des messages, pour
// qu'ils soient disponibles sur la vue partagée
miaou(function(mountyhall, fmt, md){

	const spots = [];

	mountyhall.allSpots = function(){
		return spots;
	}

	mountyhall.addSpot = function(spot){
		for (var i=spots.length; i--;) {
			if (spots[i].message.id===spot.message.id) {
				// note: this prevents several spots in the same message :\
				spots[i] = spot;
				return;
			}
		}
		spots.push(spot);
	}

	function render($c, message){
		if (!message.id) return;
		let $pragma = $c.find(".pragma-mhspot").first();
		if (!$pragma.length) return;
		var spot = {message};
		var r = /(\w+)=([\w+-]+)/g;
		var str = $pragma.text();
		var match;
		while ((match=r.exec(str))) {
			var v = match[2];
			if (v==+v) v = +v;
			spot[match[1]] = v;
		}
		console.log('spot:', spot);
		if (typeof spot.x !== "number" || typeof spot.y !== "number" || typeof spot.n !== "number") {
			console.log("invalid spot pragma", spot);
			return;
		}
		spot.text = message.content.split("\n").filter(line=>!/#mhspot/.test(line)).join("\n");
		mountyhall.addSpot(spot);
		$pragma
		.attr("title", "click to show the spot on the map")
		.click(function(){
			mountyhall.showSharedView(spot.troll);
		});
	}

	mountyhall.startSpots = function(){
		console.log("starting");
		fmt.whiteListPragma("mhspot");
		md.registerRenderer(render, true);
	}

});

