var highlightCol = "#333333";
var animSpeed = 100;

var uploadHighlightCol = "#FFDD88";

// Menu animations (standard)
$(document).ready( function() {
	$(".navbar-nav>li:not(.no-highlight)").each( function() {
		// Store original colour
		var col = $(this).css("background-color");
		$(this).data("backCol", col);
		console.log(col);
	}).mouseenter( function() {
		// Animate to highlight
		$(this).stop();
		$(this).animate({
			backgroundColor: highlightCol
		}, animSpeed);
	}).mouseleave( function() {
		// Animate to normal
		$(this).stop();
		$(this).animate({
			backgroundColor: $(this).data("backCol")
		}, animSpeed);
	});

	$("#upload-btn>a").each( function() {
		// Store original colour
		var col = $(this).css("background-color");
		$(this).data("backCol", col);
		console.log(col);
	}).mouseenter( function() {
		// Animate to highlight
		$(this).stop();
		$(this).animate({
			backgroundColor: uploadHighlightCol
		}, animSpeed);
	}).mouseleave( function() {
		// Animate to normal
		$(this).stop();
		$(this).animate({
			backgroundColor: $(this).data("backCol")
		}, animSpeed);
	});
});