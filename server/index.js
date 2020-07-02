//@ts-check

"use strict";

const { validate } = require("./input");

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const localFolderPath = path.resolve(__dirname, "../local");
try { fs.mkdirSync(localFolderPath); } catch { }

const tileTypes = require("../public/tileTypes");

const game = {
  pub: {},

  playersByUserToken: {},
  worldsByName: {},
  worldStatesByName: {},

  peersById: {},
  peersByUserToken: {}
};

const worldsFolderPath = path.join(localFolderPath, "worlds");
if (fs.existsSync(worldsFolderPath)) {
  loadData();
} else {
  initData();
  // saveData();
}

for (const [worldName, world] of Object.entries(game.worldsByName)) {
  const worldState = game.worldStatesByName[worldName] = {
    bulletEntities: [],
    playerEntities: []
  };

  for (const entity of Object.values(world.entitiesById)) {
    switch (entity.type) {
      case "player": worldState.playerEntities.push(entity); break;
      case "bullet": worldState.bulletEntities.push(entity); break;
    }
  }
}

function loadData() {
  game.playersByUserToken = JSON.parse(fs.readFileSync(path.join(localFolderPath, "players.json"), { encoding: "utf8" }));

  for (const fileName of fs.readdirSync(worldsFolderPath)) {
    const worldName = fileName.substring(0, fileName.length - ".json".length);
    game.worldsByName[worldName] = JSON.parse(fs.readFileSync(path.join(worldsFolderPath, fileName), { encoding: "utf8" }));
  }
}

function saveData() {
  fs.writeFileSync(path.join(localFolderPath, "players.json"), JSON.stringify(game.playersByUserToken, null, 2));

  try { fs.mkdirSync(worldsFolderPath); } catch { }

  for (const [worldName, world] of Object.entries(game.worldsByName)) {
    fs.writeFileSync(path.join(worldsFolderPath, `${worldName}.json`), JSON.stringify(world, null, 2));
  }
}

function initData() {
  function makeWorld(width, height) {
    const tiles = [];

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if (i >= 2 && i < width - 2 && j >= 2 && j < height - 2) tiles.push(tileTypes.dirt);
        else tiles.push(tileTypes.empty);
      }
    }

    let nextEntityId = 0;
    const entitiesById = {};
    /*entitiesById[nextEntityId.toString()] = { type: "tree", pos: [Math.round(width / 2), Math.round(height / 2)] };
    nextEntityId++;*/

    const world = { width, height, tiles, entitiesById, nextEntityId };
    return world;
  }

  game.worldsByName["forster"] = makeWorld(128, 128);
}


const express = require("express");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use("/three.js", express.static(path.resolve(__dirname, "../node_modules/three/build/three.js")));
app.use(express.static(path.resolve(__dirname, "../public")));

let nextPeerId = 0;

