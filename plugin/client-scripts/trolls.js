miaou(function(mountyhall, locals){

	var debug = false;

	if ((!locals.room) || !~locals.room.tags.indexOf("MountyHall")) {
		window.mh_trolls = null;
		return;
	}

	var excludeMap = {};
	// removing common names (yes, it looks like they're common on miaou...)
	// but they're still used when searching by number
	[
		"ade", "arf", 'autre', "aura", "aventure",
		"balrog", "beurk", "belle", "bibi", "bidouille", "blabla", "blanche", "bleu", "bof",
		"bol", "boom", "boum", "boss", "bouarf", "boulette",
		"ca va chier", "caché", "caribou", "cassis", "cat", "cerne", "champion", 'chonchon', "chocolat",
		"claire", "clic", "courte", "crash", "cross",
		"dark", "darkling", "de pierre", "désolé", "diablotin", "dodo", 'don',
		"down", "dragon", "dudu", "durak", "durakuir",
		"espace",
		"fan", "fanatique", "fichtre", "fish", "folie", "forge",
		"giant", "glop", "gné", "gniark", "gogo", "golem", "gowaps", "gros", "guy",
		"hein ?", "hum", "hypnos", "hypnotiseur",
		"imagine", "inscription", "invi", "invisible", "ira",
		"kaboum", "kastar", "kill",
		"la bestiole", "la montagne", "lagavulin", "late", "l'autre", "le troll", "link", "lourd",
		"malus", "maman", "mars", "maudit", "mauvais", 'max', "meuh", 'merci', "miam", "minuscule",
		"mithril", "mini", "moche", 'moi', "monsieur", "monstre",
		"mort", "mounty", "mumuse", "musaraigne",
		"ninix", "noob", "nos",
		"okey", "ombre", "origine", "ouille", "oups",
		"paf", "parfait", 'pas', "pâquerette", "pépin", "phoenix", "personne", "poil", "portnawak",
		"poison", "popo", "poulet", "pourri", "pub",
		"raaaaah", "ratatouille", "refait", "retrouver", "roc", "rose", "roulette",
		"salade", "silence", "silver", "six", 'son', "songe", "sorcière", "souris",
		"sphynx", "steack", "sushi", "sympa",
		'test', "titan", "tomawak", 'trolette', 'troll', "trollinet", "trou", "truc",
		"vrille",
		"wiki",
		"yop",
		"zog",
		"...", "\\o/"
	].forEach(function(k){
		excludeMap[k] = true;
	});

	mountyhall.lowerCasedTrollNames = {};
	for (var name in window.mh_trolls) {
		mountyhall.lowerCasedTrollNames[name.toLowerCase()] = name;
	}

	// alias
	[
		['Le Comte Demont\'Cristo', 'comte'],
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
		['Shaksgärt', 'Shaks'],
		['skrûn-haï', 'skrun'],
		['Valfëan', 'Valfean'],
		['wouchy', 'wouch'],
		['TuttiRikikiMaoussKosTroll', 'Raistlin'],
		['lulu vroumette', 'lulu', true],
		['Animatrõll', 'Animatroll'],
		['Bunkeeeeeeeer', 'bkr'],
	].forEach(function(e){
		var	name = mountyhall.lowerCasedTrollNames[e[0].toLowerCase()],
			alias = e[1].toLowerCase(),
			force = e[2],
			existing = mountyhall.lowerCasedTrollNames[alias];
		if (!name) {
			if (debug) console.log("troll introuvable:", e[0]);
			return;
		}
		if (existing) {
			if (debug) console.log("conflit:", alias, "->", name, " existing:", existing);
			if (force) {
				if (debug) console.log("(conflit résolu par la force)");
			} else {
				return;
			}
		}
		mountyhall.lowerCasedTrollNames[alias] = name;
	});

	mountyhall.trollsById = {};
	var replacer = new Groumf();
	for (var lcname in mountyhall.lowerCasedTrollNames) {
		if (excludeMap[lcname]) continue;
		var	name = mountyhall.lowerCasedTrollNames[lcname],
			id = window.mh_trolls[name];
		mountyhall.trollsById[id] = name;
		if (lcname==+lcname) lcname = 'T'+lcname;
		if (lcname.length>2) replacer.add(lcname, id);
	}
	replacer.skipTags('a', 'span', 'pre', 'code');
	mountyhall.trollNamesReplacer = replacer;

	window.mh_trolls = null;
});
