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
    const entry = { id: nextPlayerId++ };
    player = { entry };

    playerEntries.push(entry);
    playersById[entry.id] = player;

    callback({ playerEntries });

    io.in("game").emit("addPlayerEntry", entry);
    socket.join("game");
  });

  socket.on("disconnect", () => {
    playerEntries.splice(playerEntries.indexOf(player.entry), 1);

    io.in("game").emit("removePlayerEntry", player.entry.id);
  });
});

server.listen(4001);
console.log(`XP_GAME_STARTED`);
