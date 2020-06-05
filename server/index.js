"use strict";

const server = require("http").createServer();
const io = require("socket.io")(server);

io.on("connect", (socket) => {
  console.log("Socket has connected.");
});

server.listen(4001);
console.log(`XP Game started.`);
