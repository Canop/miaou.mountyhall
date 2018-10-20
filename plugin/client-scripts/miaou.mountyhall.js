miaou(function(mountyhall, ed, gui, locals, md, plugins, prefs){

	var	SHOW_TROLL_BUBBLES = false,
		numReplacer = new Groumf();

	numReplacer.skipTags('a', 'span', 'pre', 'code', 'i');

	var charmap = {
		'"': '&quot;',
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;'
	};
	function escapeForTitle(s){
		return s.replace(/[&<>"]/g, function(c){
			return charmap[c];
		});
	}

	// this function is called on messages after they've been already rendered
	function renderMessage($c, message){
		if (message.room != locals.room.id) {
			return;
		}
		mountyhall.seeMessage(message);
		mountyhall.trollNamesReplacer.replaceTextWithHTMLInHTML($c[0], function(name, id){
			// replacing troll names
			return '<a target=_blank href='+mountyhall.urlBase+'View/PJView.php?ai_IDPJ='+id+
				' title="Troll : '+escapeForTitle(mountyhall.trollsById[id] || name)+' ( '+id+' )"'+
				' class=mountyhall'+
				'>'+name+'</a>';
		});
		numReplacer.replaceTextWithHTMLInHTMLUsingRegex($c[0], /\b\d{5,7}\b/g, function(s, i, t){
			var id = +s;
			if (id>1000000) { // monstre
				return '<a target=_blank href='+mountyhall.urlBase+'View/MonsterView.php?ai_IDPJ='+id+
					' title="Monstre n° '+id+'"'+
					' class=mountyhall'+
					'>'+id+'</a>';
			} else {
				var name = mountyhall.trollsById[+id];
				if (!name) return id;
				var after = t.slice(i+s.length);
				if (/^\s*(pv|%|points)/i.test(after)) return id; // let's not replace "5000" in "j'ai enlevé 5000 pv"
				return '<a target=_blank href='+mountyhall.urlBase+'View/PJView.php?ai_IDPJ='+id+
					' title="Troll : '+escapeForTitle(name)+' ( '+id+' )"'+
					' class=mountyhall'+
					'>'+id+'</a>';
			}

		});
	}

	plugins.mountyhall = {
		start: function(){
			if (locals.room.tags.indexOf("MountyHall")===-1) return;
			md.registerRenderer(renderMessage, true);
			ed.registerCommandArgAutocompleter("troll", mountyhall.autocompleteTrollCommandArgument);
			ed.registerCommandArgAutocompleter("oukonenest", mountyhall.autocompleteOukonenestCommandArgument);
			ed.registerCommandArgAutocompleter("partage", [
				["update", ["troll", "room", "vue"]],
				["requests", ["user", "room"]],
				["on"],
				["remove"],
				["off"],
				["list"],
			]);
			mountyhall.urlBase = (function(){
				let pref = prefs.get("mountyhall.url");
				if (pref=="raistlin") {
					return "https://mh.mh.raistlin.fr/mountyhall/"
				}
				if (pref=="raistlin-mz") {
					return "https://mh2.mh.raistlin.fr/mountyhall/"
				}
				if ((pref=="auto" && gui.mobile) || pref=="smartphone") {
					return "https://smartphone.mountyhall.com/mountyhall/";
				}
				// ((pref=="auto" && !gui.mobile) || pref=="standard") :
				return "https://games.mountyhall.com/mountyhall/";
			})();
			mountyhall.startPartage();
			mountyhall.startSpots();
		}
	}

	if (SHOW_TROLL_BUBBLES && !gui.mobile) {
		$("#messages").bubbleOn("a.mountyhall", {
			blower: function($c){
				$c.load(this.attr("href"));
			},
			classes: "mountyhall-bubble",
		});
	}
});
