// Groumpf by denys.seguret@gmail.com
// https://github.com/Canop/groumf

(function(){

	function opt(options, name, defaultValue){
		if (!opt || opt[name]===undefined) return defaultValue;
		return opt[name];
	}

	function Groumf(options){
		this.forest = {};
		this.skippedTags = {};
		this.dontCutWords = opt(options, 'dontCutWords', true);
		this.skipTags("audio", "img", "svg", "title", "video");
	}

	Groumf.prototype.skipTags = function(){
		for (var i=0; i<arguments.length; i++) this.skippedTags[arguments[i].toUpperCase()] = true;
	}
	Groumf.prototype.dontSkipTags = function(){
		for (var i=0; i<arguments.length; i++) this.skippedTags[arguments[i].toUpperCase()] = false;
	}


	// add an expression to search. The value is optionnal, and would be given
	// to a callback or be used as replacement value if the replacer is used without
	// callback.
	Groumf.prototype.add = function(expr,  value){
		if (expr.length<3) return console.log('Expression "'+expr+'" ignored : too short');
		var root = expr.slice(0,3).toLowerCase(),
			tree = this.forest[root];
		if (!tree) tree = this.forest[root] = [];
		tree.push({p:expr.toLowerCase(),v:value||expr});
		tree.sort(function(a,b){
			return b.p.length-a.p.length
		});
	}

	// searches the added expressions for a case insensitive equivalent.
	// returns the originally added expression or its value if any.
	Groumf.prototype.get = function(expr){
		var lexpr = expr.toLowerCase(),
			tree = this.forest[lexpr.slice(0,3)];
		if (!tree) return;
		for (var i=0; i<tree.length; i++) {
			if (tree[i].p===lexpr) return tree[i].v;
		}
	}


	// replace(string) : replace all occurences of the expressions by the corresponding value
	// replace(string, callback) : replace all occurences of the expressions by what the callback returns (it receives the string and the corresponding value)
	// replace(string, string, string) : equivalent to string.replace(string, string)
	// replace(string, regex, string) : equivalent to string.replace(regex, string)
	// replace(string, regex, cb) : equivalent to string.replace(regex, cb)
	// when the first argument isn't a string but an element, the function is applied (same arguments) on all text nodes descendant of that element
	Groumf.prototype.replace = function(input, cb, arg3){
		var nodes = input.childNodes;
		if (nodes) {
			// replacing in an element
			for (var i=nodes.length; i--;) {
				var node = nodes[i];
				if (node.nodeType===3) {
					var initialText = node.nodeValue,
						changedText = this.replace(initialText, cb, arg3);
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
					if (!this.skippedTags[node.tagName]) this.replace(node, cb, arg3);
				}
			}
			return input;
		} else {
			// replacing in a string (hopefully)
			if (arg3) return input.replace(cb, arg3);
			var end = input.length-2,
				output = [],
				copied = 0,
				char;
			for (var p=0; p<end; p++) {
				if (this.dontCutWords && p && /\w/.test(input[p-1])) continue;
				var root = input.slice(p, p+3).toLowerCase(),
					tree = this.forest[root];
				if (!tree) continue;
				for (var i=0; i<tree.length; i++) {
					var pat = tree[i].p;
					if (this.dontCutWords && (char=input[p+pat.length]) && /\w/.test(char)) continue;
					var cur = input.slice(p, p+pat.length);
					if (cur.toLowerCase()===pat) {
						var r = cb ? cb(cur, tree[i].v) : tree[i].v;
						if (p) output.push(input.slice(copied, p));
						output.push(r);
						p += pat.length;
						copied = p;
						break;
					}
				}
			}
			output.push(input.slice(copied, input.length));
			return output.join('');
		}
	}

	if (typeof module !== "undefined") module.exports = Groumf;
	else if (window) window.Groumf = Groumf;

})();
