miaou(function(mountyhall, chat, gui, locals, time, ws){

	const isAdmin = locals.room && (locals.room.auth==="admin" || locals.room.auth==="owner");

	mountyhall.partage = {};

	function raceLetter(race){
		if (race==="Darkling") return "G";
		return race[0];
	}

	function timeJJMM(time){
		var	date = new Date(time*1000),
			d = date.getDate(), m = date.getMonth()+1;
		return (d<10?'0':'')+d+'/'+(m<10?'0':'')+m;
	}
	function timeHHmm(time){
		var	date = new Date(time*1000),
			m = date.getMinutes(), h = date.getHours();
		return (h<10?'0':'')+h+':'+(m<10?'0':'')+m;
	}

	function wrapDRD(drd){
		if (!drd) return "";
		let {N, S, C} = drd;
		if (!N || !S) return drd; // this is probably a number or a string
		let mean = +N * (+S+1)/2 + (+C||0);
		let s = N+"D"+S;
		if (C>0) s+= "+"+C;
		else if (C<0) s+= C;
		return `<span class=dice-roll-def data-def="${s}">${mean}</span>`;
	}

	function buildTeamBox(){
		var	$box = $("<div id=mountyhall-team-box>").appendTo("body"),
			$head = $("<div class=header>").appendTo($box),
			$buttons = $("<div class=buttons>").appendTo($head),
			updateAllEnabled = isAdmin,
			$t = $("<div class=mountyhall-team-troll>").appendTo($box);
		if (gui.mobile) $box.addClass("minimized");
		$("<div class=nom>").text("Troll").appendTo($t);
		$("<div class=raceNiveau>").text("").appendTo($t);
		$("<div class=pv>").text("PV").appendTo($t);
		$("<div class=pvMax>").text("max").appendTo($t);
		$("<div class=x>").text("x").appendTo($t);
		$("<div class=y>").text("y").appendTo($t);
		$("<div class=n>").text("n").appendTo($t);
		$("<div class=pa>").text("PA").appendTo($t);
		$("<div class=jdla-dla>").text("DLA1").appendTo($t);
		$("<div class=jdla-dla>").text("DLA2").appendTo($t);
		$("<div class=fat>").text("fat.").appendTo($t);
		$("<div class=action>").appendTo($t);
		$("<div id=mountyhall-team-trolls>").appendTo($box);
		$("<div id=mountyhall-team-minimize-button>").text("◀")
		.appendTo($buttons).click(function(){
			if ($box.hasClass("minimized")) {
				$box.removeClass("minimized");
			} else {
				$box.addClass("minimized");
			}
		});
		$("<div id=mountyhall-team-open-view-button>")
		.appendTo($buttons).click(mountyhall.toggleSharedView);
		$("<div id=mountyhall-team-refresh-button>").appendTo($buttons).click(function(){
			if (!updateAllEnabled) return;
			chat.sendMessage("!!partage update room");
			$(this).addClass("disabled");
			updateAllEnabled = false;
		}).bubbleOn({
			side: "top",
			blower: function($c){
				var txt = [
					"Mettre à jour tous les trolls",
					"Attention: le nombre d'appels est limité"
				];
				var update = $box.dat("update");
				if (update && update.newest) {
					var	complete  = update.newest===update.oldest,
						adj = complete ? "totale" : "partielle";
					txt.push("Mise à jour " + adj + ": " + time.formatTime(update.newest));
					if (!complete) {
						txt.push("Données les plus anciennes: " + time.formatTime(update.oldest));
					}
				}
				if (!isAdmin) txt.push("Le rafraichissement global est réservé aux admins de la salle");
				else if (!updateAllEnabled) txt.push("Action désactivée car juste appelée");
				$c[0].innerText = txt.join("\n");
			}
		}).toggleClass("disabled", !updateAllEnabled);
		$("<div id=mountyhall-team-toggle-button>").text("▶").appendTo($buttons).click(function(){
			if ($box.hasClass("reduced")) {
				$box.removeClass("reduced").addClass("full");
			} else {
				$box.removeClass("full").addClass("reduced");
			}
		});
		$box.addClass("reduced");
	}

	function updateTimeBars(){
		var time = Date.now()/1000;
		$(".mountyhall-time-bar").each(function(){
			var	$this = $(this),
				range = $this.dat("range"),
				p = (time-range[0])/(range[1]-range[0]);
			if (p<0) p = 0;
			else if (p>1) p = 1;
			$this.width(p*100+"%");
		});
	}

	function tot(c){
		return c ? c.CAR+c.BMP+c.BMM : "?";
	}

	function fillTeamBox(trolls){
		mountyhall.partage.trolls = trolls;
		if (!$("#mountyhall-team-box").length) {
			buildTeamBox();
		}
		var update = {
			newest: NaN,
			oldest: NaN
		};
		trolls.sort(function(a, b){
			return a.nom.toLowerCase() < b.nom.toLowerCase() ? -1 : 1;
		});
		$("#mountyhall-team-trolls").empty().append(trolls.map(function(troll){
			var	$t = $("<div class=mountyhall-team-troll>"),
				p = troll.profil4;
			$("<a class=nom>")
			.attr("href", mountyhall.urlBase + "View/PJView.php?ai_IDPJ="+troll.id)
			.attr("target", "troll_"+troll.id)
			.text(troll.nom).appendTo($t);
			if (!p) {
				$("<div class=missing>").text("Pas de données").appendTo($t);
				return $t;
			}
			var rnc = p.raceNomCourt;
			if (!rnc) rnc = raceLetter(troll.race);
			$("<div class=raceNiveau>").text(rnc+p.niveau).appendTo($t);
			p.pv = p.caracs.pvActuels ? p.caracs.pvActuels.CAR : "?";
			p.pvMax = tot(p.caracs.pvMax);
			p.pdla = p.dla+p.dureeTour*60;
			var	now = Date.now()/1000|0,
				obsolete = p.requestTime < now - 24*60*60;
			if (!(update.newest>p.requestTime)) update.newest = p.requestTime;
			if (!(update.oldest<p.requestTime)) update.oldest = p.requestTime;
			$("<div class=pv>").text(p.pv).appendTo($t);
			$("<div class=pvMax>").text(p.pvMax).appendTo($t);
			$("<div class=x>").text(p.x).appendTo($t);
			$("<div class=y>").text(p.y).appendTo($t);
			$("<div class=n>").text(p.n).appendTo($t);
			if (typeof p.fatigue === "object") {
				p.fatigue = p.fatigue.CAR + p.fatigue.BM;
			}
			if (!obsolete) {
				if (p.invi || p.cam) $t.addClass("invi");
				if (p.pv>=p.pvMax) $t.addClass("health-green");
				else if ((p.pv<40&&p.pvMax>60) || p.pv<p.pvMax*.37) $t.addClass("health-red");
				else if (p.pv<40 || p.pv<p.pvMax*.6) $t.addClass("health-orange");
				else if (p.pv<p.pvMax*.9) $t.addClass("health-yellow");
				else $t.addClass("health-green");
				$("<div class=pa>").text(p.pa).appendTo($t);
				$("<div class=jdla>").text(timeJJMM(p.dla)).appendTo($t);
				$("<div class=dla>").text(timeHHmm(p.dla)).appendTo($t);
				$("<div class=jdla>").text(timeJJMM(p.pdla)).appendTo($t);
				$("<div class=dla>").text(timeHHmm(p.pdla)).appendTo($t); // bubble with time.formatTime ?
				$("<div class=fat>").text(p.fatigue).appendTo($t);
				$("<div class=mountyhall-time-bar>").appendTo(
					$('<div class="mountyhall-time-bar-wrapper wrapper1">').appendTo($t)
				).dat("range", [p.dla-p.dureeTour*60, p.dla]);
				$("<div class=mountyhall-time-bar>").appendTo(
					$('<div class="mountyhall-time-bar-wrapper wrapper2">').appendTo($t)
				).dat("range", [p.dla, p.pdla]);
			} else {
				$("<div class=obsolete>").text("données obsolètes").appendTo($t);
			}
			$("<div class=action>").append(
				$("<div class=mountyhall-refresh-troll>").click(function(){
					chat.sendMessage("!!partage update troll @" + troll.miaouUser.name);
				})
			).appendTo($t); // bubble with time.formatTime ?
			if (!obsolete) {
				$("<div class=details>").text([
					p.invisible && "invi",
					p.course && "en course",
					p.camouflage && "camou",
					p.levitation && "lévite",
					p.intangible && "intangible",
					p.nbParades && (p.nbParades + (p.nbParades>1 ? " parades" : " parade")),
					p.nbCA && (p.nbCA + (p.nbCA>1 ? " contre-attaques" : " contre-attaque")),
					p.nbEsq && (p.nbEsq + " dés d'esquive en moins"),
				].filter(Boolean).join(", ")).appendTo($t);
			}
			let strikes = mountyhall.strikes(p);
			let tbl = "<table>" + [
				"<tr><th></th><th>att</th><th>deg</th><th></th>",
				...strikes.map(s=> "<tr>" +
					"<td>"+s.name+"</td>"+
					"<td>"+wrapDRD(s.att)+"</td>"+
					"<td>"+wrapDRD(s.deg)+ (s.crit ? (" / " + wrapDRD(s.crit)) : "") + "</td>"+
					"<td>"+(s.details || "")+"</td>"+
					"</tr>"
				)
			].join("\n") + "</table>";
			$t.bubbleOn({
				side: "right",
				html: [
					tbl,
					"Dernière mise à jour: " + time.formatTime(p.requestTime),
					"Troll associé à @" + troll.miaouUser.name,
				].join("<br>")
			});
			return $t;
		}));
		$("#mountyhall-team-box").dat("update", update);
		updateTimeBars();
	}

	// démarre toutes la mécanique des partags
	mountyhall.startPartage = function(){
		if (!locals.room.private) return;
		ws.on("mountyhall.setRoomTrolls", function(trolls){
			console.log('room trolls:', trolls);
			if (trolls && trolls.length) fillTeamBox(trolls);
			else $("#mountyhall-team-box").remove();
		});
		ws.on("mountyhall.setViewPlayer", function(trollview){
			console.log('set view troll:', trollview);
			mountyhall.setViewContent(trollview);
		});
		chat.on("ready", function(){
			ws.emit("mountyhall.getRoomTrolls", {});
		});
		setInterval(updateTimeBars, 5*60*1000);
	}
});

