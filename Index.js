const express = require('express')
const http = require('http')
const path = require('path')
const { Server } = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = new Server(server)
app.use(express.static(path.join(__dirname, 'public')))
const MAX_HISTORY = 200
const messageHistory = []
const onlineUsers = new Map()
io.on('connection', socket => {
  socket.on('join', username => {
    username = String(username || 'Anonymous').trim().slice(0, 30)
    onlineUsers.set(socket.id, username)
    socket.emit('joined', { socketId: socket.id, username, history: messageHistory })
    io.emit('presence', { users: Array.from(onlineUsers.values()) })
    const joinMsg = { id: genId(), username: 'System', text: `${username} joined`, time: Date.now() }
    pushMsg(joinMsg)
    io.emit('message', joinMsg)
  })
  socket.on('sendMessage', text => {
    const username = onlineUsers.get(socket.id) || 'Anonymous'
    const cleaned = String(text || '').trim()
    if (!cleaned) return
    const msg = { id: genId(), username, text: cleaned, time: Date.now() }
    pushMsg(msg)
    io.emit('message', msg)
  })
  socket.on('disconnect', () => {
    const username = onlineUsers.get(socket.id)
    onlineUsers.delete(socket.id)
    io.emit('presence', { users: Array.from(onlineUsers.values()) })
    if (username) {
      const leaveMsg = { id: genId(), username: 'System', text: `${username} left`, time: Date.now() }
      pushMsg(leaveMsg)
      io.emit('message', leaveMsg)
    }
  })
})
function pushMsg(m) {
  messageHistory.push(m)
  if (messageHistory.length > MAX_HISTORY) messageHistory.shift()
}
function genId() {
  return Math.random().toString(36).slice(2, 9)
}
const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
