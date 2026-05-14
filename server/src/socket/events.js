const {
  generatePuzzle,
  validateMove,
  isBoardComplete,
  isCellCorrect,
  getHintCell,
  isCellEmpty,
} = require('../sudoku/generator');

const RECONNECT_WINDOW = 60000;
const CORRECT_SCORE = 10;
const INCORRECT_SCORE = -5;
const MAX_PLAYERS = 4;

function deepCopyBoard(board) {
  return board.map((row) => [...row]);
}

function getRoomState(room) {
  if (!room) return null;

  const players = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
    score: p.score,
    cellsCompleted: p.cellsCompleted,
    mistakes: p.mistakes,
    completedAt: p.completedAt,
    credits: p.credits !== undefined ? p.credits : 0,
    coopCorrectMoves: p.coopCorrectMoves !== undefined ? p.coopCorrectMoves : 0,
    coopMistakes: p.coopMistakes !== undefined ? p.coopMistakes : 0,
  }));

  const state = {
    id: room.id,
    creator: room.creator,
    mode: room.mode,
    difficulty: room.difficulty,
    state: room.state,
    players,
    createdAt: room.createdAt,
  };

  if (room.game) {
    state.game = {
      puzzle: room.game.puzzle,
      startTime: room.game.startTime,
      boards: room.game.boards,
    };
    if (room.state === 'finished' && room.game.winner) {
      state.game.winner = room.game.winner;
    }
  }

  return state;
}

