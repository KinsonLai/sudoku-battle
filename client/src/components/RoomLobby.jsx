import { useState } from 'react';

export default function RoomLobby({ room, socket, onGameStart }) {
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const isCreator = room && socket && room.creatorId === socket.id;
  const playerCount = room?.players?.length || 0;
  const canStart = isCreator && playerCount >= 2;

  const playerNames = {
    P1: '#4a90d9',
    P2: '#e67e22',
    P3: '#27ae60',
    P4: '#9b59b6',
  };

  const handleCopyRoomId = () => {
    if (!room?.id) return;
    navigator.clipboard.writeText(room.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStartGame = () => {
    if (!canStart) return;
    socket.emit('start_game');
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room');
    window.location.reload();
  };

  const handleAddNotification = (msg) => {
    setNotifications((prev) => [...prev, { id: Date.now(), msg }]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 3000);
  };

  return (
    <div className="roomlobby-container">
      <div className="roomlobby-card">
        <div className="roomlobby-header">
          <div className="roomlobby-id-section">
            <h2 className="roomlobby-id-label">Room</h2>
            <div className="roomlobby-id-display">
              <span className="roomlobby-id">{room?.id || '...'}</span>
              <button className="btn-copy" onClick={handleCopyRoomId}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="roomlobby-badges">
            <span className="badge badge-mode">
              {room?.mode === 'battle' ? 'Battle' : 'Cooperative'}
            </span>
            <span className="badge badge-difficulty">
              {room?.difficulty ? room.difficulty.charAt(0).toUpperCase() + room.difficulty.slice(1) : ''}
            </span>
          </div>
        </div>

        <div className="player-count">
          Players ({playerCount}/4)
        </div>

        <div className="player-list">
          {(!room?.players || room.players.length === 0) && (
            <div className="player-list-empty">Waiting for players...</div>
          )}
          {room?.players?.map((player, index) => (
            <div
              key={player.id}
              className={`player-item ${player.id === socket?.id ? 'is-self' : ''}`}
            >
              <div
                className="player-color-dot"
                style={{ backgroundColor: playerNames[`P${index + 1}`] || '#888' }}
              />
              <span className={`player-status-dot ${player.connected !== false ? 'connected' : 'disconnected'}`} />
              <span className="player-name">{player.name}</span>
              {player.id === room.creatorId && (
                <span className="player-creator-badge">Host</span>
              )}
              {player.id === socket?.id && (
                <span className="player-self-badge">You</span>
              )}
            </div>
          ))}
        </div>

        <div className="roomlobby-actions">
          {isCreator && (
            <button
              className="btn btn-primary btn-full"
              disabled={!canStart}
              onClick={handleStartGame}
              title={!canStart ? 'Need at least 2 players to start' : 'Start the game'}
            >
              {canStart ? 'Start Game' : `Waiting for players (${playerCount}/2)`}
            </button>
          )}
          {!isCreator && (
            <div className="waiting-message">
              Waiting for the host to start the game...
            </div>
          )}
          <button className="btn btn-secondary btn-full" onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </div>
      </div>

      <div className="notifications-container">
        {notifications.map((n) => (
          <div key={n.id} className="notification-toast">
            {n.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
