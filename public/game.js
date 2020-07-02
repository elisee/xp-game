"use strict";

let selfPeerId = null;
let selfWorld;
let selfEntityId;

let userToken;
let nickname;

// Render
let canvasClientRect;
const renderer = new THREE.WebGLRenderer({ canvas: $(".ingame canvas"), alpha: false });

const scene = new THREE.Scene();
scene.add(new THREE.GridHelper(10, 10));

const tileTypeMaterials = {
  [tileTypes.dirt]: new THREE.MeshBasicMaterial({ color: 0xff87632b }),
  [tileTypes.grass]: new THREE.MeshBasicMaterial({ color: 0xff46bc68 }),
  [tileTypes.water]: new THREE.MeshBasicMaterial({ color: 0xff1981f4 })
}


const mapObject = new THREE.Object3D();
scene.add(mapObject);

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
  selfWorld = data.world;
  selfEntityId = data.entityId;

  for (let j = 0; j < selfWorld.height; j++) {
    for (let i = 0; i < selfWorld.width; i++) {
      const tile = selfWorld.tiles[j * selfWorld.width + i];

      const material = tileTypeMaterials[tile];
      if (material != null) {
        const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(i, 0, j);
        plane.rotation.x = -Math.PI / 2;
        mapObject.add(plane);
      }
    }
  }

  for (const [entityId, entity] of Object.entries(selfWorld.entitiesById)) {

  }
}
