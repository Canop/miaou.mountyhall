miaou(function(mountyhall, locals, md, plugins){

	var numReplacer = new Groumf();
	numReplacer.skipTags('a', 'pre', 'code');

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
		mountyhall.trollNamesReplacer.replaceTextWithHTMLInHTML($c[0], function(name, id){
			// replacing troll names
			return '<a target=_blank href=http://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ='+id+
				' title="Troll : '+escapeForTitle(mountyhall.trollsById[id] || name)+' ( '+id+' )"'+
				' class=mountyhall'+
				'>'+name+'</a>';
		});
		numReplacer.replaceTextWithHTMLInHTMLUsingRegex($c[0], /\b\d{5,7}\b/g, function(s, i, t){
			var id = +s;
			if (id>1000000) { // monstre
				return '<a target=_blank href=http://games.mountyhall.com/mountyhall/View/MonsterView.php?ai_IDPJ='+id+
					' title="Monstre n° '+id+'"'+
					' class=mountyhall'+
					'>'+id+'</a>';
			} else {
				var name = mountyhall.trollsById[+id];
				if (!name) return id;
				var after = t.slice(i+s.length);
				if (/^\s*(pv|%|points)/i.test(after)) return id; // let's not replace "5000" in "j'ai enlevé 5000 pv"
				return '<a target=_blank href=http://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ='+id+
					' title="Troll : '+escapeForTitle(name)+' ( '+id+' )"'+
					' class=mountyhall'+
					'>'+id+'</a>';
			}

		});
	}

	plugins.mountyhall = {
		start: function(){
			if (/\[MH\]/i.test(locals.room.description)) {
				md.registerRenderer(renderMessage, true);
			}
		}
	}
});
