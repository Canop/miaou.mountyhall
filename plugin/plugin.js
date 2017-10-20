
//   http://sp.mountyhall.com/SP_WebService.php

var	db,
	bench = require("../../libs/bench.js"),
	Cachette = require('./Cachette.js'),
	papi = require('./partage.js'),
	pws = require('./partage-ws.js'),
	Monster = require('./Monster.js'),
	onTrollCommand = require('./troll-command.js').onTrollCommand,
	onPartageCommand = require('./partage-command.js').onPartageCommand,
	Troll = require('./Troll.js');

exports.name = "MountyHall";

exports.init = function(miaou){
	db = miaou.db;
	pws.init(miaou);
	db.upgrade(exports.name, require("path").resolve(__dirname, 'sql'));
	return miaou.requestTag({
		name: "MountyHall",
		description:
			"https://games.mountyhall.com/mountyhall/Images/Troll_accueil_1.jpg\n"+
			"*[MountyHall](https://www.mountyhall.com) est un jeu de rôles et d'aventures"+
			" en ligne permettant aux participants d'incarner un Troll en quête d'aventures. "+
			"Le jeu se déroule en tour-par-tour d'une durée de 12 heures durant lesquelles"+
			" les joueurs peuvent faire agir leur Troll en dépensant jusqu'à 6 Points d'Actions.*\n"+
			"Donner ce tag à une salle Miaou apporte de nombreuses fonctions liées au jeu MountyHall."
	})
	.then(function(){
		return db.on().then(function(){
			return require("./auto-badges.js").registerBadges(this, miaou);
		}).finally(db.off);
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

// returns the HTML of the profile
// or undefined if there's no profile
function renderMHProfile(ppi){
	if (!ppi || !ppi.troll || !ppi.troll.id || !ppi.troll.race) {
		return '<i class=error>profil invalide</i>';
	}
	var html = '<div class=mh-troll-id-card>';
	if (ppi.troll.blason) {
		html += '<img src="' + ppi.troll.blason + '">'; // fixme possible injection
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
				name:'mh_num',
				label:'Numéro',
				type:'Number'
			},
			{
				name:'mh_mdpr',
				label:'Mot de passe restreint',
				notice:"Vous pouvez créer un mot de passe restreint"
					+ " (également appelé code d'accès spécifique) dans Options / Options Tröll"
			}
		],
		create: createMHProfile
	},
	render: renderMHProfile,
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
	console.log("num:", num);
	return this.search_tsquery(ct.shoe.room.id, num+'&!oukonenest', 'english', 50)
	.filter(m => !/^!!deleted/.test(m.content))
	.then(messages => {
		if (!messages.length) {
			ct.reply("Aucun message trouvé");
			return;
		}
		var text = messages[0].content;
		console.log('text:', text);
		// ici on essaye de deviner si le numéro correspond à une cachette,
		//  à un monstre ou à un troll
		if (/cachette/i.test(text) && /carte/i.test(text)) {
			return (new Cachette(num)).reply(messages, ct);
		} else if (num>567890 && num<15178164) {
			return (new Monster(num)).reply(messages, ct);
		} else if (num<567891) {
			return (new Troll(num)).reply(messages, ct);
		}
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
	"Pour authentifier votre compte, allez dans [les préférences](http://dystroy.org/miaou/prefs#Identities).";

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
`;
