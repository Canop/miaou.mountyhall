miaou(function(mountyhall, locals){

	if ((!locals.room) || !~locals.room.tags.indexOf("MountyHall")) {
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
		"paf", "parfait", 'pas', "pâquerette", "pépin", "phoenix", "personne", "poil", "portnawak",
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

	var lowerCasedTrollNames = {};
	for (var name in window.mh_trolls) {
		lowerCasedTrollNames[name.toLowerCase()] = name;
	}

	// alias
	[
		['squ@le', 'squale'],
		['cebolla', 'cébo'],
		['cebolla', 'cebo'],
		['cirederf', 'cire'],
		['bob-le-troll', 'bobtroll'],
		['bob-le-troll', 'blt'],
		['kergrog', 'kerg'],
		['gogo27', 'g27'],
		['Gnu Sauvage [Chef de Harde]', 'gnu'],
		['Gruhtzog', 'grutz'],
		['schtroumph_vert_pomme', 'svp'],
		['Shaksgärt', 'Shaks'],
		['Valfëan', 'Valfean'],
		['wouchy', 'wouch'],
		['TuttiRikikiMaoussKosTroll', 'Raistlin'],
		['lulu vroumette', 'lulu', true],
	].forEach(function(e){
		var	name = lowerCasedTrollNames[e[0].toLowerCase()],
			alias = e[1].toLowerCase(),
			force = e[2],
			existing = lowerCasedTrollNames[alias];
		if (!name) {
			console.log("troll introuvable:", e[0]);
			return;
		}
		if (existing) {
			console.log("conflit:", alias, "->", name, " existing:", existing);
			if (force) console.log("(conflit résolu par la force)");
			else return;
		}
		lowerCasedTrollNames[alias] = name;
	});

	mountyhall.trollsById = {};
	var replacer = new Groumf();
	for (var lcname in lowerCasedTrollNames) {
		if (excludeMap[lcname]) continue;
		var	name = lowerCasedTrollNames[lcname],
			id = window.mh_trolls[name];
		mountyhall.trollsById[id] = name;
		if (lcname==+lcname) lcname = 'T'+lcname;
		if (lcname.length>2) replacer.add(lcname, id);
	}
	replacer.skipTags('a', 'pre', 'code');
	mountyhall.trollNamesReplacer = replacer;

	window.mh_trolls = null;
});
