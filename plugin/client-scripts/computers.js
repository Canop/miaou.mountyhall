// les calculateurs prennent en entrée une structure au format "profil4"
miaou(function(mountyhall){

	const computers = {
		strikes: []
	};

	function addStrike(group, id, shortname, compute){
		computers.strikes.push({
			group, // null, "competences" ou "sorts"
			id, // nombre correspondant soit à idSort soit à idCompetence
			shortname,
			compute
		});
	}

	addStrike(null, 0, "AN", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let r = {
			att: att.CAR*3.5 + att.BMP + att.BMM,
			deg: deg.CAR*2 + deg.BMP + deg.BMM,
		};
		r.crit = r.deg + (deg.CAR/2|0)*2;
		return r;
	});

	addStrike("competences", 9, "AP", (p, t)=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let level = t.niveaux.length;
		let bonusAtt = 3.5*Math.min(att.CAR/2|0, level*3);
		let r = {
			att: att.CAR*3.5 + att.BMP + att.BMM + bonusAtt,
			deg: deg.CAR*2 + deg.BMP + deg.BMM,
		}
		r.crit = r.deg + (deg.CAR/2|0)*2;
		return r;
	});

	addStrike("competences", 1, "BS", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let degDices = Math.floor(att.CAR/2);
		let r = {
			att: 3.5*Math.floor(att.CAR*2/3) + Math.floor((att.BMP + att.BMM)/2),
			deg: degDices*2 + Math.floor((deg.BMP + deg.BMM)/2)
		}
		r.crit = r.deg + (degDices/2|0)*2;
		return r;
	});

	addStrike("competences", 8, "CDB", (p, t)=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let level = t.niveaux.length;
		let bonusDeg = 2*Math.min(deg.CAR/2|0, level*3);
		let r = {
			att: att.CAR*3.5 + att.BMP + att.BMM,
			deg: deg.CAR*2 + deg.BMP + deg.BMM + bonusDeg,
		}
		r.crit = r.deg + (deg.CAR/2|0)*2;
		return r;
	});

	addStrike("sorts", 1, "Projo", p=>{
		let vue = p.caracs.vue;
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let range = Math.ceil((Math.sqrt(19 + 8 * (vue.CAR + vue.BMM + vue.BMP + 3)) - 7) / 2);
		let r = {
			att: vue.CAR*3.5 + att.BMM,
			deg: (range+vue.CAR/2|0)*2 + deg.BMM,
			details: `*portée*: ${range}`
		}
		r.crit = r.deg + ((vue.CAR/2|0)/2|0)*2;
		return r;
	});

	addStrike("sorts", 4, "RP", p=>{
		let deg = p.caracs.deg;
		let r = {
			att: NaN,
			deg: deg.CAR*2 + deg.BMM
		}
		return r;
	});

	addStrike("sorts", 14, "Siphon", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.reg;
		let reg = p.caracs.reg;
		let r = {
			att: att.CAR*3.5 + att.BMM,
			deg: reg.CAR*2 + deg.BMM,
		}
		r.crit = d.reg + (reg.CAR/2|0)*2;
		return r;
	});

	addStrike("sorts", 3, "Vampi", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let r = {
			att: deg.CAR*7/3 + att.BMM,
			deg: deg.CAR*2 + deg.BMM
		}
		r.crit = r.deg + (deg.CAR/2|0)*2;
		return r;
	});

	mountyhall.strikes = function(p){
		let strikes = [];
		for (let computer of computers.strikes) {
			if (computer.group) {
				let arr = p[computer.group];
				for (let i=arr.length; i--;) {
					let t = arr[i];
					if ((t.idCompetence||t.idSort||t.id)==computer.id) {
						let r = computer.compute(p, t);
						let level = t.niveaux.length;
						r.name = computer.shortname;
						if (level>1) r.name += level;
						r.name += ` (${t.niveaux[level-1]}%)`;
						strikes.push(r);
						break;
					}
				}
			} else {
				let r = computer.compute(p);
				r.name = computer.shortname;
				strikes.push(r);
			}
		}
		return strikes;
	}


});

