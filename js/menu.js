function colorLuminance(rgb, lum) {
	console.log(rgb);
	var values = String(rgb).replace(/[rgba()\s]/g, '').split(',');

	var out = "rgb";
	if (values.length === 4) {
		out += "a";
	}
	out += "(";

	for (var s in values) {
		out += (parseInt(s) + lum).toString() + ",";
	}

	return out;
}

// Menu animations
$(document).ready( function() {
	$(".navbar-nav>li>a").each( function() {
		var col = $(this).css("background-color");
		$(this).data("backCol", col);
		console.log(col);
	}).mouseenter( function() {
		$(this).stop();
		$(this).animate({
			backgroundColor: colorLuminance($(this).data("backCol"), 0.05)
		}, 500);
	}).mouseleave( function() {
		$(this).stop();
		$(this).animate({
			backgroundColor: $(this).data("backCol")
		}, 500);
	});
});