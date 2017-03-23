miaou(function(mountyhall, chat, gui, locals, time, ws){

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

	function buildTeamBox(){
		var	$box = $("<div id=mountyhall-team-box>").appendTo("body"),
			$head = $("<div class=header>").appendTo($box),
			updateAllEnabled = true,
			$t = $("<div class=mountyhall-team-troll>").appendTo($box);
		$("<div class=nom>").text("Troll").appendTo($t);
		$("<div class=raceNiveau>").text("").appendTo($t);
		$("<div class=pv>").text("PV").appendTo($t);
		$("<div class=pvMax>").text("max").appendTo($t);
		$("<div class=x>").text("x").appendTo($t);
		$("<div class=y>").text("y").appendTo($t);
		$("<div class=n>").text("n").appendTo($t);
		$("<div class=pa>").text("PA").appendTo($t);
		$("<div class=jdla-dla>").text("DLA").appendTo($t);
		$("<div class=jdla-dla>").text("PDLA").appendTo($t);
		$("<div class=fat>").text("fat.").appendTo($t);
		$("<div class=action>").appendTo($t);
		$("<div id=mountyhall-team-trolls>").appendTo($box);
		$("<div id=mountyhall-team-refresh-button>").appendTo($head).click(function(){
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
				console.log('update:', update);
				if (update && update.newest) {
					var adj = update.newest===update.oldest ? "totale" : "partielle";
					txt.push("Mise à jour " + adj + ": " + time.formatTime(update.newest));
				}
				if (!updateAllEnabled) txt.push("Action désactivée car juste appelée");
				$c[0].innerText = txt.join("\n");
			}
		});
		$("<div id=mountyhall-team-toggle-button>").text("▶").appendTo($head).click(function(){
			if ($box.hasClass("reduced")) {
				$box.removeClass("reduced").addClass("full");
			} else {
				$box.removeClass("full").addClass("reduced");
			}
		});
		$box.addClass("reduced");
	}

	function fillTeamBox(trolls){
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
				p = troll.profil2;
			$("<a class=nom>")
			.attr("href", "https://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ="+troll.id)
			.attr("target", "troll_"+troll.id)
			.text(troll.nom).appendTo($t);
			$("<div class=raceNiveau>").text(raceLetter(troll.race)).appendTo($t); // fixme niveau du troll???
			if (!p) {
				$("<div class=missing>").text("Pas de données").appendTo($t);
				return $t;
			}
			p.pdla = p.dla+p.dur*60;
			if (!(update.newest>p.requestTime)) update.newest = p.requestTime;
			if (!(update.oldest<p.requestTime)) update.oldest = p.requestTime;
			if (p.pv<30 || p.pv<p.pvMax*.35) $t.addClass("health-red");
			else if (p.pv<40 || p.pv<p.pvMax*.6) $t.addClass("health-orange");
			else if (p.pv<p.pvMax*.9) $t.addClass("health-yellow");
			else $t.addClass("health-green");
			if (p.invi || p.cam) $t.addClass("invi");
			$("<div class=pv>").text(p.pv).appendTo($t);
			$("<div class=pvMax>").text(p.pvMax).appendTo($t);
			$("<div class=x>").text(p.x).appendTo($t);
			$("<div class=y>").text(p.y).appendTo($t);
			$("<div class=n>").text(p.n).appendTo($t);
			$("<div class=pa>").text(p.pa).appendTo($t);
			$("<div class=jdla>").text(timeJJMM(p.dla)).appendTo($t);
			$("<div class=dla>").text(timeHHmm(p.dla)).appendTo($t);
			$("<div class=jdla>").text(timeJJMM(p.pdla)).appendTo($t);
			$("<div class=dla>").text(timeHHmm(p.pdla)).appendTo($t); // bubble with time.formatTime ?
			$("<div class=fat>").text(p.fat).appendTo($t);
			$("<div class=action>").append(
				$("<div class=mountyhall-refresh-troll>").click(function(){
					chat.sendMessage("!!partage update troll @" + troll.miaouUser.name);
				})
			).appendTo($t); // bubble with time.formatTime ?
			$("<div class=details>").text([
				p.invi && "invi",
				p.camou && "camou",
				p.int && "intangible",
				p.parades && (p.parades+" parades"),
				p.contras && (p.contras+" contre-attaques"),
				p.atts && (p.atts+" attaques subies")
			].filter(Boolean).join(", ")).appendTo($t);
			$t.bubbleOn({
				side: "right",
				text:	"Dernière mise à jour: " + time.formatTime(p.requestTime)+"\n"+
					"Troll associé à @" + troll.miaouUser.name
			});
			return $t;
		}));
		$("#mountyhall-team-box").dat("update", update);
	}

	// démarre toutes la mécanique des partags
	mountyhall.startPartage = function(){
		if (gui.mobile || !locals.room.private) {
			return;
		}
		ws.on("mountyhall.setRoomTrolls", function(trolls){
			console.log('room trolls:', trolls);
			if (trolls && trolls.length) fillTeamBox(trolls);
			else $("#mountyhall-team-box").remove();
		});
		chat.on("ready", function(){
			ws.emit("mountyhall.getRoomTrolls", {});
		});
	}
});

