/**
 * Orthogonal Grease Pencil Demo
 * Copyright (c) 2021 Élie Michel - MIT Licensed
 */

const THICKNESS = 0.01;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({
	antialias: true,
    alpha: true
});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor(new THREE.Color(0.95, 0.95, 0.9));
document.body.appendChild( renderer.domElement );

const geometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.1, transparent: true, side: THREE.DoubleSide } );
const strokeMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.8, transparent: true } );
const groundMesh = new THREE.Mesh( geometry, groundMaterial );
scene.add( groundMesh );

const controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.mouseButtons = {
	LEFT: undefined,
	MIDDLE: THREE.MOUSE.ROTATE,
	RIGHT: THREE.MOUSE.PAN
}

camera.position.z = 5;
camera.position.y = 2;
controls.update();


// GUI
var degreeRotation = new THREE.Vector3(0, 0, 0);
var toolSettings = {inPlane: false};
const gui = new dat.GUI();
const originFolder = gui.addFolder("Ground Origin");
originFolder.add(groundMesh.position, "x", -5, 5, 0.01);
originFolder.add(groundMesh.position, "y", -5, 5, 0.01);
originFolder.add(groundMesh.position, "z", -5, 5, 0.01);
originFolder.open();
const orientationFolder = gui.addFolder("Ground Orientation");
orientationFolder.add(degreeRotation, "x", -90, 90, 0.01);
orientationFolder.add(degreeRotation, "y", -90, 90, 0.01);
orientationFolder.add(degreeRotation, "z", -90, 90, 0.01);
orientationFolder.open();
const toolFolder = gui.addFolder("Tool");
toolFolder.add(toolSettings, "inPlane");
toolFolder.open();
//


const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.0);

var strokes = [];
var currentStroke = null;

function Stroke(scene) {
	this.points = [];
	this.plane = null;
	this.visuals = new THREE.Group();
	scene.add(this.visuals);
}

Stroke.prototype.updateVisuals = function(first_argument) {
	this.visuals.clear();
	const curve = new THREE.CurvePath();
	var prev = null;
	for (var i = 0; i < this.points.length; ++i) {
		if (prev !== null) {
			curve.add(new THREE.LineCurve3(prev, this.points[i]));
		}
		prev = this.points[i];
	}
	const tube = new THREE.Mesh( new THREE.TubeGeometry( curve, 2 * this.points.length, THICKNESS, 16, false ), strokeMaterial );
	this.visuals.add(tube);
	const startSphere = new THREE.Mesh( new THREE.SphereGeometry( THICKNESS, 8, 8 ), strokeMaterial );
	startSphere.position.copy(this.points[0]);
	this.visuals.add(startSphere);
	const endSphere = new THREE.Mesh( new THREE.SphereGeometry( THICKNESS, 8, 8 ), strokeMaterial );
	endSphere.position.copy(this.points[this.points.length - 1]);
	this.visuals.add(endSphere);
};

function mouseEventToRay(e) {
	var mouse = new THREE.Vector2(e.offsetX / renderer.domElement.width * 2 - 1, -e.offsetY / renderer.domElement.height * 2 + 1);
	raycaster.setFromCamera( mouse, camera );
	return raycaster.ray;
}

renderer.domElement.addEventListener('pointerdown', function(e) {
	if (e.button != 0) return;
	console.log("stroke starts");
	currentStroke = new Stroke(scene);

	var ray = mouseEventToRay(e);

	var hitPoint = ray.origin.clone();
	hitPoint.addScaledVector(ray.direction, (groundPlane.constant - ray.origin.dot(groundPlane.normal)) / ray.direction.dot(groundPlane.normal));
	currentStroke.points.push(hitPoint);

	var strokePlaneNormal = ray.direction.clone();
	strokePlaneNormal.addScaledVector(groundPlane.normal, -ray.direction.dot(groundPlane.normal));
	currentStroke.plane = new THREE.Plane(strokePlaneNormal, hitPoint.dot(strokePlaneNormal));
	console.log(currentStroke);
});

renderer.domElement.addEventListener('pointermove', function(e) {
	if (currentStroke === null) return;
	console.log("stroking...");

	var ray = mouseEventToRay(e);

	var plane = toolSettings.inPlane ? groundPlane : currentStroke.plane;

	var hitPoint = ray.origin.clone();
	hitPoint.addScaledVector(ray.direction, (plane.constant - ray.origin.dot(plane.normal)) / ray.direction.dot(plane.normal));

	currentStroke.points.push(hitPoint);

	currentStroke.updateVisuals();
});

renderer.domElement.addEventListener('pointerup', function(e) {
	if (e.button != 0) return;
	if (currentStroke === null) return;
	console.log("stroke ends");
	strokes.push(currentStroke);
	currentStroke = null;
});

function animate() {
	requestAnimationFrame( animate );

	controls.update();

	groundMesh.rotation.x = (degreeRotation.x + 90) / 180 * Math.PI;
	groundMesh.rotation.y = degreeRotation.y / 180 * Math.PI;
	groundMesh.rotation.z = degreeRotation.z / 180 * Math.PI;

	const el = groundMesh.matrix.elements;
	groundPlane.normal.set(el[8], el[9], el[10]);
	groundPlane.constant = groundMesh.position.dot(groundPlane.normal);

	renderer.render( scene, camera );

}
animate();
