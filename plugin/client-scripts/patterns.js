// fichier partagé, utilisé à la fois par la partie serveur
//  et par les scripts clients
(function(){

	/*eslint-disable max-len*/
	var patterns = [
		{re:/ONNAISSANCE DES MONSTRES (?:sur )?(?:une?|:)\s+([^\(]+)\s+\((\d+)\)/i, clear:true, res:['nom', 'id'], vals:{cdm:'ok'}},
		{re:/NALYSE ANATOMIQUE sur ([^\(]+)\s+\((\d+)\)/i, clear:true, res:['nom', 'id'], vals:{aa:'ok'}},
		{re:/ous avez utilis. le Sortil.ge : (\w+)/i, clear:true, res:['sort']},
		{re:/Cibl. fait partie des :[^\(\)]+\(\s*([^\(]+)\s*-\s*N°(\d+)\)/i, res:['nom', 'id'], vals:{cdm:'ok'}},
		{re:/(.*)\s+\((\d+)\) a les caract.ristiques suivantes/i, clear:true, res:['nom', 'id'], vals:{aa:'ok'}},
		{re:/(une? )?([\w\s]+)\s+\((\d+)\) a .t. influenc. par l'effet du sort/i, res:['nom', 'id']},
		{re:/Le Monstre une? (.*)\s+\((\d+)\) a .t. victime du pi.ge/i, clear:true, res:['nom', 'id'], vals:{piege:true}},
		{re:/a Cible subit donc pleinement l'effet/i, vals:{full:true}},
		{re:/e sortil.ge a donc un EFFET REDUIT/i, vals:{full:false}},
		{re:/e sortil.ge (.*) a eu l'effet/, res:['sort']},
		{re:/euil de R.sistance de la Cible[\._\s]*: (\d+) %/, res:['seuilres']},
		{re:/(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):\d\d MORT .* \( (\d+) \) a débarrassé le Monde Souterrain de la présence maléfique d´une? ([^\(]+) \(\s?(\d+)\s?\)/, res:['J', 'M', 'A', 'h', 'm', 'killer', 'nom', 'id']},
		{re:/ous avez attaqu. une? ([^\(]+) \(\s?(\d+)\s?\) .* comp/, clear:true, res:['nom', 'id'], vals:{catatt:'comp'}},
		{re:/ous avez attaqu. une? ([^\(]+) \(\s?(\d+)\s?\) .* sortil/, clear:true, res:['nom', 'id'], vals:{catatt:'sort'}},
		{re:/ous avez attaqu. une? ([^\(]+) \(\s?(\d+)\s?\)/, clear:true, res:['nom', 'id'], vals:{typeatt:'AN'}},
		{re:/le Tr.ll (.*)\s+\((\d+)\) s'est interpos. avec bravoure/, clear:true, res:['nom', 'id'], vals:{typeatt:'interpo'}},
		{re:/e Jet d'Esquive de votre adversaire est de[\._\s]*: (\d+)/, res:['esq']},
		{re:/ous avez donc RAT. votre adversair/, vals:{touché:false}},
		{re:/ous avez donc TOUCH. votre adversaire par un coup critique/, vals:{touché:true, critique:true}},
		{re:/ous avez donc TOUCH. votre adversaire/, vals:{touché:true, critique:false}}, // due to last one
		{re:/ous lui avez infligé (\d+) points de dég/, res:['degbrut']},
		{re:/on Armure le prot.ge et il ne perdra que (\d+) points de vie/, res:['degnet']},
		{re:/l était alors aux alentours de : (\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d):\d\d/, res:['J', 'M', 'A', 'h', 'm']},
		{re:/ésultat du Combat : (.*)/, res:['typeatt']},
		{re:/otre Jet d'Attaque est de[\._\s]+: (\d+)/, res:['att']},
		{re:/e Monstre Cibl. fait partie des : \w+ \(([^\-]+) - N°\s*(\d+)\s*\)/, res:['nom', 'id']},
		{re:/iveau\s*:\s*[^>:\(\)]*\s*\([^\(]+\)/, res:['niveau']},
		{re:/lessure\D+(\d+)\s*%/, res:['blessure']},
		{re:/rmure Physique\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['armurephysmin', 'armurephysmax']},
		{re:/rmure Physique\s*:\s*[^\(]+\(\s*sup.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['armurephysmin']},
		{re:/rmure Physique\s*:\s*[^\(]+\(\s*inf.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['armurephysmax'], vals:{armurephysmin:0}},
		{re:/rmure Magique\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['armuremagmin', 'armuremagmax'], vals:{aArmure:true}},
		{re:/rmure Magique\s*:\s*[^\(]+\(\s*sup.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['armuremagmin'], vals:{aArmure:true}},
		{re:/rmure Magique\s*:\s*[^\(]+\(\s*inf.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['armuremagmax'], vals:{armuremagmin:0, aArmure:true}},
		{re:/rmure\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['armuremin', 'armuremax'], vals:{aArmure:true}},
		{re:/rmure\s*:\s*[^\(]+\(\s*sup.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['armuremin'], vals:{aArmure:true}},
		{re:/rmure\s*:\s*[^\(]+\(\s*inf.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['armuremax'], vals:{armuremin:0, aArmure:true}},
		{re:/squive\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['esquivemin', 'esquivemax'], vals:{aEsquive:true}},
		{re:/squive\s*:\s*[^\(]+\(\s*sup.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['esquivemin'], vals:{aEsquive:true}},
		{re:/squive\s*:\s*[^\(]+\(\s*inf.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['esquivemax'], vals:{esquivemin:0, aEsquive:true}},
		{re:/oints de Vie\s*:\s*[^\(]+\(\s*entre\s+(\d+)\s+et\s+(\d+)\s*\)/i, res:['pvmin', 'pvmax'], vals:{aPV:true}},
		{re:/oints de Vie\s*:\s*[^\(]+\(\s*sup.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['pvmin'], vals:{aPV:true}},
		{re:/oints de Vie\s*:\s*[^\(]+\(\s*inf.rieure?s?\s+.\s+(\d+)\s*\)/i, res:['pvmax'], vals:{pvmin:0, aPV:true}},
		{re:/ttaque\s*:\s*[^\(]+\(([^\)]+)\)/, res:['att']},
		{re:/ne?\s+([^\(]+)\s+\((\d{7})\) a .t. influenc. par l'effet du sort/i, res:['nom', 'id']},
		{re:/ypnotis.e jusqu'. sa prochaine Date Limite d'Action/i, res:[], vals:{sort:'Hypnotisme'}},
		{re:/ous l'avez TU.\s/i, vals:{kill:true}},
		{re:/ous avez gagn. un total de (\d+) PX/, res:['px']},
		{re:/ous n..?avez gagn. aucun PX/, vals:{px:0}},
		{re:/l sera, de plus, fragilis. lors des prochaines esquives/i, res:[], vals:{done:true}},
		{re:/PV : -\d+D\d+ \(-(\d+)\)/, res:['degnet']},
		{re:/a subi (\d+) points de d.g.ts/i, res:['degnet']},
		{re:/ a .t. tu. par cet effet/, vals:{kill:true}},
	];
	/*eslint-enable max-len*/

	var searchRegexes = patterns.filter(function(p){
		return p.res && p.res[0]==="nom" && p.res[1]==="id";
	}).map(function(p){
		return p.re;
	});

	if (typeof exports !== 'undefined') {
		exports.patterns = patterns;
	}

	if (typeof window !== 'undefined') {
		window.miaou(function(mountyhall){
			mountyhall.searchRegexes = searchRegexes;
		});
	}
})();