function setupSocketHandlers(io, roomManager) {
  const disconnectedPlayers = new Map();

  io.on('connection', (socket) => {
    socket.on('create_room', ({ name, mode, difficulty } = {}) => {
      try {
        if (!name || !mode || !difficulty) {
          socket.emit('create_error', { message: 'Name, mode, and difficulty are required' });
          return;
        }

        const room = roomManager.createRoom(name, mode, difficulty);
        const result = roomManager.addPlayer(room.id, socket.id, name);
        if (!result) {
          socket.emit('create_error', { message: 'Failed to join room' });
          return;
        }

        socket.join(room.id);
        socket.emit('room_created', getRoomState(result.room));
        io.to(room.id).emit('room_updated', getRoomState(result.room));
      } catch (err) {
        socket.emit('create_error', { message: err.message || 'Internal error' });
      }
    });

    socket.on('join_room', ({ name, roomId } = {}) => {
      try {
        if (!name || !roomId) {
          socket.emit('join_error', { message: 'Name and room ID are required' });
          return;
        }

        const room = roomManager.rooms.get(roomId);
        if (!room) {
          socket.emit('join_error', { message: 'Room not found' });
          return;
        }

        const result = roomManager.addPlayer(roomId, socket.id, name);
        if (!result) {
          socket.emit('join_error', {
            message: 'Cannot join room. It may be full, in progress, or the name is taken.',
          });
          return;
        }

        socket.join(roomId);
        socket.emit('room_joined', getRoomState(result.room));
        io.to(roomId).emit('room_updated', getRoomState(result.room));
      } catch (err) {
        socket.emit('join_error', { message: err.message || 'Internal error' });
      }
    });

    socket.on('leave_room', () => {
      try {
        const room = roomManager.getPlayerRoom(socket.id);
        if (!room) return;

        const idx = room.players.findIndex((p) => p.id === socket.id);
        if (idx === -1) return;

        const player = room.players[idx];
        room.players.splice(idx, 1);
        roomManager.playerRooms.delete(socket.id);
        socket.leave(room.id);

        io.to(room.id).emit('player_left', {
          playerId: player.id,
          playerName: player.name,
        });
        io.to(room.id).emit('room_updated', getRoomState(room));

        if (room.players.length === 0) {
          roomManager.rooms.delete(room.id);
        } else if (room.creator === player.name) {
          room.creator = room.players[0].name;
          io.to(room.id).emit('room_updated', getRoomState(room));
        }
      } catch (_) {
        // fail silently
      }
    });

    socket.on('start_game', () => {
      try {
        const room = roomManager.getPlayerRoom(socket.id);
        if (!room || room.state !== 'waiting') return;
        if (room.players.length < 2) {
          socket.emit('start_error', { message: 'Need at least 2 players' });
          return;
        }

        const { puzzle, solution } = generatePuzzle(room.difficulty);

        if (room.mode === 'coop') {
          const sharedBoard = deepCopyBoard(puzzle);
          roomManager.setGame(room.id, {
            puzzle: deepCopyBoard(puzzle),
            solution,
            startTime: Date.now(),
            boards: { shared: sharedBoard },
          });
        } else {
          const boards = {};
          for (const player of room.players) {
            boards[player.id] = deepCopyBoard(puzzle);
            player.board = deepCopyBoard(puzzle);
          }
          roomManager.setGame(room.id, {
            puzzle: deepCopyBoard(puzzle),
            solution,
            startTime: Date.now(),
            boards,
          });
        }

        io.to(room.id).emit('game_started', {
          puzzle: deepCopyBoard(puzzle),
          startTime: room.game.startTime,
          mode: room.mode,
        });
      } catch (err) {
        socket.emit('start_error', { message: err.message || 'Failed to start game' });
      }
    });

    socket.on('make_move', ({ row, col, value } = {}) => {
      try {
        const room = roomManager.getPlayerRoom(socket.id);
        if (!room || !room.game || room.state !== 'playing') return;

        if (
          typeof row !== 'number' || typeof col !== 'number' ||
          row < 0 || row > 8 || col < 0 || col > 8 ||
          typeof value !== 'number' || value < 0 || value > 9
        ) {
          socket.emit('move_result', { valid: false, row, col, error: 'Invalid coordinates or value' });
          return;
        }

        const { puzzle, solution, boards } = room.game;
        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        const board = room.mode === 'coop' ? boards.shared : boards[player.id];

        if (!board) {
          socket.emit('move_result', { valid: false, row, col, error: 'Board not found' });
          return;
        }

        if (puzzle[row][col] !== 0) {
          socket.emit('move_result', {
            valid: false, row, col, value,
            error: 'Cannot overwrite a given cell',
          });
          return;
        }

        if (value === 0) {
          board[row][col] = 0;
          io.to(room.id).emit('move_result', {
            playerId: player.id,
            playerName: player.name,
            row,
            col,
            value: 0,
            correct: null,
            valid: true,
            erased: true,
          });
          io.to(room.id).emit('room_updated', getRoomState(room));
          return;
        }

        if (board[row][col] !== 0 && isCellCorrect(board, solution, row, col)) {
          socket.emit('move_result', {
            valid: false, row, col, value,
            error: 'This cell is already correctly filled',
          });
          return;
        }

        if (!validateMove(board, row, col, value)) {
          if (room.mode === 'battle') {
            player.score += INCORRECT_SCORE;
            player.mistakes += 1;
          }
          if (room.mode === 'coop') {
            if (player.coopMistakes === undefined) player.coopMistakes = 0;
            player.coopMistakes += 1;
            player.mistakes += 1;
          }

          io.to(room.id).emit('move_result', {
            playerId: player.id,
            playerName: player.name,
            row,
            col,
            value,
            correct: false,
            valid: false,
          });
          io.to(room.id).emit('room_updated', getRoomState(room));
          return;
        }

        board[row][col] = value;
        const correct = isCellCorrect(board, solution, row, col);

        if (correct) {
          if (room.mode === 'battle') {
            player.score += CORRECT_SCORE;
            player.cellsCompleted += 1;
          } else if (room.mode === 'coop') {
            if (player.coopCorrectMoves === undefined) player.coopCorrectMoves = 0;
            player.coopCorrectMoves += 1;
            player.cellsCompleted += 1;
          }
        } else {
          if (room.mode === 'battle') {
            player.score += INCORRECT_SCORE;
            player.mistakes += 1;
          } else if (room.mode === 'coop') {
            if (player.coopMistakes === undefined) player.coopMistakes = 0;
            player.coopMistakes += 1;
            player.mistakes += 1;
          }
          board[row][col] = 0;
        }

        io.to(room.id).emit('move_result', {
          playerId: player.id,
          playerName: player.name,
          row,
          col,
          value,
          correct,
          valid: true,
        });
        io.to(room.id).emit('room_updated', getRoomState(room));

        let gameOver = false;
        let winner = null;
        const elapsed = Math.floor((Date.now() - room.game.startTime) / 1000);

        if (room.mode === 'coop') {
          if (isBoardComplete(boards.shared, solution)) {
            gameOver = true;
            winner = 'all';
            for (const p of room.players) {
              p.completedAt = elapsed;
            }
          }
        } else {
          for (const p of room.players) {
            if (isBoardComplete(boards[p.id], solution)) {
              gameOver = true;
              winner = { id: p.id, name: p.name };
              p.completedAt = elapsed;
              break;
            }
          }
        }

        if (gameOver) {
          roomManager.endGame(room.id);
          room.game.winner = winner;
          io.to(room.id).emit('game_over', {
            winner,
            mode: room.mode,
            elapsed,
            players: room.players.map((p) => ({
              id: p.id,
              name: p.name,
              score: p.score,
              cellsCompleted: p.cellsCompleted,
              mistakes: p.mistakes,
              completedAt: p.completedAt,
              coopCorrectMoves: p.coopCorrectMoves !== undefined ? p.coopCorrectMoves : 0,
              coopMistakes: p.coopMistakes !== undefined ? p.coopMistakes : 0,
            })),
          });
        }
      } catch (err) {
        socket.emit('move_result', { valid: false, error: err.message || 'Move processing failed' });
      }
    });

    socket.on('request_hint', () => {
      try {
        const room = roomManager.getPlayerRoom(socket.id);
        if (!room) {
          socket.emit('hint_result', { error: 'Room not found' });
          return;
        }
        if (room.state !== 'playing') {
          socket.emit('hint_result', { error: 'Game is not in progress' });
          return;
        }
        if (!room.game) {
          socket.emit('hint_result', { error: 'No game in progress' });
          return;
        }

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) {
          socket.emit('hint_result', { error: 'Player not found' });
          return;
        }

        const board = room.mode === 'coop' ? room.game.boards.shared : room.game.boards[player.id];
        if (!board) {
          socket.emit('hint_result', { error: 'Board not found' });
          return;
        }

        const { solution } = room.game;
        const hintCell = getHintCell(board, solution);
        if (!hintCell) {
          socket.emit('hint_result', { error: 'No empty cells remaining' });
          return;
        }

        if (player.credits === undefined) player.credits = 0;
        player.credits -= 1;

        socket.emit('hint_result', {
          row: hintCell.row,
          col: hintCell.col,
          value: hintCell.value,
          credits: player.credits,
        });

        io.to(room.id).emit('room_updated', getRoomState(room));
      } catch (err) {
        socket.emit('hint_result', { error: err.message || 'Hint request failed' });
      }
    });

    socket.on('request_rematch', () => {
      try {
        const room = roomManager.getPlayerRoom(socket.id);
        if (!room) return;

        roomManager.resetRoom(room.id);
        io.to(room.id).emit('room_updated', getRoomState(room));
      } catch (_) {
        // fail silently
      }
    });

    socket.on('fetch_rooms', () => {
      try {
        const available = [];
        for (const [, room] of roomManager.rooms) {
          if (room.state === 'waiting') {
            available.push({
              id: room.id,
              creator: room.creator,
              mode: room.mode,
              difficulty: room.difficulty,
              playerCount: room.players.length,
              maxPlayers: MAX_PLAYERS,
            });
          }
        }
        socket.emit('available_rooms', available);
      } catch (_) {
        socket.emit('available_rooms', []);
      }
    });

    socket.on('start_singleplayer', ({ difficulty } = {}) => {
      try {
        if (!difficulty) {
          socket.emit('singleplayer_error', { message: 'Difficulty is required' });
          return;
        }

        const { puzzle, solution } = generatePuzzle(difficulty);

        socket.emit('singleplayer_started', {
          puzzle,
          solution,
          startTime: Date.now(),
          difficulty,
        });
      } catch (err) {
        socket.emit('singleplayer_error', { message: err.message || 'Failed to start singleplayer game' });
      }
    });

    socket.on('sync_request', () => {
      try {
        const room = roomManager.getPlayerRoom(socket.id);
        if (!room) {
          socket.emit('sync_response', { error: 'Not in a room' });
          return;
        }
        socket.emit('sync_response', getRoomState(room));
      } catch (_) {
        socket.emit('sync_response', { error: 'Sync failed' });
      }
    });

    socket.on('disconnect', () => {
      try {
        const room = roomManager.getPlayerRoom(socket.id);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        player.connected = false;
        roomManager.playerRooms.delete(socket.id);

        const timer = setTimeout(() => {
          disconnectedPlayers.delete(socket.id);
          const roomRef = roomManager.rooms.get(room.id);
          if (!roomRef) return;
          const playerRef = roomRef.players.find((p) => p.id === socket.id);
          if (playerRef && !playerRef.connected) {
            const idx = roomRef.players.indexOf(playerRef);
            if (idx !== -1) {
              roomRef.players.splice(idx, 1);
            }
            io.to(roomRef.id).emit('player_left', {
              playerId: playerRef.id,
              playerName: playerRef.name,
            });
            if (roomRef.players.length === 0) {
              roomManager.rooms.delete(roomRef.id);
            } else {
              io.to(roomRef.id).emit('room_updated', getRoomState(roomRef));
            }
          }
        }, RECONNECT_WINDOW);

        disconnectedPlayers.set(socket.id, {
          roomId: room.id,
          playerId: player.id,
          playerName: player.name,
          timer,
        });

        io.to(room.id).emit('player_disconnected', {
          playerId: player.id,
          playerName: player.name,
        });
        io.to(room.id).emit('room_updated', getRoomState(room));
      } catch (_) {
        // fail silently
      }
    });

    socket.on('reconnect', ({ previousSocketId } = {}) => {
      try {
        if (!previousSocketId) {
          socket.emit('reconnect_error', { message: 'Missing previous session ID' });
          return;
        }

        const reconnectData = disconnectedPlayers.get(previousSocketId);
        if (!reconnectData) {
          socket.emit('reconnect_error', { message: 'Session expired or not found' });
          return;
        }

        clearTimeout(reconnectData.timer);
        disconnectedPlayers.delete(previousSocketId);

        const room = roomManager.rooms.get(reconnectData.roomId);
        if (!room) {
          socket.emit('reconnect_error', { message: 'Room no longer exists' });
          return;
        }

        const player = room.players.find((p) => p.id === reconnectData.playerId);
        if (!player) {
          socket.emit('reconnect_error', { message: 'Player not found in room' });
          return;
        }

        const oldSocketId = player.id;
        player.id = socket.id;
        player.connected = true;

        if (room.game && room.game.boards && room.mode === 'battle') {
          if (room.game.boards[oldSocketId]) {
            room.game.boards[socket.id] = room.game.boards[oldSocketId];
            delete room.game.boards[oldSocketId];
          }
        }

        roomManager.playerRooms.set(socket.id, room.id);
        socket.join(room.id);

        socket.emit('reconnected', getRoomState(room));
        io.to(room.id).emit('player_reconnected', {
          playerId: socket.id,
          playerName: player.name,
        });
        io.to(room.id).emit('room_updated', getRoomState(room));
      } catch (_) {
        socket.emit('reconnect_error', { message: 'Reconnection failed' });
      }
    });
  });
}

module.exports = { setupSocketHandlers };
