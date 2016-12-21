miaou(function(mountyhall, locals){

	if ((!locals.room) || !/\[MH\]/i.test(locals.room.description)) {
		window.mh_trolls = null;
		return;
	}

	var excludeMap = {};
	// removing common names (yes, it looks like they're common on miaou...)
	// but they're still used when searching by number
	[
		"ade", "arf", 'autre', "aura",
		"balrog", "beurk", "belle", "bibi", "bidouille", "blabla", "blanche", "bleu", "bof",
		"bol", "boom", "boum", "boss", "bouarf", "boulette",
		"ca va chier", "caché", "caribou", "cat", "cerne", "champion", 'chonchon', "claire",
		"clic", "courte", "crash", "cross",
		"dark", "darkling", "désolé", "diablotin", "dodo", 'don', "dragon", "dudu",
		"espace",
		"fan", "fanatique", "fichtre", "folie",
		"glop", "gné", "gniark", "gogo", "golem", "gowaps", "gros", "guy",
		"hein ?", "hum", "hypnos", "hypnotiseur",
		"imagine", "inscription", "invi", "ira",
		"kaboum", "kastar", "kill",
		"la montagne", "lagavulin", "late", "l'autre", "le troll", "link", "lourd",
		"malus", "maman", "mauvais", 'max', "meuh", 'merci', "miam", "minuscule", "mithril", "mini", "moche",
		'moi', "monsieur", "monstre", "mort", "mounty", "mumuse", "musaraigne",
		"ninix", "noob", "nos",
		"okey", "ombre", "origine", "ouille", "oups",
		"paf", "parfait", 'pas', "pâquerette", "pépin", "phoenix", "personne", "poil",
		"poison", "popo", "poulet", "pourri", "pub",
		"raaaaah", "refait", "retrouver", "roc", "rose", "roulette",
		"salade", "silence", 'son', "songe", "sorcière", "souris", "six", "sphynx", "steack", "sushi", "sympa",
		'test', "titan", "tomawak", 'trolette', 'troll', "trollinet", "trou", "truc",
		"vrille",
		"wiki",
		"yop",
		"zog",
		"...", "\\o/"
	].forEach(function(k){
		excludeMap[k] = true;
	});
	mountyhall.trollsById = {};
	var replacer = new Groumf();
	for (var name in window.mh_trolls) {
		var id = window.mh_trolls[name];
		mountyhall.trollsById[id] = name;
		if (excludeMap[name.toLowerCase()]) continue;
		if (name==+name) name = 'T'+name;
		if (name.length>2) replacer.add(name, id);
	}
	replacer.skipTags('a', 'pre', 'code');
	mountyhall.trollNamesReplacer = replacer;

	function alias(){
		var o = arguments[0],
			id = replacer.get(o);
		if (!id) {
			console.log("original for alias not found :", o);
		}
		for (var i=1; i<arguments.length; i++) {
			var a = arguments[i];
			if (replacer.get(a)) {
				console.log('alias prevented :', a);
				continue;
			}
			replacer.add(a, id);
		}
	}

	// a few aliases
	alias('divadel', 'diva');
	alias('squ@le', 'squale');
	alias('cebolla', 'cébo', 'cebo');
	alias('cirederf', 'cire');
	alias('bob-le-troll', 'blt', 'bobtroll');
	alias('kergrog', 'kerg');
	alias('gogo27', 'g27');
	alias('Gnu Sauvage [Chef de Harde]', 'gnu');
	alias('Gruhtzog', 'grutz');
	alias('schtroumph_vert_pomme', 'svp');
	alias('Shaksgärt', 'Shaks');
	alias('Valfëan', 'Valfean');
	alias('wouchy', 'wouch');
	alias('TuttiRikikiMaoussKosTroll', 'Raistlin');

	window.mh_trolls = null;
});
