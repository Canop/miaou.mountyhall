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

	function totalCarac(p, name){
		let car = p.caracs[name];
		return car.CAR + car.BMM + car.BMP;
	}

	function mkcrit(r, degdice){
		r.crit = {N:r.deg.N+(degdice/2|0), S:r.deg.S, C:r.deg.C};
	}

	addStrike(null, 0, "AN", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let r = {
			att: {N:att.CAR, S:6, C:att.BMP+att.BMM},
			deg: {N:deg.CAR, S:3, C:deg.BMP+deg.BMM},
		};
		mkcrit(r, deg.CAR);
		return r;
	});

	addStrike("competences", 9, "AP", (p, t)=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let level = t.niveaux.length;
		let r = {
			att: {N:att.CAR+Math.min(att.CAR/2|0, level*3), S:6, C:att.BMP+att.BMM},
			deg: {N:deg.CAR, S:3, C:deg.BMP+deg.BMM},
		}
		mkcrit(r, deg.CAR);
		return r;
	});

	addStrike("competences", 1, "BS", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let degDice = Math.floor(att.CAR/2);
		let r = {
			att: {N:Math.floor(att.CAR*2/3), S:6, C:Math.floor((att.BMP + att.BMM)/2)},
			deg: {N:degDice, S:3, C:Math.floor((deg.BMP + deg.BMM)/2)}
		}
		mkcrit(r, degDice);
		return r;
	});

	addStrike("competences", 8, "CDB", (p, t)=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let level = t.niveaux.length;
		let r = {
			att: {N:att.CAR, S:6, C:att.BMP+att.BMM},
			deg: {N:deg.CAR+Math.min(deg.CAR/2|0, level*3), S:3, C:deg.BMP+deg.BMM},
		}
		mkcrit(r, deg.CAR);
		return r;
	});

	addStrike("competences", 14, "Charge", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let r = {
			att: {N:att.CAR, S:6, C:att.BMP+att.BMM},
			deg: {N:deg.CAR, S:3, C:deg.BMP+deg.BMM},
		};
		mkcrit(r, deg.CAR);
		let sight = totalCarac(p, "vue");
		if (sight<1) {
			r.details = "*troll aveugle*";
		} else {
			let reg = p.caracs.reg;
			let range = Math.ceil((Math.sqrt(19 + 8 * (p.pv/10 + reg.CAR + 3)) - 7) / 2);
			range -= Math.floor(p.fatigue/5);
			if (range<1) range = 1;
			if (range>sight) range = sight;
			r.details = `*portée*: ${range}`;
		}
		return r;
	});

	addStrike("sorts", 1, "Projo", p=>{
		let vue = p.caracs.vue;
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let range = Math.ceil((Math.sqrt(19 + 8 * (vue.CAR + vue.BMM + vue.BMP + 3)) - 7) / 2);
		let r = {
			att: {N:vue.CAR, S:6, C:att.BMM},
			deg: {N:(range+vue.CAR/2|0), S:3, C:deg.BMM},
			details: `*portée*: ${range}`
		}
		mkcrit(r, (vue.CAR/2|0));
		return r;
	});

	addStrike("sorts", 4, "RP", p=>{
		let deg = p.caracs.deg;
		let r = {
			deg: {N:deg.CAR, S:3, C:deg.BMM}
		}
		return r;
	});

	addStrike("sorts", 14, "Siphon", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let reg = p.caracs.reg;
		let r = {
			att: {N:att.CAR, S:6, C:att.BMM},
			deg: {N:reg.CAR, S:3, C:deg.BMM}
		}
		mkcrit(r, reg.CAR/2|0);
		return r;
	});

	addStrike("sorts", 3, "Vampi", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let r = {
			att: {N:2*(deg.CAR/3|0), S:6, C:att.BMM},
			deg: {N:deg.CAR, S:3, C:deg.BMM}
		}
		mkcrit(r, deg.CAR);
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

