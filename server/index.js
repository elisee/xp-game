//@ts-check

"use strict";

const { validate } = require("./input");

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const localFolderPath = path.resolve(__dirname, "../local");
try { fs.mkdirSync(localFolderPath); } catch { }

let secrets;

try { secrets = JSON.parse(fs.readFileSync(path.join(localFolderPath, "secrets.json"), { encoding: "utf8" })); }
catch {
  const buf = new Buffer(36);
  crypto.randomFillSync(buf);
  secrets = { "password": buf.toString("base64") };
  fs.writeFileSync(path.join(localFolderPath, "secrets.json"), JSON.stringify(secrets));
}

const words = fs.readFileSync(path.resolve(__dirname, "../data/words.txt"), { encoding: "utf8" }).replace(/\r\n/g, "\n").trim().split("\n").map(x => x.trim().toLowerCase());

const letterRegex = /^[a-z'-]$/;

const express = require("express");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static(path.resolve(__dirname, "../public")));

const game = {
  milestone: {
    name: "seating"
  },
  revealedWord: null,
  playerEntries: [],
  playersById: {},
};

let nextPlayerId = 0;

io.on("connect", (socket) => {
  let player;

  socket.on("joinGame", (username, password, callback) => {
    if (!validate.string(username, 1, 30)) return socket.disconnect(true);
    if (!validate.function(callback)) return socket.disconnect(true);
    if (game.milestone.name !== "seating") return socket.disconnect(true);
    if (password != null && !validate.string(password, 1, 1024)) return socket.disconnect(true);
    if (username === "elisee" && password !== secrets.password) return socket.disconnect(true);

    const entry = {
      id: nextPlayerId++,
      username,
      correctLetters: [],
      wrongLetters: [],
      points: 0
    };

    player = {
      entry
    };

    game.playerEntries.push(entry);
    game.playersById[entry.id] = player;

    callback({ playerEntries: game.playerEntries, selfPlayerId: entry.id, milestone: game.milestone });

    io.in("game").emit("addPlayerEntry", entry);
    socket.join("game");
  });

  socket.on("start", () => {
    if (game.milestone.name !== "seating") return;
    if (player.entry.username !== "elisee") return;

    if (game.playerEntries.length < 2) return;

    for (const entry of game.playerEntries) {
      entry.points = 0;
      entry.correctLetters.length = 0;
      entry.wrongLetters.length = 0;
    }

    game.word = getRandomWord();
    game.currentPlayerIndex = Math.floor(Math.random() * game.playerEntries.length);

    game.milestone = {
      name: "round",
      maskedWord: "_".repeat(game.word.length),
      currentPlayerId: game.playerEntries[game.currentPlayerIndex].id
    };

    io.in("game").emit("setMilestone", game.milestone);
  });

  socket.on("playLetter", (letter) => {
    if (!validate.regex(letter, letterRegex)) return;
    if (game.milestone.name !== "round") return;
    if (game.milestone.currentPlayerId !== player.entry.id) return;
    if (player.entry.correctLetters.includes(letter) || player.entry.wrongLetters.includes(letter)) return;

    const foundIndices = [];
    let index = -1;

    while (true) {
      index = game.word.indexOf(letter, index + 1);
      if (index === -1) break;
      foundIndices.push(index);
    }

    let newLettersFound = 0;

    for (const index of foundIndices) {
      if (game.milestone.maskedWord[index] === "_") {
        game.milestone.maskedWord = game.milestone.maskedWord.substring(0, index) + letter + game.milestone.maskedWord.substring(index + 1);
        newLettersFound++;
      }
    }

    const correct = newLettersFound > 0;

    if (correct) {
      player.entry.points += 10 * newLettersFound;
      player.entry.correctLetters.push(letter);
    } else {
      player.entry.points -= 5;
      player.entry.wrongLetters.push(letter);

      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.playerEntries.length;
      game.milestone.currentPlayerId = game.playerEntries[game.currentPlayerIndex].id;
    }

    io.in("game").emit("playLetter", { playerId: player.entry.id, letter, correct, points: player.entry.points, maskedWord: game.milestone.maskedWord });

    if (!game.milestone.maskedWord.includes("_")) endGame();
  });

  socket.on("disconnect", () => {
    if (player == null) return;

    game.playerEntries.splice(game.playerEntries.indexOf(player.entry), 1);
    delete game.playersById[player.entry.id];

    io.in("game").emit("removePlayerEntry", player.entry.id);
  });
});

function getRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function endGame() {
  const sortedPlayerEntries = game.playerEntries.sort((a, b) => b.points - a.points);

  game.milestone = {
    name: "seating",
    lastWord: game.word,
    lastWinnerUsername: sortedPlayerEntries[0].username
  };

  io.in("game").emit("setMilestone", game.milestone);
}

server.listen(4001);
console.log(`XP_GAME_STARTED`);
