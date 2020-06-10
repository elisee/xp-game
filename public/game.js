"use strict";

let playerEntries = [];
let selfPlayerId = null;
let selfPlayerEntry = null;

let milestone = {
  name: "none"
};

const password = localStorage.getItem("hangmanPassword");
// socket.emit("joinGame", prompt("username?", "elisee"), password, socket_joinGameCallback);

// Network
const socket = io({ reconnection: false, transports: ["websocket"] });

window.addEventListener("message", (event) => {
  const actualEvent = JSON.parse(event.data);

  if (actualEvent.name === "setUsername") {
    socket.emit("joinGame", actualEvent.username, password, socket_joinGameCallback);
  }
});

socket.on("disconnect", () => {
  document.body.innerHTML = "";
  document.body.textContent = "Disconnected.";
})

function socket_joinGameCallback(data) {
  $hide(".loading");

  playerEntries = data.playerEntries;
  selfPlayerId = data.selfPlayerId;
  selfPlayerEntry = playerEntries.find(x => x.id === selfPlayerId);

  milestone = data.milestone;
  if (milestone.name === "seating") renderSeating();
  else renderRound();

  renderScoreboard();
}

function renderSeating() {
  $show(".seating");
  $hide(".round");

  $show(".seating .lastWordContainer", milestone.lastWord != null);
  if (milestone.lastWord != null) $(".seating .lastWord").textContent = milestone.lastWord;

  $show(".seating .lastWinnerContainer", milestone.lastWinnerUsername != null);
  if (milestone.lastWinnerUsername != null) $(".seating .lastWinner").textContent = milestone.lastWinnerUsername;

  $show(".seating .host", password != null);
}

$(".seating .host button").addEventListener("click", (event) => {
  socket.emit("start");
});

function renderRound() {
  $show(".round");
  $hide(".seating");

  $(".maskedWord").textContent = milestone.maskedWord;

  $(".round .otherTurn .username").textContent = playerEntries.find(x => x.id === milestone.currentPlayerId).username;

  $show(".round .selfTurn", milestone.currentPlayerId === selfPlayerId);
  $show(".round .otherTurn", milestone.currentPlayerId !== selfPlayerId);

  if (milestone.currentPlayerId === selfPlayerId) $(".round .selfTurn input").focus();
}

$(".round").addEventListener("click", (event) => {
  if (milestone.currentPlayerId === selfPlayerId) $(".round .selfTurn input").focus();
});

function renderScoreboard() {
  const scoreboardElt = $(".scoreboard");
  scoreboardElt.innerHTML = "";

  for (const entry of playerEntries) {
    const isCurrentPlayer = milestone.name === "round" && entry.id === milestone.currentPlayerId;

    const playerDiv = $make("div", scoreboardElt, { className: "player" });
    const usernameDiv = $make("div", playerDiv, { className: "username", textContent: `${isCurrentPlayer ? "🎈 " : ""}${entry.username}` });
    const pointsDiv = $make("div", playerDiv, { className: "points", textContent: entry.points });
    const correctLettersDiv = $make("div", playerDiv, { className: "correctLetters", textContent: entry.correctLetters });
    const wrongLettersDiv = $make("div", playerDiv, { className: "wrongLetters", textContent: entry.wrongLetters });
  }
}

socket.on("addPlayerEntry", (playerEntry) => {
  playerEntries.push(playerEntry);

  renderScoreboard();
});

socket.on("removePlayerEntry", (playerId) => {
  if (milestone.currentPlayerId === playerId) {
    const playerIndex = playerEntries.findIndex(x => x.id === playerId);
    const newPlayerIndex = (playerIndex + 1) % playerEntries.length;
    milestone.currentPlayerId = playerEntries[newPlayerIndex].id;
  }

  const index = playerEntries.findIndex(x => x.id === playerId);
  playerEntries.splice(index, 1);

  renderScoreboard();
});

socket.on("setMilestone", (newMilestone) => {
  milestone = newMilestone;

  if (milestone.name === "seating") renderSeating();
  else {
    for (const playerEntry of playerEntries) playerEntry.points = 0;
    renderScoreboard();
    renderRound();
  }
});


$(".selfTurn").addEventListener("submit", (event) => {
  event.preventDefault();

  const letter = $(".selfTurn input").value;
  $(".selfTurn input").value = "";

  socket.emit("playLetter", letter);
});

socket.on("playLetter", (data) => {
  const playerIndex = playerEntries.findIndex(x => x.id === data.playerId);
  const playerEntry = playerEntries[playerIndex];

  if (data.correct) playerEntry.correctLetters.push(data.letter);
  else playerEntry.wrongLetters.push(data.letter);

  playerEntry.points = data.points;

  milestone.maskedWord = data.maskedWord;

  if (!data.correct) {
    const newPlayerIndex = (playerIndex + 1) % playerEntries.length;
    milestone.currentPlayerId = playerEntries[newPlayerIndex].id;
  }

  renderScoreboard();
  renderRound();
});