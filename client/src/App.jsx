import { useState, useCallback, useEffect } from 'react';
import useSocket from './hooks/useSocket';
import useGame from './hooks/useGame';
import useTimer from './hooks/useTimer';
import Lobby from './components/Lobby';
import RoomLobby from './components/RoomLobby';
import GameBoard from './components/GameBoard';
import Results from './components/Results';
import ThemeToggle from './components/ThemeToggle';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('sudoku-theme');
    return stored === 'dark' || stored === 'light' ? stored : 'dark';
  });

  const [screen, setScreen] = useState('lobby');
  const [playerName, setPlayerName] = useState('');

  const { socket, connected } = useSocket();
  const {
    room,
    puzzle,
    myBoard,
    error: gameError,
    gameResult,
    gameStarted,
    cellFlash,
    makeMove,
    resetGame,
  } = useGame(socket);

  const { formattedTime, elapsed } = useTimer(gameStarted);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sudoku-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!socket) return;

    const onGameStarted = (data) => {
      setScreen('game');
    };

    const onGameOver = (data) => {
      setScreen('results');
    };

    socket.on('game_started', onGameStarted);
    socket.on('game_over', onGameOver);

    return () => {
      socket.off('game_started', onGameStarted);
      socket.off('game_over', onGameOver);
    };
  }, [socket]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleEnterRoom = useCallback((data) => {
    setPlayerName(data.playerName || '');
    setScreen('room');
  }, []);

  const handleGameStart = useCallback(() => {
    if (socket) {
      socket.emit('start_game');
    }
  }, [socket]);

  const handleRematch = useCallback(() => {
    if (socket) {
      socket.emit('request_rematch');
      resetGame();
    }
  }, [socket, resetGame]);

  const handleLeave = useCallback(() => {
    if (socket) {
      socket.emit('leave_room');
    }
    resetGame();
    setScreen('lobby');
  }, [socket, resetGame]);

  const connectionBanner = !connected ? (
    <div className="connection-banner">Connecting to server...</div>
  ) : null;

  const playerId = socket?.id || '';

  return (
    <div className="app">
      {connectionBanner}
      <header className="app-header">
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>

      <main className="app-main">
        {screen === 'lobby' && (
          <Lobby socket={socket} onEnterRoom={handleEnterRoom} />
        )}
        {screen === 'room' && room && (
          <RoomLobby
            room={room}
            socket={socket}
            onGameStart={handleGameStart}
          />
        )}
        {screen === 'game' && (
          <GameBoard
            puzzle={puzzle}
            board={myBoard}
            room={room}
            socket={socket}
            onGameOver={handleLeave}
            playerId={playerId}
            mode={room?.mode || 'battle'}
            formattedTime={formattedTime}
            elapsed={elapsed}
          />
        )}
        {screen === 'results' && (
          <Results
            result={gameResult}
            playerName={playerName}
            mode={room?.mode || 'battle'}
            onRematch={handleRematch}
            onLeave={handleLeave}
          />
        )}
      </main>
    </div>
  );
}
