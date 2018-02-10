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
			name: "AN",
			att: att.CAR*3.5 + att.BMP + att.BMM,
			deg: deg.CAR*2 + deg.BMP + deg.BMM,
		};
		r.crit = r.deg + deg.CAR;
		return r;
	});

	addStrike("competences", 9, "AP", (p, t)=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let level = t.niveaux.length;
		let bonusAtt = 3.5*Math.min(att.CAR/2|0, level*3);
		let r = {
			name: "AP"+level,
			att: att.CAR*3.5 + att.BMP + att.BMM + bonusAtt,
			deg: deg.CAR*2 + deg.BMP + deg.BMM,
		}
		r.crit = r.deg + deg.CAR;
		return r;
	});

	addStrike("competences", 1, "BS", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let degDices = Math.floor(att.CAR/2);
		let r = {
			name: "BS",
			att: Math.floor(deg.CAR*2/3) + Math.floor((att.BMP + att.BMM)/2),
			deg: degDices*2 + Math.floor((deg.BMM + deg.BMM)/2)
		}
		r.crit = r.deg + 2*Math.floor(degDices/2);
		return r;
	});

	addStrike("competences", 8, "CDB", (p, t)=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let level = t.niveaux.length;
		let bonusDeg = 2*Math.min(deg.CAR/2|0, level*3);
		let r = {
			name: "CDB"+level,
			att: att.CAR*3.5 + att.BMP + att.BMM,
			deg: deg.CAR*2 + deg.BMP + deg.BMM + bonusDeg,
		}
		r.crit = r.deg + deg.CAR;
		return r;
	});

	addStrike("sorts", 3, "vampi", p=>{
		let att = p.caracs.att;
		let deg = p.caracs.deg;
		let r = {
			name: "vampi",
			att: deg.CAR*7/3 + att.BMM,
			deg: deg.CAR*2 + deg.BMM
		}
		r.crit = r.deg + deg.CAR;
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
						strikes.push(computer.compute(p, t));
						break;
					}
				}
			} else {
				strikes.push(computer.compute(p));
			}
		}
		return strikes;
	}


});

