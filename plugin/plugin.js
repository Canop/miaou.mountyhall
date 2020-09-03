
//   http://sp.mountyhall.com/SP_WebService.php

let	db,
	bench,
	prefs,
	Cachette = require('./Cachette.js'),
	papi = require('./partage.js'),
	pws = require('./partage-ws.js'),
	Monster = require('./Monster.js'),
	onTrollCommand = require('./troll-command.js').onTrollCommand,
	onPartageCommand = require('./partage-command.js').onPartageCommand,
	Troll = require('./Troll.js');

exports.name = "MountyHall";

exports.init = async function(miaou){
	db = miaou.db;
	bench = miaou.lib("bench");
	prefs = miaou.lib("prefs");
	pws.init(miaou);
	require("./sciz-oukonenest.js").init(miaou);
	await db.upgrade(exports.name, require("path").resolve(__dirname, 'sql'));
	prefs.definePref(
		"mountyhall.trollVisible",
		"salles-MH",
		"Montrer le troll dans le profil",
		[
			{ value: "salles-MH", label: "uniquement dans les salles portant le tag MountyHall" },
			{ value: "partout", label: "dans toutes les salles et sur le profil public" }
		],
		{canBeLocal: false}
	);
	prefs.definePref(
		"mountyhall.url",
		"auto",
		"Base of MH URLs",
		[
			{
				value: "auto",
				label: "automatic selection of either standard or smartphone"
			},
			{
				value: "standard",
				label: "official MH URL : https://games.mountyhall.com/mountyhall"
			},
			{
				value: "smartphone",
				label: "MH URL for mobiles: https://smartphone.mountyhall.com/mountyhall"
			},
			{
				value: "raistlin",
				label: "Raistlin's proxy : https://mh.mh.raistlin.fr/mountyhall"
			},			
			{
				value: "raistlin-mhp",
				label: "Raistlin's proxy with Mountyzilla and Poissotron : https://mhp.mh.raistlin.fr/mountyhall"
			},
			{
				value: "raistlin-mz",
				label: "Raistlin's proxy with Mountyzilla : https://mh2.mh.raistlin.fr/mountyhall"
			}
		],
	);
	await miaou.requestTag({
		name: "MountyHall",
		description:
			"https://games.mountyhall.com/mountyhall/Images/Troll_accueil_1.jpg\n"+
			"*[MountyHall](https://www.mountyhall.com) est un jeu de rôles et d'aventures"+
			" en ligne permettant aux participants d'incarner un Troll en quête d'aventures. "+
			"Le jeu se déroule en tour-par-tour d'une durée de 12 heures durant lesquelles"+
			" les joueurs peuvent faire agir leur Troll en dépensant jusqu'à 6 Points d'Actions.*\n"+
			"Donner ce tag à une salle Miaou apporte de nombreuses fonctions liées au jeu MountyHall."
	});
	await db.do(async function(con){
		await require("./badges.js").registerBadges(con, miaou);
	});
}

// returns a promise
// updates and provides in resolution the pluginPlayerInfos if successful, else throws an error
function createMHProfile(user, pluginPlayerInfos, vals){
	return papi.fetchSP('ProfilPublic2', vals.mh_num, vals.mh_mdpr)
	.then(function(lines){
		var	l = lines[0];
		var	troll = {
			id:l[0], nom:l[1], race:l[2], blason:l[6]
		};
		pluginPlayerInfos.troll = troll;
		pluginPlayerInfos.mdpr = vals.mh_mdpr;
		return pluginPlayerInfos;
	});
}

async function filterMHProfile(con, ppi, room){
	if (!ppi) return false;
	if (room && room.tags.includes("MountyHall")) return true;
	let gups = await prefs.getUserGlobalPrefs(con, ppi.player);
	let pval = gups["mountyhall.trollVisible"];
	return pval == "partout";
}

// returns the HTML of the profile
// or undefined if there's no profile
function renderMHProfile(ppi, room){
	if (!ppi || !ppi.troll || !ppi.troll.id || !ppi.troll.race) {
		return '<i class=error>profil invalide</i>';
	}
	var html = '<div class=mh-troll-id-card>';
	if (ppi.troll.blason) {
		let src = ppi.troll.blason.replace( // fixing old blason URL
			/^http:\/\/blason.mountyhall.com\//,
			"https://games.mountyhall.com/MH_Blasons/"
		);
		html += '<img src="' + src + '">'; // fixme possible injection
	}
	html += '<div>';
	var href = 'https://games.mountyhall.com/mountyhall/View/PJView.php?ai_IDPJ=' + ppi.troll.id;
	html += '<a target=_blank href=' + href + '>' + ppi.troll.nom + '</a>'; // fixme possible injection
	html += '<p>' + ppi.troll.race + '</p>';
	html += '</div>';
	html += '</div>';
	return html;
}

exports.externalProfile = {
	creation: {
		fields: [
			{
				name: 'mh_num',
				label: 'Numéro',
				type: 'Number',
			},
			{
				name: 'mh_mdpr',
				label: 'Mot de passe restreint',
				notice: "Vous pouvez créer un mot de passe restreint"
					+ " (également appelé code d'accès spécifique) dans Options / Options Tröll",
			},
		],
		create: createMHProfile
	},
	rendering: {
		filter: filterMHProfile,
		render: renderMHProfile,
	},
	comments: "This profile is only displayed in rooms having the MountyHall tag.",
	avatarUrl: function(ppi){
		return ppi.troll.blason;
	}
}

