
miaou(function(mountyhall, chat, gui, locals, time, ws){

	var	$panel,
		zoom = 3,
		currentTroll;

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
		$("<div class=mountyhall-help-icon>").bubbleOn({
			text:	"Glissez la carte en maintenant le bouton de la souris enfonçé\n"+
				"Zoomez et Dézoomez avec la molette de la souris"
		}).appendTo($head);
		$("<select>").append(trolls.map(function(t){
			var $option =  $("<option>").text(t.nom);
			if (t===localTroll) $option.prop("selected", true);
			return $option;
		})).appendTo($head).on("change", function(){
			selectTroll(trolls[this.selectedIndex]);
		});
		$("<div id=mountyhall-view-update>").appendTo($head);
		$("<button>").text("centrer").click(centerView).appendTo($head);
		$("<button>").text("fermer").click(function(){
			$panel.remove();
			$panel = null;
		}).appendTo($head);
		selectTroll(localTroll);
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
		setTimeout(centerView, 0);
	}

	function makeCells(trollView){
		var	vue = trollView.vue,
			origine = vue.origine,
			portée = origine.portée || origine.range,
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


	function displayView(trollView){
		var	cells = trollView.cells,
			hoveredCell,
			cellWidth,
			size = trollView.size,
			$view = $("#mountyhall-view").empty(),
			$grid = $("<div id=mountyhall-view-grid>").appendTo($view);
		function applyZoom(e){
			console.log('zoom:', zoom);
			console.log('hoveredCell:', hoveredCell);
			$grid[0].className = "zoom"+zoom;
			var oldCellWidth = cellWidth;
			cellWidth = [21, 45, 80, 120, 150][zoom];
			$grid.width(cellWidth*size);
			$view.toggleClass("short-view", $grid.width()<$view.width()-20);
			if (e && oldCellWidth) {
				var ratio = cellWidth / oldCellWidth;
				console.log('ratio:', ratio);
				var x = e.clientX-$view.offset().left;
				var y = e.clientY-$view.offset().top; // ne tient pas compte des cellules qui dépassent en hauteur
				$view.scrollLeft(($view.scrollLeft()+x)*ratio-x);
				$view.scrollTop(($view.scrollTop()+y)*ratio-y);
			}
		}
		applyZoom();
		for (var j=size; j--;) {
			var $line = $("<div class=line>").appendTo($grid);
			for (var i=0; i<size; i++) {
				var	cell = cells[i][j],
					k,
					o,
					$cell = $("<div class=cell>").appendTo($line).dat("cell", cell);
				if (cell.origine) $cell.addClass("origine");
				for (k=0; cell.lieux && k<cell.lieux.length; k++) {
					o = cell.lieux[k];
					var $o = $("<div class=lieu>").appendTo($cell);
					$o.text(o.n + ": " + o.nom);
				}
				if (cell.trolls) {
					$cell.append($("<div class=nb-trolls>").text(cell.trolls.length));
					cell.trolls.sort(function(a, b){ return b.n - a.n });
					for (k=0; k<cell.trolls.length; k++) {
						o = cell.trolls[k];
						var $o = $("<div class=troll>").appendTo($cell)
						.text(o.n + ": " + o.nom);
					}
				}
				if (cell.monstres) {
					cell.monstres.sort(function(a, b){ return b.n - a.n });
					var n = 0;
					for (k=0; k<cell.monstres.length; k++) {
						o = cell.monstres[k];
						var $o = $("<div class=monstre>").appendTo($cell);
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
					if (n) {
						$cell.append($("<div class=nb-monstres>").text(n));
					}
				}
				$("<div class=position>").text(cell.x+" "+cell.y).appendTo($cell);
			}
		}
		var onwheel = function(e){
			e.preventDefault();
			if (e.deltaY>0) zoom--;
			else if (e.deltaY<0) zoom++;
			else return;
			if (zoom<0) {
				zoom = 0;
			} else if (zoom>4) {
				zoom = 4;
			} else {
				applyZoom(e);
			}
		}
		$grid.mouseenter(function(){
			window.addEventListener("wheel", onwheel);
		}).mouseleave(function(){
			window.removeEventListener("wheel", onwheel);
		}).on("mouseenter", ".cell", function(){
			hoveredCell = this;
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
		$(document).mouseup(function(e){
			$view.off("mousemove", onDrag);
		});
	}

	// function bindGridHover(){
	// 	$("#mountyhall-view-grid").hover(
	// 		fi
	// }
});
