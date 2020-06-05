"use strict";

const socket = io({ reconnection: false, transports: ["websocket"] });

socket.emit("joinGame", (data) => {
  $make("div", document.body, { textContent: JSON.stringify(data, null, 2) });
});
