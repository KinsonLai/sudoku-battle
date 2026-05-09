const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { RoomManager } = require('./game/roomManager');
const { setupSocketHandlers } = require('./socket/events');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : process.env.RENDER
    ? '*'
    : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const roomManager = new RoomManager();
setupSocketHandlers(io, roomManager);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'sudoku-battle-server', timestamp: Date.now() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Sudoku server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  roomManager.destroy();
  server.close();
});
