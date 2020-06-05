"use strict";

let playerEntries = [];
let selfPlayerId = null;
let selfPlayerEntry = null;

let keys = {};
let keyPresses = {};

// 3D
const renderer = new THREE.WebGLRenderer({ canvas: $("canvas") });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

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

  // Update
  const move = new THREE.Vector3();
  if (keys.KeyW) move.z -= 1;
  if (keys.KeyS) move.z += 1;

  if (keys.KeyA) move.x -= 1;
  if (keys.KeyD) move.x += 1;

  if (move.lengthSq() > 0) {
    const speed = 0.1;
    move.normalize().multiplyScalar(speed);

    // camera.position.add(move);
    socket.emit("move", [selfPlayerEntry.pos[0] + move.x, selfPlayerEntry.pos[1] + move.y, selfPlayerEntry.pos[2] + move.z]);
  }

  keyPresses = {};

  // Render
  canvasClientRect = renderer.domElement.parentElement.getBoundingClientRect();
  renderer.setSize(canvasClientRect.width, canvasClientRect.height, false);
  camera.aspect = canvasClientRect.width / canvasClientRect.height;
  camera.updateProjectionMatrix();


  renderer.render(scene, camera);
}

animate();

// Input
renderer.domElement.addEventListener("mousedown", (event) => {
  renderer.domElement.focus();
  event.preventDefault();

  if (event.button === 1) {
  }
});

renderer.domElement.addEventListener("mouseup", (event) => {
  event.preventDefault();

  if (event.button === 1) {
  }
});

renderer.domElement.addEventListener("keydown", (event) => {
  // event.preventDefault();

  keys[event.code] = true;
  keyPresses[event.code] = true;
});

renderer.domElement.addEventListener("keyup", (event) => {
  // event.preventDefault();

  keys[event.code] = false;
});

renderer.domElement.addEventListener("blur", (event) => {
  keys = {};
  keyPresses = {};
});

// Network
const socket = io({ reconnection: false, transports: ["websocket"] });

socket.emit("joinGame", (data) => {
  playerEntries = data.playerEntries;
  selfPlayerId = data.selfPlayerId;
  selfPlayerEntry = playerEntries.find(x => x.id === selfPlayerId);

  for (const playerEntry of playerEntries) setupPlayerEntry(playerEntry);

  $make("div", document.body, { textContent: JSON.stringify(data, null, 2) });
});

socket.on("addPlayerEntry", (playerEntry) => {
  setupPlayerEntry(playerEntry);
  playerEntries.push(playerEntry);
});

function setupPlayerEntry(playerEntry) {
  const box = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
  playerEntry.mesh = new THREE.Mesh(box, material);
  playerEntry.mesh.position.set(playerEntry.pos[0], playerEntry.pos[1], playerEntry.pos[2]);
  playerEntry.mesh.rotation.y = playerEntry.angle;
  scene.add(playerEntry.mesh);
}

socket.on("removePlayerEntry", (playerId) => {
  const index = playerEntries.findIndex(x => x.id === playerId);
  const playerEntry = playerEntries[index];
  scene.remove(playerEntry.mesh);

  playerEntries.splice(index, 1);
});


socket.on("movePlayer", (playerId, pos) => {
  const playerEntry = playerEntries.find(x => x.id === playerId);
  playerEntry.pos = pos;
  playerEntry.mesh.position.set(pos[0], pos[1], pos[2]);
});
