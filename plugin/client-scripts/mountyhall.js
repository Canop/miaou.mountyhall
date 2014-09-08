miaou(function(mountyhall, md, plugins){

	function changeText(element, f){
		var nodes = element.childNodes;
		for (var i=nodes.length; i--;) {
			var node = nodes[i];
			if (node.nodeType===3) {
				var initialText = node.nodeValue,
					changedText = f(initialText);
				if (changedText && changedText!==initialText) {
					if (/</.test(changedText)) {
						// lazy implementation : we replace the text node with a span
						var newNode = document.createElement('span');
						newNode.innerHTML = changedText;
						node.parentNode.insertBefore(newNode, node);
						node.parentNode.removeChild(node);
					} else {
						node.nodeValue = changedText;
					}
				}
			} else {
				switch (node.tagName){
				case "IMG": case "A": case "CODE": case "SVG": case "AUDIO": case "VIDEO": case "TITLE":
					continue;
				default:
					changeText(node, f);
				}
			}
		}
	}
	
	var charmap = {
		'"': '&quot;',
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;'
	};
	function escapeForTitle(s){
		return s.replace(/[&<>"]/g, function(c) {
			return charmap[c];
		});
	}
	
	// this function is called on messages after they've been already rendered
	function renderMessage($c){
		changeText($c[0], function(s){
			return s.replace(/['\-\d@A-Z_a-z~\xa1-\xac\xae-\xaf\xb5-\xba\xc0-\xfe]{3,}/g, function(s, i, t){
				var r;
				if (+s>1000) {
					r = mountyhall.trollsById[s];
					if (!r) return s;
					var after = t.slice(i+s.length);
					if (/^\s*(pv|%|points)/i.test(after)) return s; // let's not replace "5000" in "j'ai enlevé 5000 pv"
					return '<a target=_blank href=http://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ='+s+
						' title="Troll : '+escapeForTitle(r)+' ( '+s+' )"'+
						' class=mountyhall'+
						'>'+s+'</a>';
				}
				if ( r = mountyhall.trollsByName[s.toLowerCase()] ) {
					return '<a target=_blank href=http://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ='+r+
						' title="Troll : '+escapeForTitle(mountyhall.trollsById[r] || s)+' ( '+r+' )"'+						
						' class=mountyhall'+
						'>'+s+'</a>'
				}
				if (/^\d{7}$/.test(s)) {
					return '<a target=_blank href=http://games.mountyhall.com/mountyhall/View/MonsterView.php?ai_IDPJ='+s+
						' title="Monstre n° '+s+'"'+						
						' class=mountyhall'+
						'>'+s+'</a>'
				}
				return s;
			})			
		});
	}

	plugins.mountyhall = {
		start: function(){
			if (/\[MH\]/i.test(room.description)) {
				md.registerRenderer(renderMessage, true);
			}
		}
	}
});
