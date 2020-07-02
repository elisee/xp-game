//@ts-check

"use strict";

const { validate } = require("./input");

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const localFolderPath = path.resolve(__dirname, "../local");
try { fs.mkdirSync(localFolderPath); } catch { }

const express = require("express");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static(path.resolve(__dirname, "../public")));

const game = {
  pub: {},
  worlds: {},
  peersById: {},
  peersByUserToken: {}
};

let nextPeerId = 0;

io.on("connect", (socket) => {
  let peer;
  let world;

  socket.on("joinGame", (userToken, nickname, callback) => {
    if (!validate.string(userToken, 16, 16)) return socket.disconnect(true);
    if (!validate.string(nickname, 1, 30)) return socket.disconnect(true);
    if (!validate.function(callback)) return socket.disconnect(true);
    if (game.peersByUserToken[userToken]) return socket.disconnect(true);

    const entry = { id: nextPeerId++, nickname };

    peer = { userToken, entry };
    game.peersByUserToken[peer.userToken] = peer;
    game.peersById[entry.id] = peer;

    callback({ selfPeerId: entry.id, world });

    socket.join("game");
  });

  socket.on("disconnect", () => {
    if (peer == null) return;

    delete game.peersByUserToken[peer.userToken];
    delete game.peersById[peer.entry.id];
  });
});

server.listen(4001);
console.log(`XP_GAME_STARTED`);
