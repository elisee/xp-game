"use strict";

// 3D
const renderer = new THREE.WebGLRenderer({ canvas: $("canvas") });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 10;

const ambientLight = new THREE.AmbientLight(0xaaaaaa); // soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 0);
scene.add(directionalLight);

scene.add(new THREE.GridHelper(10, 10));

let canvasClientRect;

function animate() {
  requestAnimationFrame(animate);

  canvasClientRect = renderer.domElement.parentElement.getBoundingClientRect();
  renderer.setSize(canvasClientRect.width, canvasClientRect.height, false);
  camera.aspect = canvasClientRect.width / canvasClientRect.height;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

animate();


// Network
const socket = io({ reconnection: false, transports: ["websocket"] });

socket.emit("joinGame", (data) => {
  $make("div", document.body, { textContent: JSON.stringify(data, null, 2) });
});
