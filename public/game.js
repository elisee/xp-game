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
