const express = require("express")
const app = express()
const http = require("http")
const cors = require("cors")
import { Server } from "socket.io"

const port = process.env.PORT || 3001

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://nco-diceroller.vercel.app"],
    methods: ["GET", "POST"],
  },
})

const players: { name: string; room: string }[] = []

app.get("/", (req, res) => {
  res.send("hello world")
})

io.on("connection", (socket) => {
  console.log("connected", socket.id)

  socket.on("playerJoined", ({ room, playerName }) => {
    socket.join(room)
    players.push({ name: playerName, room })

    console.log(`Player: ${playerName} joined room: ${room}`)

    const playersInRoom = players.filter((p) => p.room === room).map((p) => p.name)

    io.to(room).emit("playersUpdated", playersInRoom)
  })

  socket.on("roll", ({ room, playerName, actionDiceCount, dangerDiceCount }) => {
    const actionDice: number[] = []
    const dangerDice: number[] = []

    for (let i = 0; i < actionDiceCount; i++) {
      actionDice.push(Math.floor(Math.random() * 6 + 1))
    }
    for (let i = 0; i < dangerDiceCount; i++) {
      dangerDice.push(Math.floor(Math.random() * 6 + 1))
    }

    io.sockets.in(room).emit("rolled", { actionDice, dangerDice, playerName })
  })

  socket.on("disconnecting", (reason) => {
    let room
    socket.rooms.forEach((r) => {
      if (r !== socket.id) room = r
    })
    const index = players.findIndex((p) => p.room === room)
    if (index > -1) {
      players.splice(index, 1)
    }
    io.to(room).emit(
      "playersUpdated",
      players.map((p) => p.name)
    )
  })
})

app.get("/player", (req, res) => {
  const { playerName, room } = req.query
  if (players.find((p) => p.room === room && p.name === playerName)) {
    res.send({ exists: true })
  } else {
    res.send({ exists: false })
  }
})

server.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
