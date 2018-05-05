// parsing spécifique pour les messages en provenance de sciz
// (format différent, souvent en doublon car automatiques et lents à arriver)

let	miaou,
	botInitialized = false,
	scizBotId = 0,
	eventRegex;

exports.init = function(_miaou){
	miaou = _miaou;
	eventRegex = miaou.lib("rex")`
		^(\d\d)\/(\d\d)\/(20\d\d) (\d\d)h(\d\d):(\d\d)		// date
		\s([A-zÀ-ÿ]{3,}(?: [A-zÀ-ÿ]{2,})*)(?: \(([^)]+)\))?	// action (modifieur)
		\sde ([^(]+) \((\d+)\)					// auteur (numéro)
		\ssur ([^(]+) \((\d+)\)					// victime (numéro)
		\s*:?
		\s*(-?\d+PV)?						// impact en PV
		\s*(\d+%)?						// blessure
		.*?
		(?:\s*\(([a-z0-9 +-]+)\))?$				// details
	`;
}

function initBot(){
	if (botInitialized) return;
	botInitialized = true;
	let scizPlugin = miaou.plugin("sciz");
	if (!scizPlugin) {
		console.log("no SCIZ plugin found");
		return;
	}
	if (!scizPlugin.provider) {
		console.log("no provider found in sciz");
		return;
	}
	let scizBot = scizPlugin.provider.bot;
	if (!scizBot) {
		console.log("no bot found in sciz plugin");
		return;
	}
	scizBotId = scizBot.id;
}

exports.prepare = function(){
	initBot();
}

function strToEvent(str){
	let m = str.match(eventRegex);
	console.log('m:', m);
	if (!m) return;
	let [, day, month, year, hour, min, sec, action, mod, name1, num1, name2, num2, pv, blessure, détails] = m;
	// parsing en temps local... mon serveur est sur la même timezone que celui de MH ^^
	let date = new Date(year, month-1, day, hour, min, sec);
	let event = {
		time:date.getTime()/1000|0, action, mod,
		p1:{nom:name1, num:+num1}, p2:{nom:name2, num:+num2},
		pv: pv ? `**${pv}**` : '',
		blessure,
		détails: (détails||"").replace(/(\d+) /g, "$1|")
	};
	return event;
}

// doit être appelé avec en contexte une instance d'Animal
exports.parse = function(message){
	if (message.author!==scizBotId) return false;
	let lines = message.content.split(/\n/);
	console.log('lines:', lines);
	let event = strToEvent(lines.shift());
	console.log('event:', event);
	if (event && event.p2.num==this.id) {
		event.nom = event.p2.nom;
		if (event.action=="CDM") {
			let parts = lines.filter(l=>(/^(pv|esq|arm)/i.test(l))).map(l=>l.toLowerCase());
			parts.push(`blessure: ${event.blessure}`);
			event.détails = parts.join("|");
		}
		this.addItem(event, message);
	}
	return true;
}
