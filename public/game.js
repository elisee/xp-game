"use strict";

let selfPeerId = null;

let milestone = {
  name: "none"
};

let userToken;
let nickname;

// Network
const socket = io({ reconnection: false, transports: ["websocket"] });

window.addEventListener("message", (event) => {
  const actualEvent = JSON.parse(event.data);

  if (actualEvent.name === "setUser") {
    userToken = actualEvent.userToken;
    nickname = actualEvent.nickname;
    socket.emit("joinGame", userToken, actualEvent.nickname, socket_joinGameCallback);
  }
});

socket.on("disconnect", () => {
  document.body.innerHTML = "";
  document.body.textContent = "Disconnected.";
})

function socket_joinGameCallback(data) {
  $hide(".loading");
  $show(".ingame");

  selfPeerId = data.selfPeerId;
}

// Render
const renderer = new THREE.WebGLRenderer({ canvas: $(".ingame canvas"), alpha: false });

const scene = new THREE.Scene();
scene.add(new THREE.GridHelper(10, 10));

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
camera.position.y = 5;
camera.position.z = 10;

function animate() {
  requestAnimationFrame(animate);

  canvasClientRect = renderer.domElement.parentElement.getBoundingClientRect();
  renderer.setSize(canvasClientRect.width, canvasClientRect.height, false);
  camera.aspect = canvasClientRect.width / canvasClientRect.height;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

animate();