function onOukonenestCommand(ct){
	var match = ct.args.match(/(\d+)/);
	if (!match) {
		throw "Précisez le numéro (par exemple `!!"+ct.cmd.name+" 12345678`)";
	}
	var num = +match[1];
	return this.search_tsquery(ct.shoe.room.id, num+'&!oukonenest', 'english', 50)
	.filter(m => !/^!!deleted/.test(m.content))
	.then(messages => {
		if (!messages.length) {
			ct.reply("Aucun message trouvé");
			return;
		}
		var text = messages[0].content;
		// ici on essaye de deviner si le numéro correspond à une cachette,
		//  à un monstre ou à un troll
		if (/cachette/i.test(text) && /carte/i.test(text)) {
			return (new Cachette(num)).reply(messages, ct);
		} else if (num>567890 && num<15178164) {
			return (new Monster(num)).reply(messages, ct);
		} else if (num<567891) {
			return (new Troll(num)).reply(messages, ct);
		}
		ct.end();
	});
}

exports.registerCommands = function(registerCommand){
	registerCommand({
		name: 'troll',
		fun: onTrollCommand,
		help:
			"Trouve l'éventuel compte Miaou lié à un troll",
		detailedHelp:
			"Utilisez `!!troll nom-du-troll`. "+
			"Cette commande n'est disponible que dans les salles portant le tag [tag:MountyHall]",
		filter: room => room.tags.includes("MountyHall")
	});
	registerCommand({
		name: 'oukonenest',
		fun: onOukonenestCommand,
		help:
			"synthétise les infos disponibles dans la salle à propos"+
			" d'un monstre, d'un troll, ou d'une cachette de Capitan",
		detailedHelp:
			"Utilisez `!!oukonenest numero`. "+
			"Cette commande n'est disponible que dans les salles portant le tag [tag:MountyHall]",
		filter: room => room.tags.includes("MountyHall")
	});
	registerCommand({
		name: 'partage',
		fun: onPartageCommand,
		help:
			"gère les partages d'informations de votre troll dans les salles",
		detailedHelp: HELP_PARTAGE_COMMAND,
		filter: room => room.tags.includes("MountyHall")
	});
}

const MH_AUTH_NEEDED = "L'entrée dans cette salle privée est réservée aux joueurs de Mounty Hall authentifiés.\n"+
	"Pour authentifier votre compte, allez dans [les préférences](https://dystroy.org/miaou/prefs#Identities).";

exports.beforeAccessRequest = function(args, user){
	var room = args.vars.room;
	if (!room.tags.includes("MountyHall")) return args;
	return db.on([exports.name, user.id])
	.spread(db.getPlayerPluginInfo)
	.then(ppi=>{
		if (!ppi) {
			args.canQueryAccess = false;
			args.specificMessage = MH_AUTH_NEEDED;
		}
		return args;
	})
	.finally(db.off);
}

exports.onNewShoe = function(shoe){
	shoe.socket
	.on('mountyhall.getRoomTrolls', function(){
		var bo = bench.start("mountyhall.getRoomTrolls");
		pws.getRoomTrolls(shoe);
		bo.end();
	})
	.on('mountyhall.getViewPlayer', function(playerId){
		var bo = bench.start("mountyhall.getViewPlayer");
		pws.getViewPlayer(shoe, playerId);
		bo.end();
	});
}

const HELP_PARTAGE_COMMAND = `
La commande *partage* permet de mettre en place, gérer, puis supprimer la participation
à un partage d'informations entre trolls dans une salle.

Afin d'entrer dans les partages d'une salle (qui doit être privée), utilisez
	!!partage on
Cette commande ne fonctionnera que si vous avez préalablement fait le lien avec votre troll
dans les paramètres de votre compte Miaou et si le mot de passe restreint utilisé n'a pas
été révoqué.

Pour mettre fin au partage, utilisez
	!!partage off
Dans le cas où vous n'auriez plus accès à la salle, ajoutez le numéro de la salle à la commande.

Vous pouvez lister les partages que vous avez mis en place *via* la commande
	!!partage list

Un petit panneau s'affiche en bas à gauche de la page pour tous les trolls qui font partie du
partage établi dans une salle. Les données affichées sont les mêmes pour tous.

Ces données proviennent des scripts publics de MountyHall, dont les appels sont soumis à des
quotas très sévères. La mise à jour n'est donc pas automatique mais manuelle, via les icones
de rafraichissement: une icone globale et une icone par troll. Lors d'un rafraichissement,
tous les utilisateurs connectés dans la salle voient immédiatement les nouvelles données
reçues.

Dans le cas où le nombre d'appels dépasse le quota défini par Miaou (inférieur au quota
imposé par MountyHall), l'appel ne se fera pas. Si vous constatez cela et souhaitez analyser
la raison, vous pouvez consulter la liste des appels récents *via*
	!!partage requests room
ou
	!!partage requests user

Pour enlever un autre utilisateur du partage, tapez
	!!partage remove @someuser
`;
