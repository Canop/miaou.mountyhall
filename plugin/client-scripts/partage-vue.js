// gère l'affichage de la vue partagée
miaou(function(mountyhall, chat, gui, locals, skin, time, ws){

	const MH_BASE = "https://games.mountyhall.com/mountyhall/View/";
	const cellSizes = skin.getCssValue(/#mountyhall-view-grid.zoom(\d+) .line/, "height").map(function(v){
		return parseInt(v);
	});

	var	$panel,
		cellWidth,
		zoom = 5,
		currentTroll,
		hoverGrid = false,
		debouncing = false,
		$panel;

	window.addEventListener("wheel", function(e){
		if (!hoverGrid) return;
		e.preventDefault();
		if (debouncing) return;
		debouncing = true;
		setTimeout(function(){
			debouncing = false;
		}, 200);
		var oldZoom = zoom;
		if (e.deltaY>0) zoom--;
		else if (e.deltaY<0) zoom++;
		else return;
		zoom = Math.max(0, Math.min(cellSizes.length-1, zoom));
		if (zoom!=oldZoom) applyZoom(e);
		return false;
	});

	$(window).on("keydown", function(e){
		if (!hoverGrid) return;
		if (e.ctrlKey && !e.shiftKey) {
			if (e.which==38) zoom++; // up
			else if (e.which=40) zoom--; // down
			else return;
			console.log('zoom avant min max:', zoom);
			zoom = Math.max(0, Math.min(cellSizes.length-1, zoom));
			console.log('zoom:', zoom);
			applyZoom();
			return false;
		}
	});

	function selectTroll(troll){
		currentTroll = troll;
		console.log("request view of", troll.nom);
		$("#mountyhall-view").text("Recherche de la vue de " + troll.nom + "...");
		$("#mountyhall-view-update").text("chargement...");
		ws.emit("mountyhall.getViewPlayer", troll.miaouUser.id);
	}

	mountyhall.toggleSharedView = function(){
		if ($panel) {
			$panel.remove();
			$panel = null;
			return;
		}
		$panel = $("<div id=mountyhall-view-panel>").insertBefore("#input-panel");
		gui.scrollToBottom();
		var	trolls = mountyhall.partage.trolls,
			localTroll,
			$head = $("<div class=head>").appendTo($panel);
		$("<div id=mountyhall-view>").appendTo(
			$("<div class=mountyhall-view-wrapper>").appendTo($panel)
		);
		for (var i=0; i<trolls.length; i++) {
			if (trolls[i].miaouUser.id === locals.me.id) {
				localTroll = trolls[i];
				break;
			}
		}
		$("<div class=mountyhall-help-icon>").bubbleOn(
			"Glissez la carte en maintenant le bouton de la souris enfonçé\n"+
			"Zoomez et Dézoomez avec la molette de la souris ou avec ctrl-haut et ctrl-bas"
		).appendTo($head);
		$("<select>").append(trolls.map(function(t){
			var $option =  $("<option>").text(t.nom);
			if (t===localTroll) $option.prop("selected", true);
			return $option;
		})).appendTo($head).on("change", function(){
			selectTroll(trolls[this.selectedIndex]);
		});
		$("<div id=mountyhall-view-update>").appendTo($head);
		$("<div class=button>").text("centrer").click(centerView).appendTo($head);
		$("<div class=button>").text("fermer").click(function(){
			$panel.remove();
			$panel = null;
		}).appendTo($head);
		selectTroll(localTroll);

		$("<div id=mountyhall-view-search-panel>")
		.appendTo($panel)
		.append($("<div class=input-line>").html(
			"<input type=checkbox id=mh-view-depth-cb><label for=mh-view-depth-cb>Profondeur</label> "+
			"<div class=filter-details>"+
			"<input id=mh-view-min-depth placeholder=min> à <input id=mh-view-max-depth placeholder=max>"+
			"</div>"
		))
		.append($("<div class=input-line>").html(
			"<input type=checkbox id=mh-view-name-cb><label for=mh-view-name-cb>Nom</label> "+
			"<div class=filter-details><input id=mh-view-filter-name></div>"
		))
		.append($("<span class=button>").text("filtrer").click(applyFilters))
		.on("change", "input", applyFilters)
		.on("focus", ".filter-details input", function(){
			$(this).closest(".input-line").find("input[type=checkbox]").prop("checked", true);
		});
	}

	function applyFilters(){
		console.log("apply filters");
		var	min = +$("#mh-view-min-depth").val(),
			max = +$("#mh-view-max-depth").val(),
			name = $("#mh-view-filter-name").val().trim(),
			rname = (name  && $("#mh-view-name-cb").prop("checked")) ? new RegExp(name, "i") : null;
		if (min>0) min *= -1;
		if (max>0) max *= -1;
		if (min>max) {
			var temp = max;
			max = min;
			min = temp;
		}
		if (!$("#mh-view-depth-cb").prop("checked")) {
			min = max = NaN;
		}
		var	total = 0,
			filtered = 0;
		$("#mountyhall-view-grid .mh-cell").each(function(){
			var	elem = this,
				cell = $(this).dat("cell");
			;["lieux", "monstres", "trolls"].forEach(function(key){
				var arr = cell[key];
				if (arr) {
					var	elems = elem.querySelectorAll("."+key.slice(0, -1)),
						n = 0,
						changed = false;
					for (var i=0; i<arr.length; i++) {
						var	o = arr[i],
							wasFiltered = elems[i].classList.contains("filtered"),
							filtered = (min && o.n<min) ||
								(max && o.n>max) ||
								(rname && !rname.test(o.nom));
						if (filtered != wasFiltered) {
							changed = true;
							elems[i].classList.toggle("filtered", filtered);
							if (filtered) {
								elems[i].classList.add("filtered");
							} else {
								elems[i].classList.remove("filtered");
							}
						}
						if (filtered) {
							filtered++;
						} else {
							n++;
						}
						total++;
					}
					if (changed) $(".nb-"+key, elem).text(n).toggleClass("filtered", !n);
				}
			});
		});
		console.log("=>", filtered, "/", total);
	}


	// la vue arrive sans les noms des trolls, on essaye de la corriger
	function fixTrollView(trollView){
		var trolls = trollView.vue.trolls;
		if (!trolls) return;
		trolls.forEach(function(troll){
			if (troll.nom) return;
			troll.nom = mountyhall.trollsById[troll.id] || "troll "+troll.id;
		});
	}

	mountyhall.setViewContent = function(trollView){
		console.log('view receive trollView:', trollView);
		if (!$panel) return;
		if (trollView.id != currentTroll.id) {
			console.log("mauvais trollView reçu", trollView, currentTroll);
			return;
		}
		currentTroll.view = trollView;
		var $maj;
		$("#mountyhall-view-update").empty()
		.append($maj = $("<div>"))
		.append(
			$("<div class=mountyhall-refresh-troll>").click(function(){
				chat.sendMessage("!!partage update vue @" + currentTroll.miaouUser.name);
			}).bubbleOn({
				side: "top",
				text: "Mettre à jour la vue\nAttention: le nombre d'appels est limité"
			})
		);
		if (!trollView.vue) {
			console.log("vue pas bonne");
			$maj.text("Pas de données");
			$("#mountyhall-view").empty();
			return;
		}
		$maj.text("MAJ: "+time.formatTime(trollView.vue.requestTime));
		fixTrollView(trollView);
		makeCells(trollView);
		displayView(trollView);
		makeGridDraggable();
		applyFilters();
		setTimeout(centerView, 0);
	}

	function makeCells(trollView){
		var	vue = trollView.vue,
			origine = vue.origine,
			portée = Math.max(origine.portée || origine.range, 0),
			xmin = origine.x - portée,
			ymin = origine.y - portée,
			size = trollView.size = 2*portée+1,
			cells = trollView.cells = [];
		for (var i=0; i<size; i++) {
			var x = xmin+i;
			cells[i] = [];
			for (var j=0; j<size; j++) {
				var	y = ymin+j;
				cells[i][j] = { x: x, y: y };
			}
		}
		cells[origine.x-xmin][origine.y-ymin].origine = true;
		;["monstres", "trolls", "lieux"].forEach(function(key){
			if (!vue[key]) return;
			vue[key].forEach(function(o){
				if (!o.nom) {
					console.log(key, "sans nom:", o);
					return;
				}
				var col = cells[o.x-xmin];
				if (!col) {
					console.log("hors grille:", key, o);
					return;
				}
				var cell = col[o.y-ymin];
				if (!cell) {
					console.log("hors grille:", key, o);
					return;
				}
				if (!cell[key]) cell[key] = [];
				cell[key].push(o);
			});
		});
	}

	function cellBlower($c){
		if (zoom>3) return false;
		$c.append($(this).clone());
	}

	function gonfleurDeMonstre($c){
		if (zoom<3) return false;
		$c.text("Appel de Chrall...");
		$.getJSON(
			"https://canop.org/8000/chrall/json?action=get_extract"+
			"&name="+encodeURIComponent(this.text().split(":").pop().trim()),
			function(data){
				$c.html(data);
			}
		);
	}

	function applyZoom(e){
		var	$view = $("#mountyhall-view"),
			$grid = $("#mountyhall-view-grid");
		var oldCellWidth = cellWidth;
		var size = currentTroll.view.size;
		var adjustScroll = e && oldCellWidth;
		if (adjustScroll) {
			// on va avoir besoin des hauteurs de lignes avant application du style
			var lines = $grid[0].querySelectorAll(".line");
			var heights1 = [].map.call(lines, function(line){
				return line.offsetHeight;
			});
			var marg = parseInt($grid.css("marginLeft"));
			// on doit récupérer le scroll avant ajustement prce qu'il est parfois
			//  modifié par le changement de style
			var VG1x = marg - $view.scrollLeft();
			var VG1y = marg - $view.scrollTop();
		}

		// application du style
		$grid[0].className = "zoom"+zoom;
		cellWidth = cellSizes[zoom];
		$grid.width(cellWidth*size);

		if (!adjustScroll) return;

		// l'objectif des opérations qui suivent est d'assurer que la même cellule
		//  soit sous la souris avant et après zoom
		// Glossaire:
		//   S : coin haut gauche de la fenêtre
		//   V : coin haut gauche de la view (scrollable, contenant la grille)
		//   G : coin haut gauche de la grille
		//   G1: G avant zoom
		//   G2: G après zoom
		//   M : position de la souris
		//   (x,y) : position de la souris dans le référentiel MH avec l'origine le coin
		//           gauche de la grille
		//   marg : marge autour de la grille
		var SV = $view.offset();

		// En x c'est relativement simple car les cellules ont toutes la même largeur
		var r = cellWidth / oldCellWidth;
		var SMx = e.clientX;
		var VG2x = SMx - SV.left - r*( SMx - SV.left - VG1x );

		// En y il faut composer avec des cellules qui ont des hauteurs variables

		//  => G1M connu (G1M=SM-VG1-SV)
		var SMy = e.clientY;
		var G1My = SMy - VG1y - SV.top;
		// BUG: au dézoom le G1My est parfois faux

		//  => on en déduit y par accumulation des hauteurs de cellules jusqu'à atteindre G1My
		//     (on peut estimer un float en prenant le reste et en divisant par la hauteur de la
		//      cellule suivante)
		var y = 0;
		for (var gm=0;;) {
			if (y>=heights1.length || gm>=G1My) break;
			if (gm+heights1[y]>G1My) {
				y += (G1My-gm)/heights1[y];
				break;
			}
			gm += heights1[y++];
		}

		// => on fait la démarche inverse pour partir de y et arriver à G2M (somme des
		//      y premières hauteurs de ligne)
		var G2My = 0;
		var ry = Math.floor(y);
		for (var iy=0; iy<ry; iy++) {
			G2My += lines[iy].offsetHeight;
		}
		if (ry<lines.length-1) {
			G2My += (y-ry)*lines[ry+1].offsetHeight;
		}

		// => G2M nous donne VG2 via VG2=-G2M+SM-SV)
		var VG2y = SMy - SV.top - G2My;

		// => et il ne reste plus qu'à tenir compte de la marge
		$view.scrollLeft(marg - VG2x);
		$view.scrollTop(marg - VG2y);
	}

	function displayView(trollView){
		var	cells = trollView.cells,
			size = trollView.size,
			$view = $("#mountyhall-view").empty(),
			$grid = $("<div id=mountyhall-view-grid>").appendTo($view);
		$("<div>").css({width:5000, height:15}).text("hack").appendTo($view);
		applyZoom();
		for (var j=size; j--;) {
			var $line = $("<div class=line>").appendTo($grid);
			for (var i=0; i<size; i++) {
				var	cell = cells[i][j],
					k,
					o,
					$cell = $("<div class=mh-cell>").appendTo($line).dat("cell", cell);
				if (cell.origine) $cell.addClass("origine");
				$("<div class=position>").text(cell.x+" "+cell.y).appendTo($cell);
				if (cell.lieux) {
					$cell.append("<div class=nb-lieux>");
					cell.lieux.sort(function(a, b){ return b.n - a.n });
					for (k=0; k<cell.lieux.length; k++) {
						o = cell.lieux[k];
						var $o = $("<div class=lieu>").appendTo($cell);
						if (o.nom === "Trou de Météorite") $o.text("Trou").addClass("trou");
						else $o.text(o.n + ": " + o.nom);
					}
				}
				if (cell.trolls) {
					$cell.append($("<div class=nb-trolls>").text(cell.trolls.length));
					cell.trolls.sort(function(a, b){ return b.n - a.n });
					for (k=0; k<cell.trolls.length; k++) {
						o = cell.trolls[k];
						var $o = $("<a class=troll>").appendTo($cell)
						.attr("target", "_blank")
						.attr("href", MH_BASE + "PJView.php?ai_IDPJ=" + o.id)
						.text(o.n + ": " + o.nom);
					}
				}
				if (cell.monstres) {
					cell.monstres.sort(function(a, b){ return b.n - a.n });
					var	n = 0,
						$n =$("<div class=nb-monstres>").appendTo($cell);
					for (k=0; k<cell.monstres.length; k++) {
						o = cell.monstres[k];
						var $o = $("<a class=monstre>").appendTo($cell)
						.attr("target", "_blank")
						.attr("href", MH_BASE + "MonsterView.php?ai_IDPJ=" + o.id);
						var match = o.nom.match(/^([^\[]+)( \[[^\]]+\])$/);
						if (match) {
							$o.text(o.n + ": " + match[1]).append(
								$("<span class=age>").text(match[2])
							);
						} else {
							$o.text(o.n + ": " + o.nom);
						}
						if (/^Gowap Appr/.test(o.nom)) $o.addClass("gowap");
						else n++;
					}
					if (n) $n.text(n);
					else $n.remove();
				}
			}
		}
		$grid.mouseenter(function(){
			hoverGrid = true;
		}).mouseleave(function(){
			hoverGrid = false;
		});
		$grid.bubbleOn(".mh-cell", {
			side: "horizontal",
			blower: cellBlower
		}).bubbleOn(".monstre", {
			side: "horizontal",
			classes: "monstre",
			blower: gonfleurDeMonstre
		});
	}

	function centerView(){
		var	$view = $("#mountyhall-view"),
			$origin = $(".origine"),
			originOffset = $origin.offset();
		$view.animate({
			scrollLeft: ($view.scrollLeft() + originOffset.left + ($origin.innerWidth() - window.innerWidth) / 2),
			scrollTop:  ($view.scrollTop() + originOffset.top + ($origin.innerHeight() - window.innerHeight) / 2)
		});
	}

	function makeGridDraggable(){
		var	$view = $("#mountyhall-view"),
			$grid = $("#mountyhall-view-grid"),
			lastLeft, lastTop;
		function onDrag(e){
			$view.scrollLeft($view.scrollLeft() - e.clientX + lastLeft);
			$view.scrollTop($view.scrollTop() - e.clientY + lastTop);
			lastLeft = e.clientX,
			lastTop = e.clientY;
		}
		$grid.mousedown(function(e){
			lastLeft = e.clientX,
			lastTop = e.clientY;
			$view.on("mousemove", onDrag);
		});
		$(document).on("mouseup wheel", function(e){
			$view.off("mousemove", onDrag);
		});
	}

});
