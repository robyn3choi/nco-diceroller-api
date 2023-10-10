import express from "express"
import http from "http"
import cors from "cors"
import { Server } from "socket.io"

const port = process.env.PORT || 3001
const app = express()
app.use(cors())
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://nco-diceroller.vercel.app"],
    methods: ["GET", "POST"],
  },
})

const players: { socketId: string; name: string; room: string }[] = []

app.get("/", (req, res) => {
  res.send("hello world")
})

io.on("connection", (socket) => {
  console.log(`Connected with socketId: ${socket.id}`)

  socket.on("playerJoined", ({ room, playerName }) => {
    socket.join(room)
    players.push({ socketId: socket.id, name: playerName, room })

    console.log(`Player: ${playerName} with socketId: ${socket.id} joined room: ${room}`)

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

    const index = players.findIndex((p) => p.socketId === socket.id)
    if (index > -1) {
      const [removedPlayer] = players.splice(index, 1)
      console.log(`Player: ${removedPlayer.name} with socketId: ${socket.id} left room: ${room}`)
    } else {
      console.log(`Tried to remove player with socketId: ${socket.id} but it didn't exist in the players array`)
    }

    io.to(room).emit(
      "playersUpdated",
      players.map((p) => p.name)
    )
  })
})

app.get("/player", (req, res) => {
  const { playerName, room } = req.query
  if (players.find((p) => p.room === room && p.name.toLowerCase() === (playerName as string).toLowerCase())) {
    res.send({ exists: true })
  } else {
    res.send({ exists: false })
  }
})

server.listen(port, () => {
  console.log(`nco-diceroller-server running on port: ${port}`)
})
