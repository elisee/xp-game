"use strict";

const express = require("express");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static(path.resolve(__dirname, "../public")));
app.use("/three.min.js", express.static(path.resolve(__dirname, "../node_modules/three/build/three.min.js")));

io.on("connect", (socket) => {

  socket.on("joinGame", (callback) => {
    callback("Bienvenue lol");
  });

  console.log("Socket has connected.");
});

server.listen(4001);
console.log(`XP Game started.`);