io.on("connect", (socket) => {
  let peer;
  let world;
  let worldState;

  socket.on("joinGame", (userToken, nickname, callback) => {
    if (!validate.string(userToken, 16, 16)) return socket.disconnect(true);
    if (!validate.string(nickname, 1, 30)) return socket.disconnect(true);
    if (!validate.function(callback)) return socket.disconnect(true);
    if (game.peersByUserToken[userToken]) return socket.disconnect(true);

    let player = game.playersByUserToken[userToken];
    let world;
    let entity;

    if (player == null) {
      world = game.worldsByName["forster"];
      worldState = game.worldStatesByName["forster"];

      player = {
        worldName: "forster",
        entityId: world.nextEntityId.toString(),
        lastShootTime: 0
      };
      world.nextEntityId++;

      world.entitiesById[player.entityId] = entity = {
        id: player.entityId,
        type: "player",
        pos: [64, 66],
        angle: 0,
        nickname,
        color: Math.floor(Math.random() * 0xffffff),
        health: 5
      };
      worldState.playerEntities.push(entity);

      game.playersByUserToken[userToken] = player;

      io.in("game").emit("addEntity", player.entityId, entity);
    } else {
      world = game.worldsByName[player.worldName];
      worldState = game.worldStatesByName[player.worldName];
      entity = world.entitiesById[player.entityId];
    }


    const entry = { id: nextPeerId++, nickname };

    peer = { userToken, entry };
    game.peersByUserToken[peer.userToken] = peer;
    game.peersById[entry.id] = peer;

    callback({ selfPeerId: entry.id, world, entityId: player.entityId });

    socket.join("game");

    socket.on("move", (x, z, angle) => {
      if (!validate.finite(x, 0, world.width)) return socket.disconnect(true);
      if (!validate.finite(z, 0, world.height)) return socket.disconnect(true);
      if (entity.health <= 0) return;

      entity.pos = [x, z];
      entity.angle = angle;
      io.in("game").emit("moveEntity", player.entityId, entity.pos, entity.angle);
    });

    socket.on("shoot", (angle) => {
      if (!validate.finite(angle, -Math.PI, Math.PI)) return socket.disconnect(true);
      if (entity.health <= 0) return;

      if (Date.now() - player.lastShootTime < 500) return;
      player.lastShootTime = Date.now();

      entity.angle = angle;
      io.in("game").emit("moveEntity", player.entityId, entity.pos, entity.angle);

      const bulletEntityId = world.nextEntityId.toString();
      world.nextEntityId++;

      const bulletEntity = world.entitiesById[bulletEntityId] = {
        id: bulletEntityId,
        type: "bullet",
        pos: entity.pos.slice(0),
        angle: entity.angle,
        speed: 0.03,
        lifetime: 500,
        shooterEntityId: player.entityId
      };

      worldState.bulletEntities.push(bulletEntity);

      io.in("game").emit("addEntity", bulletEntityId, bulletEntity);
    });
  });

  socket.on("disconnect", () => {
    if (peer == null) return;

    delete game.peersByUserToken[peer.userToken];
    delete game.peersById[peer.entry.id];
  });
});

let previousSimulateTime = Date.now();

function simulate() {
  const newTime = Date.now();
  const elapsedTime = newTime - previousSimulateTime;
  previousSimulateTime = newTime;

  for (const [worldName, world] of Object.entries(game.worldsByName)) {
    const removedBulletEntities = new Set();
    const removedEntityIds = new Set();
    const worldState = game.worldStatesByName[worldName];

    for (const bulletEntity of worldState.bulletEntities) {
      let bulletDestroyed = false;

      bulletEntity.lifetime -= elapsedTime;
      if (bulletEntity.lifetime < 0) {
        bulletDestroyed = true;
      } else {

        bulletEntity.pos[0] += Math.cos(bulletEntity.angle) * bulletEntity.speed * elapsedTime;
        bulletEntity.pos[1] -= Math.sin(bulletEntity.angle) * bulletEntity.speed * elapsedTime;

        for (const playerEntity of worldState.playerEntities) {
          if (playerEntity.health <= 0 || playerEntity.id === bulletEntity.shooterEntityId) continue;

          const distance = Math.sqrt(
            (playerEntity.pos[0] - bulletEntity.pos[0]) ** 2 +
            (playerEntity.pos[1] - bulletEntity.pos[1]) ** 2);

          if (distance < 1) {
            bulletDestroyed = true;

            playerEntity.health--;
            io.in("game").emit("setEntityHealth", playerEntity.id, playerEntity.health);

            if (playerEntity.health === 0) {
              setTimeout(() => {
                playerEntity.pos = [64, 64];
                playerEntity.angle = 0;
                playerEntity.health = 5;
                io.in("game").emit("moveEntity", playerEntity.id, playerEntity.pos, playerEntity.angle);
                io.in("game").emit("setEntityHealth", playerEntity.id, 5);
              }, 1000);
            }

            break;
          }
        }
      }

      if (bulletDestroyed) {
        delete world.entitiesById[bulletEntity.id];
        removedEntityIds.add(bulletEntity.id);
        removedBulletEntities.add(bulletEntity);
      }
    }

    for (const bulletEntity of removedBulletEntities) worldState.bulletEntities.splice(worldState.bulletEntities.indexOf(bulletEntity), 1);
    if (removedEntityIds.size > 0) io.in("game").emit("removeEntities", Array.from(removedEntityIds));
  }
}

setInterval(simulate, 1000 / 60);

server.listen(4001);
console.log(`XP_GAME_STARTED`);
