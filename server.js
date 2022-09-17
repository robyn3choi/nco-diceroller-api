const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const port = process.env.PORT || 3001;

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://nco-diceroller.herokuapp.com"],
    methods: ["GET", "POST"],
  },
});

const players = [];

app.get("/", (req, res) => {
  res.send("hello world");
});

io.on("connection", (socket) => {
  console.log("connected");
  socket.on("roll", ({ actionDiceCount, dangerDiceCount }) => {
    const actionDice = [];
    const dangerDice = [];

    for (let i = 0; i < actionDiceCount; i++) {
      actionDice.push(Math.floor(Math.random() * 6 + 1));
    }
    for (let i = 0; i < dangerDiceCount; i++) {
      dangerDice.push(Math.floor(Math.random() * 6 + 1));
    }
    const player = players.find((p) => p.id === socket.id);

    io.emit("rolled", { actionDice, dangerDice, name: player.name });
  });

  socket.on("playerJoined", (name) => {
    console.log("playerJoined");
    players.push({ name, id: socket.id });
    io.emit("playersUpdated", players);
  });

  socket.on("disconnect", () => {
    const index = players.findIndex((p) => p.id === socket.id);
    if (index > -1) {
      players.splice(index, 1);
    }
    io.emit("playersUpdated", players);
  });
});

server.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
