import { useState, useCallback, useEffect } from 'react';
import useSocket from './hooks/useSocket';
import useGame from './hooks/useGame';
import useTimer from './hooks/useTimer';
import Lobby from './components/Lobby';
import RoomLobby from './components/RoomLobby';
import GameBoard from './components/GameBoard';
import Results from './components/Results';
import ThemeToggle from './components/ThemeToggle';
import SinglePlayerGame from './components/SinglePlayerGame';
import Scoreboard from './components/Scoreboard';
import Achievements from './components/Achievements';
import { checkAchievements } from './utils/achievements';
import useScoreboard from './hooks/useScoreboard';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('sudoku-theme');
    return stored === 'dark' || stored === 'light' ? stored : 'dark';
  });

  const [screen, setScreen] = useState('lobby');
  const [playerName, setPlayerName] = useState('');
  const [spDifficulty, setSpDifficulty] = useState('medium');
  const [spTimer, setSpTimer] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);

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

  const { stats, allRecords, addRecord } = useScoreboard();

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

  const handleStartSingleplayer = useCallback((name, difficulty, timerSeconds) => {
    setPlayerName(name);
    setSpDifficulty(difficulty);
    setSpTimer(timerSeconds);
    setScreen('singleplayer');
  }, []);

  const handleSingleplayerComplete = useCallback((record) => {
    addRecord(record);
    const newAch = checkAchievements(
      { ...stats, totalCompleted: stats.totalCompleted + (record.completed ? 1 : 0), totalGames: stats.totalGames + 1 },
      [record, ...allRecords]
    );
    setNewAchievements(newAch);
    setScreen('lobby');
  }, [addRecord, stats, allRecords]);

  const handleOpenScoreboard = useCallback(() => setScreen('scoreboard'), []);

  const connectionBanner = !connected ? (
    <div className="connection-banner">Connecting to server...</div>
  ) : null;

  const achievementsPopup = newAchievements.length > 0 ? (
    <Achievements
      newAchievements={newAchievements}
      onDismiss={() => setNewAchievements([])}
    />
  ) : null;

  const playerId = socket?.id || '';

  return (
    <div className="app">
      {connectionBanner}
      {achievementsPopup}
      <header className="app-header">
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>

      <main className="app-main">
        {screen === 'lobby' && (
          <Lobby
            socket={socket}
            connected={connected}
            onEnterRoom={handleEnterRoom}
            onStartSingleplayer={handleStartSingleplayer}
            onOpenScoreboard={handleOpenScoreboard}
          />
        )}
        {screen === 'singleplayer' && (
          <SinglePlayerGame
            socket={socket}
            playerName={playerName}
            difficulty={spDifficulty}
            countdownSeconds={spTimer}
            onComplete={handleSingleplayerComplete}
            onBack={() => setScreen('lobby')}
          />
        )}
        {screen === 'scoreboard' && (
          <Scoreboard onBack={() => setScreen('lobby')} />
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
