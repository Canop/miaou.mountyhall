miaou(function(mountyhall, ed, gui, locals, md, plugins){

	var	SHOW_TROLL_BUBBLES = false,
		numReplacer = new Groumf();

	numReplacer.skipTags('a', 'span', 'pre', 'code');

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
			return '<a target=_blank href=https://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ='+id+
				' title="Troll : '+escapeForTitle(mountyhall.trollsById[id] || name)+' ( '+id+' )"'+
				' class=mountyhall'+
				'>'+name+'</a>';
		});
		numReplacer.replaceTextWithHTMLInHTMLUsingRegex($c[0], /\b\d{5,7}\b/g, function(s, i, t){
			var id = +s;
			if (id>1000000) { // monstre
				return '<a target=_blank href=https://games.mountyhall.com/mountyhall/View/MonsterView.php?ai_IDPJ='+id+
					' title="Monstre n° '+id+'"'+
					' class=mountyhall'+
					'>'+id+'</a>';
			} else {
				var name = mountyhall.trollsById[+id];
				if (!name) return id;
				var after = t.slice(i+s.length);
				if (/^\s*(pv|%|points)/i.test(after)) return id; // let's not replace "5000" in "j'ai enlevé 5000 pv"
				return '<a target=_blank href=https://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ='+id+
					' title="Troll : '+escapeForTitle(name)+' ( '+id+' )"'+
					' class=mountyhall'+
					'>'+id+'</a>';
			}

		});
	}

	plugins.mountyhall = {
		start: function(){
			if (~locals.room.tags.indexOf("MountyHall")) {
				md.registerRenderer(renderMessage, true);
				ed.registerCommandArgAutocompleter("troll", mountyhall.autocompleteTrollCommandArgument);
				ed.registerCommandArgAutocompleter("oukonenest", mountyhall.autocompleteOukonenestCommandArgument);
				ed.registerCommandArgAutocompleter("partage", mountyhall.autocompletePartageCommandArgument);
				mountyhall.startPartage();
			}
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
