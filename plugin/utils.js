
var MMM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateDDMMM(date){
	var d = date.getDate();
	return (d<10 ? '0' : '') + d + ' ' + MMM[date.getMonth()];
}
exports.formatTime = function(t){
	var	date = new Date(t*1000), now = new Date,
		m = date.getMinutes(), h = date.getHours(), Y = date.getFullYear(),
		s = s = (h<10?'0':'')+h+':'+(m<10?'0':'')+m;
	if (now.getFullYear()===Y && now.getMonth()===date.getMonth() && now.getDate()===date.getDate()) {
		return s;
	}
	return formatDateDDMMM(date) + (Y!==now.getFullYear() ? (' '+Y) : '')  + ' ' + s;
}

