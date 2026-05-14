import { useState, useEffect, useCallback } from 'react';

export default function useGame(socket) {
  const [room, setRoom] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [myBoard, setMyBoard] = useState(null);
  const [error, setError] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [cellFlash, setCellFlash] = useState({});

  useEffect(() => {
    if (!socket) return;

    const onRoomCreated = (data) => {
      setRoom(data);
      setError(null);
    };

    const onRoomJoined = (data) => {
      setRoom(data);
      setError(null);
    };

    const onRoomUpdated = (data) => {
      setRoom(data);
    };

    const onGameStarted = (data) => {
      setPuzzle(data.puzzle);
      setMyBoard(data.board || data.puzzle.map((row) => [...row]));
      setGameStarted(true);
      setError(null);
    };

    const onMoveResult = (data) => {
      const { row, col, valid, value, erased } = data;
      setMyBoard((prev) => {
        if (!prev) return prev;
        const updated = prev.map((r) => [...r]);
        updated[row][col] = value;
        return updated;
      });

      setCellFlash((prev) => ({
        ...prev,
        [`${row}-${col}`]: valid ? 'correct' : 'invalid',
      }));

      setTimeout(() => {
        setCellFlash((prev) => {
          const next = { ...prev };
          delete next[`${row}-${col}`];
          return next;
        });
      }, 400);
    };

    const onGameOver = (data) => {
      setGameResult(data);
    };

    const onPlayerDisconnected = (data) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === data.playerId ? { ...p, connected: false } : p
          ),
        };
      });
    };

    const onPlayerReconnected = (data) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === data.playerId ? { ...p, connected: true } : p
          ),
        };
      });
    };

    const onPlayerLeft = (data) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== data.playerId),
        };
      });
    };

    const onJoinError = (data) => {
      setError(data.message || 'Failed to join room');
    };

    const onCreateError = (data) => {
      setError(data.message || 'Failed to create room');
    };

    const onStartError = (data) => {
      setError(data.message || 'Failed to start game');
    };

    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_updated', onRoomUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('move_result', onMoveResult);
    socket.on('game_over', onGameOver);
    socket.on('player_disconnected', onPlayerDisconnected);
    socket.on('player_reconnected', onPlayerReconnected);
    socket.on('player_left', onPlayerLeft);
    socket.on('join_error', onJoinError);
    socket.on('create_error', onCreateError);
    socket.on('start_error', onStartError);

    return () => {
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_updated', onRoomUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('move_result', onMoveResult);
      socket.off('game_over', onGameOver);
      socket.off('player_disconnected', onPlayerDisconnected);
      socket.off('player_reconnected', onPlayerReconnected);
      socket.off('player_left', onPlayerLeft);
      socket.off('join_error', onJoinError);
      socket.off('create_error', onCreateError);
      socket.off('start_error', onStartError);
    };
  }, [socket]);

  const makeMove = useCallback(
    (row, col, value) => {
      if (!socket) return;
      socket.emit('make_move', { row, col, value });
    },
    [socket]
  );

  const resetGame = useCallback(() => {
    setPuzzle(null);
    setMyBoard(null);
    setGameResult(null);
    setGameStarted(false);
    setCellFlash({});
    setError(null);
  }, []);

  return {
    room,
    setRoom,
    puzzle,
    myBoard,
    setMyBoard,
    error,
    setError,
    gameResult,
    gameStarted,
    setGameStarted,
    cellFlash,
    makeMove,
    resetGame,
  };
}
