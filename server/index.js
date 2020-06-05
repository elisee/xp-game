"use strict";

const path = require("path");
const express = require("express");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static(path.resolve(__dirname, "../public")));
app.use("/three.min.js", express.static(path.resolve(__dirname, "../node_modules/three/build/three.min.js")));

const playerEntries = [];
const playersById = {};

let nextPlayerId = 0;

io.on("connect", (socket) => {
  let player;

  socket.on("joinGame", (callback) => {
    // TODO: Validate callback

    const entry = { id: nextPlayerId++, pos: [0, 0, 0], angle: 0 };
    player = { entry };

    playerEntries.push(entry);
    playersById[entry.id] = player;

    callback({ playerEntries, selfPlayerId: entry.id });

    io.in("game").emit("addPlayerEntry", entry);
    socket.join("game");
  });

  socket.on("move", (pos) => {
    // TODO: Validate pos

    player.entry.pos = pos;
    io.in("game").emit("movePlayer", player.entry.id, pos);
  });

  socket.on("disconnect", () => {
    if (player == null) return;

    playerEntries.splice(playerEntries.indexOf(player.entry), 1);

    io.in("game").emit("removePlayerEntry", player.entry.id);
  });
});

server.listen(4001);
console.log(`XP_GAME_STARTED`);
