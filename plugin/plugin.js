// documentation of called pages :
//   http://sp.mountyhall.com/
//   http://sp.mountyhall.com/SP_WebService.php

var	Promise = require("bluebird"),
	iconvlite = require('iconv-lite'),
	http = require('http'),
	Cachette = require('./Cachette.js'),
	Monster = require('./Monster.js'),
	Troll = require('./Troll.js');

exports.name = "MountyHall";

exports.init = function(miaou){
}

// queries a SP ("script public")
// returns a promise which is resolved if all goes well with an array of arrays of strings (a csv table)
function fetchSP(sp, num, mdpr){
	var p = Promise.defer();
	var req = http.request({
		hostname: "sp.mountyhall.com",
		path: "/SP_"+sp+".php?Numero="+num+"&Motdepasse="+encodeURIComponent(mdpr),
		method: "GET"
	}, function(res){
		var lines = [];
		res.on('data', function(chunk){
			lines.push(iconvlite.decode(chunk, 'ISO-8859-1').toString().split(';'));
		}).on('end', function(){
			if (lines.length>0 && lines[0].length>1) {
				p.resolve(lines);
			} else {
				p.reject('Error : ' + JSON.stringify(lines));
			}
		});
	});
	req.on('error', function(e){
		p.reject('request error');
	});
	req.end();
	return p.promise;
}

// returns a promise
// updates and provides in resolution the pluginPlayerInfos if successful, else throws an error
function createMHProfile(user, pluginPlayerInfos, vals){
	return fetchSP('ProfilPublic2', vals.mh_num, vals.mh_mdpr)
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

exports.registerCommands = function(registerCommand){
	registerCommand({
		name: 'oukonenest',
		fun: function(ct){
			var match = ct.args.match(/(\d+)/);
			if (!match) {
				throw "Précisez le numéro (par exemple `!!"+ct.cmd.name+" 12345678`)";
			}
			var num = +match[1];
			console.log("num:", num);
			return this.search_tsquery(ct.shoe.room.id, num+'&!oukonenest', 'english', 50)
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
		},
		help:
			"synthétise les infos disponibles dans la salle à propos"+
			" d'un monstre, d'un troll, ou d'une cachette de Capitan",
		detailedHelp:
			"Utilisez `!!oukonenest numero`. "+
			"Cette commande n'est disponible que dans les salles dont la description contient `[MH]`.",
		filter: room => /\[MH\]/i.test(room.description)
	});
}
