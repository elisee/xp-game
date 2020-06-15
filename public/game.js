"use strict";

let playerEntries = [];
let selfPeerId = null;
let selfPlayerEntry = null;

let milestone = {
  name: "none"
};

let username = "GUEST";
const password = localStorage.getItem("hangmanPassword");

// Network
const socket = io({ reconnection: false, transports: ["websocket"] });

username = prompt("username?", "elisee")
socket.emit("joinGame", username, socket_joinGameCallback);

window.addEventListener("message", (event) => {
  const actualEvent = JSON.parse(event.data);

  if (actualEvent.name === "setUsername") {
    username = actualEvent.username;
    socket.emit("joinGame", actualEvent.username, socket_joinGameCallback);
  }
});

socket.on("disconnect", () => {
  document.body.innerHTML = "";
  document.body.textContent = "Disconnected.";
})

function socket_joinGameCallback(data) {
  $hide(".loading");

  playerEntries = data.playerEntries;
  selfPeerId = data.selfPeerId;
  selfPlayerEntry = playerEntries.find(x => x.id === selfPeerId);

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

  renderHostButton();
}

function renderHostButton() {
  $show(".seating .host", playerEntries.length > 0 && playerEntries[0].id === selfPeerId);
}

$(".seating .host button").addEventListener("click", (event) => {
  socket.emit("start");
});

function renderRound() {
  $show(".round");
  $hide(".seating");

  $(".maskedWord").textContent = milestone.maskedWord;
  $(".alphabet").innerHTML = "";

  for (const letter of "abcdefghijklmnopqrstuvwxyz-'") {
    $make("span", $(".alphabet"), { textContent: letter, className: milestone.usedLetters.includes(letter) ? "used" : "notUsed" });
  }

  $(".round .otherTurn .username").textContent = playerEntries.find(x => x.id === milestone.currentPlayerPeerId).username;

  $show(".round .selfTurn", milestone.currentPlayerPeerId === selfPeerId);
  $show(".round .otherTurn", milestone.currentPlayerPeerId !== selfPeerId);

  if (milestone.currentPlayerPeerId === selfPeerId) $(".round .selfTurn input").focus();
}

$(".round").addEventListener("click", (event) => {
  if (milestone.currentPlayerPeerId === selfPeerId) $(".round .selfTurn input").focus();
});

function renderScoreboard() {
  const scoreboardElt = $(".scoreboard");
  scoreboardElt.innerHTML = "";

  for (const entry of playerEntries) {
    const isCurrentPlayer = milestone.name === "round" && entry.id === milestone.currentPlayerPeerId;

    const playerDiv = $make("div", scoreboardElt, { className: `player ${isCurrentPlayer ? "currentPlayer" : ""}` });
    const usernameDiv = $make("div", playerDiv, { className: "username", textContent: `${isCurrentPlayer ? "🎈 " : ""}${entry.username}` });
    const pointsDiv = $make("div", playerDiv, { className: "points", textContent: entry.points });
    const correctLettersDiv = $make("div", playerDiv, { className: "correctLetters", textContent: entry.correctLetters });
    const wrongLettersDiv = $make("div", playerDiv, { className: "wrongLetters", textContent: entry.wrongLetters });
  }
}

socket.on("addPlayerEntry", (playerEntry) => {
  playerEntries.push(playerEntry);

  renderScoreboard();
  renderHostButton();
});

socket.on("setCurrentPlayerPeerId", (peerId) => {
  milestone.currentPlayerPeerId = peerId;

  renderScoreboard();
  renderRound();
});

socket.on("removePlayerEntry", (playerId) => {
  const index = playerEntries.findIndex(x => x.id === playerId);
  playerEntries.splice(index, 1);

  renderScoreboard();
  renderHostButton();
});

socket.on("setMilestone", (newMilestone) => {
  milestone = newMilestone;

  if (milestone.name === "seating") {
    playerEntries.length = 0;
    renderSeating();
  } else {
    for (const playerEntry of playerEntries) {
      playerEntry.points = 0;
      playerEntry.correctLetters.length = 0;
      playerEntry.wrongLetters.length = 0;
    }
    renderScoreboard();
    renderRound();
  }
});

socket.on("setPlayerEntries", (newPlayerEntries) => {
  playerEntries = newPlayerEntries;
  renderScoreboard();
  renderHostButton();
})

$(".selfTurn").addEventListener("submit", (event) => {
  event.preventDefault();

  const letter = $(".selfTurn input").value;
  $(".selfTurn input").value = "";

  socket.emit("playLetter", letter);
});

socket.on("playLetter", (data) => {
  const playerIndex = playerEntries.findIndex(x => x.id === data.playerPeerId);
  const playerEntry = playerEntries[playerIndex];

  if (data.correct) playerEntry.correctLetters.push(data.letter);
  else playerEntry.wrongLetters.push(data.letter);

  playerEntry.points = data.points;

  milestone.maskedWord = data.maskedWord;
  milestone.usedLetters = data.usedLetters;

  if (!data.correct) {
    const newPlayerIndex = (playerIndex + 1) % playerEntries.length;
    milestone.currentPlayerPeerId = playerEntries[newPlayerIndex].id;
  }

  renderScoreboard();
  renderRound();
});