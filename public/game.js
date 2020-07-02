"use strict";

let selfPeerId = null;
let selfWorld;
let selfEntityId;
let selfEntityObj;
const entityObjsById = {};

let userToken;
let nickname;

// Input

let keys = {};
let keyPresses = {};

document.body.addEventListener("keydown", (event) => {
  // event.preventDefault();

  keys[event.code] = true;
  keyPresses[event.code] = true;
});

document.body.addEventListener("keyup", (event) => {
  // event.preventDefault();

  keys[event.code] = false;
});

// Render

const renderer = new THREE.WebGLRenderer({ canvas: $(".ingame canvas"), alpha: false });

let canvasClientRect;

const scene = new THREE.Scene();
scene.add(new THREE.GridHelper(10, 10));

const tileTypeMaterials = {
  [tileTypes.dirt]: new THREE.MeshBasicMaterial({ color: 0xff87632b }),
  [tileTypes.grass]: new THREE.MeshBasicMaterial({ color: 0xff46bc68 }),
  [tileTypes.water]: new THREE.MeshBasicMaterial({ color: 0xff1981f4 }),
  [tileTypes.rock]: new THREE.MeshBasicMaterial({ color: 0xffacafb7 })
}


const mapRoot = new THREE.Object3D();
scene.add(mapRoot);

const entitiesRoot = new THREE.Object3D();
scene.add(entitiesRoot);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);

function animate() {
  requestAnimationFrame(animate);

  // Input
  const move = new THREE.Vector3();
  if (keys.KeyW) move.z -= 1;
  if (keys.KeyS) move.z += 1;

  if (keys.KeyA) move.x -= 1;
  if (keys.KeyD) move.x += 1;

  if (move.lengthSq() > 0) {
    const speed = 0.1;
    move.normalize().multiplyScalar(speed);

    selfEntityObj.position.add(move);
    socket.emit("move", selfEntityObj.position.x, selfEntityObj.position.z);
  }

  keyPresses = {};

  // Draw
  canvasClientRect = renderer.domElement.parentElement.getBoundingClientRect();
  renderer.setSize(canvasClientRect.width, canvasClientRect.height, false);
  camera.aspect = canvasClientRect.width / canvasClientRect.height;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  if (selfEntityObj != null) {
    camera.position.x = selfEntityObj.position.x;
    camera.position.y = 10;
    camera.position.z = selfEntityObj.position.z + 10;

    camera.lookAt(selfEntityObj.position);
  }
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

socket.on("addEntity", (entityId, entity) => {
  selfWorld.entitiesById[entityId] = entity;
  addEntity(entityId, entity);
});

socket.on("moveEntity", (entityId, pos) => {
  if (entityId === selfEntityId) return;

  const entity = selfWorld.entitiesById[entityId];
  entity.pos = pos;
  entityObjsById[entityId].position.set(entity.pos[0], 0, entity.pos[1]);
});

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
        const geometry = tile === tileTypes.rock ? new THREE.BoxGeometry(1, 1, 1) : new THREE.PlaneGeometry(1, 1, 1, 1);
        if (tile === tileTypes.rock) geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
        else geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(i, 0, j);
        mapRoot.add(mesh);
      }
    }
  }

  for (const [entityId, entity] of Object.entries(selfWorld.entitiesById)) addEntity(entityId, entity);
}

function addEntity(entityId, entity) {
  switch (entity.type) {
    case "player":
      const box = new THREE.BoxGeometry(1, 1, 1);
      box.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));

      const color = new THREE.Color(0xffffff).setHex(entity.color);
      const material = new THREE.MeshBasicMaterial({ color });

      const entityObj = new THREE.Object3D();
      entityObj.position.set(entity.pos[0], 0, entity.pos[1]);

      const entityCube = new THREE.Mesh(box, material);
      entityObj.add(entityCube);

      const nameplateCanvas = document.createElement("canvas");
      nameplateCanvas.width = 256;
      nameplateCanvas.height = 64;
      const nameplateCtx = nameplateCanvas.getContext("2d", { alpha: true });
      nameplateCtx.clearRect(0, 0, nameplateCanvas.width, nameplateCanvas.height);
      nameplateCtx.textAlign = "center";
      nameplateCtx.textBaseline = "middle";
      nameplateCtx.fillStyle = "#ffaaaa";
      nameplateCtx.font = "bold 32px Arial";
      nameplateCtx.fillText(entity.nickname, nameplateCanvas.width / 2, nameplateCanvas.height / 2);

      const nameplateMap = new THREE.CanvasTexture(nameplateCanvas);

      const nameplateMaterial = new THREE.SpriteMaterial({ map: nameplateMap });

      const nameplateSprite = new THREE.Sprite(nameplateMaterial);
      nameplateSprite.scale.set(4, 1, 1);
      nameplateSprite.position.set(0, 2, 0);
      entityObj.add(nameplateSprite);

      entitiesRoot.add(entityObj);

      entityObjsById[entityId] = entityObj;
      if (entityId === selfEntityId) selfEntityObj = entityObj;

      break;
  }
}