const { v4: uuidv4 } = require('./uuid');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
  }

  createRoom(creatorName, mode, difficulty) {
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      creator: creatorName,
      mode,
      difficulty,
      state: 'waiting',
      players: [],
      game: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  addPlayer(roomId, socketId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.state !== 'waiting') return null;
    if (room.players.length >= 4) return null;
    if (room.players.some(p => p.name === playerName)) return null;

    const player = {
      id: socketId,
      name: playerName,
      connected: true,
      score: 0,
      cellsCompleted: 0,
      mistakes: 0,
      completedAt: null,
      board: null,
    };

    room.players.push(player);
    room.lastActivity = Date.now();
    this.playerRooms.set(socketId, roomId);
    return { room, player };
  }

  removePlayer(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === socketId);
    if (player) {
      player.connected = false;
      room.lastActivity = Date.now();
    }

    this.playerRooms.delete(socketId);
    return { room, player };
  }

  reconnectPlayer(socketId, oldSocketId) {
    const parts = this.playerRooms.get(oldSocketId);
    if (!parts) return null;
    const room = this.rooms.get(parts.roomId);
    if (!room) return null;

    this.playerRooms.delete(oldSocketId);
    this.playerRooms.set(socketId, parts.roomId);

    const player = room.players.find(p => p.id === parts.playerId);
    if (player) {
      player.id = socketId;
      player.connected = true;
    }

    return { room, player };
  }

  getPlayerRoom(socketId) {
    const roomId = this.playerRooms.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  setGame(roomId, gameState) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.game = gameState;
    room.state = 'playing';
    room.lastActivity = Date.now();
  }

  endGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.state = 'finished';
    room.lastActivity = Date.now();
  }

  resetRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.state = 'waiting';
    room.game = null;
    room.players.forEach(p => {
      p.score = 0;
      p.cellsCompleted = 0;
      p.mistakes = 0;
      p.completedAt = null;
      p.board = null;
    });
    room.lastActivity = Date.now();
  }

  cleanupDisconnected(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const before = room.players.length;
    room.players = room.players.filter(p => p.connected);
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    }
  }

  cleanupStaleRooms() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000;
    for (const [id, room] of this.rooms) {
      if (now - room.lastActivity > timeout) {
        this.rooms.delete(id);
      }
      if (room.state === 'finished' && now - room.lastActivity > 5 * 60 * 1000) {
        this.rooms.delete(id);
      }
    }
  }

  getRoomCount() {
    return this.rooms.size;
  }

  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    if (this.rooms.has(id)) return this.generateRoomId();
    return id;
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.rooms.clear();
    this.playerRooms.clear();
  }
}

module.exports = { RoomManager };
