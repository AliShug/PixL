var scene, camera, renderer;
var geometry, material, mesh;
var time = 0;
var lastTime;
var loader;

$(document).ready(function() {
	if (typeof THREE != "undefined") {
		lastTime = getTimestamp();
        loader = new THREE.JSONLoader();

		preview_init();
		preview_animate();

		$(window).on('resize', preview_resize);
	}
});

function preview_init() {
	// Populating a simple demo scene
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
	camera.position.z = 1000;

	geometry = new THREE.BoxGeometry(200, 200, 200);
	material = new THREE.MeshLambertMaterial({
		color: 0xFF2222,
        side: THREE.DoubleSide
	});

    renderer = new THREE.WebGLRenderer({
        antialiasing: true
    });

    // Light background
    renderer.setClearColor(0xDADADA, 1);

    // Fade-in
    $(renderer.domElement).css("opacity", 0.0).animate({
        opacity: 1.0,
    }, 2000, function() {
        // Animation complete
    });

    $("#viewerHolder").html(renderer.domElement);

    // Set the preview size
    preview_resize();

	//mesh = new THREE.Mesh(geometry, material);
    loader.load(meshPath, function(geom, mats) {
        console.log(mats);
        mesh = new THREE.Mesh(geom, material);
	    scene.add(mesh);

        // Move camera to view correctly
        geom.computeBoundingBox();
        var min = geom.boundingBox.min;
        var max = geom.boundingBox.max;
        var dist = Math.max(min.length(), max.length());
        camera.position.z = dist*2;
        console.log(min.length);

        var light = new THREE.PointLight(0xffffff, 2, 1000);
        light.position.set(0,300,400);
        scene.add(light);
    });
}

function preview_animate() {
    setTimeout( function() {
        requestAnimationFrame( preview_animate );
    }, 1000 / 30 );

	var deltaTime = getTimestamp() - lastTime;
	lastTime = getTimestamp();

    
    if (!mesh) return; // Mesh is still loading

	mesh.rotation.y += deltaTime / 3000;
	mesh.rotation.x = Math.sin(time/1000)/3 + 0.3;
	time += deltaTime;

	renderer.render(scene, camera);
}

function preview_resize() {
	// Resize the renderer
	var width = window.innerWidth;
	var height = Math.max(window.innerHeight - 50, 300);

	$(".main-view").height(height);

	renderer.setSize(width, height);
	camera.aspect = width/height;
	camera.updateProjectionMatrix();
}

// Timing
if (typeof window.performance != "undefined") {
	if (typeof window.performance.now != "undefined") {
	    console.log("Using high performance timer");
	    getTimestamp = function() { return window.performance.now(); };
	}
	else if (typeof window.performance.webkitNow != "undefined") {
	    console.log("Using webkit high performance timer");
	    getTimestamp = function() { return window.performance.webkitNow(); };
    }
}
else {
    console.log("Using low performance timer");
    getTimestamp = function() { return new Date().getTime(); };
}
