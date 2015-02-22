// update the list of trolls
var fs = require('fs'),
	iconvlite = require('iconv-lite');

var trolls = {};
fs.readFile("Public_Trolls.txt", function(err, data){
	iconvlite.decode(data,'ISO-8859-1').toString().split('\n').forEach(function(line){
		var cells = line.split(';'),
			id = +cells[0],
			name = cells[1];
		if (!name || name.length<2) {
			console.log("invalid name:", name);
			return;
		}
		if (!id) {
			console.log("invalid id:", cells[0]);
			return;			
		}
		trolls[name] = id;
	});
	console.log(Object.keys(trolls).length);
	fs.writeFile("plugin/client-scripts/trollsdb.js", ";window.mh_trolls="+JSON.stringify(trolls)+";");
});
