import { useState, useEffect, useCallback } from 'react';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const MODES = [
  { value: 'battle', label: 'Battle Mode' },
  { value: 'coop', label: 'Cooperative Mode' },
];

export default function Lobby({ socket, onEnterRoom }) {
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState('battle');
  const [difficulty, setDifficulty] = useState('medium');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [error, setError] = useState('');

  const validRoomId = roomId.trim().length >= 3 && roomId.trim().length <= 10;
  const validName = name.trim().length >= 1 && name.trim().length <= 20;

  const handleCreateRoom = useCallback(async () => {
    if (!validName) return;
    setCreating(true);
    setError('');
    try {
      const data = await new Promise((resolve, reject) => {
        const onCreated = (d) => {
          socket.off('room_created', onCreated);
          socket.off('create_error', onError);
          resolve(d);
        };
        const onError = (d) => {
          socket.off('room_created', onCreated);
          socket.off('create_error', onError);
          reject(new Error(d.message || 'Failed to create room'));
        };
        socket.on('room_created', onCreated);
        socket.on('create_error', onError);
        socket.emit('create_room', { name: name.trim(), mode, difficulty });
      });
      onEnterRoom({ ...data, playerName: name.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }, [name, mode, difficulty, validName, socket, onEnterRoom]);

  const handleJoinRoom = useCallback(async () => {
    if (!validName || !validRoomId) return;
    setJoining(true);
    setError('');
    try {
      const data = await new Promise((resolve, reject) => {
        const onJoined = (d) => {
          socket.off('room_joined', onJoined);
          socket.off('join_error', onError);
          resolve(d);
        };
        const onError = (d) => {
          socket.off('room_joined', onJoined);
          socket.off('join_error', onError);
          reject(new Error(d.message || 'Failed to join room'));
        };
        socket.on('room_joined', onJoined);
        socket.on('join_error', onError);
        socket.emit('join_room', { name: name.trim(), roomId: roomId.trim() });
      });
      onEnterRoom({ ...data, playerName: name.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }, [name, roomId, validName, validRoomId, socket, onEnterRoom]);

  const fetchRooms = useCallback(() => {
    socket.emit('fetch_rooms');
  }, [socket]);

  useEffect(() => {
    const onRoomsList = (data) => {
      setAvailableRooms(data || []);
    };
    socket.on('available_rooms', onRoomsList);
    fetchRooms();
    return () => {
      socket.off('available_rooms', onRoomsList);
    };
  }, [socket, fetchRooms]);

  const handleRoomSelect = (id) => {
    setRoomId(id);
    setTab('join');
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1 className="lobby-title">Sudoku Battle</h1>
        <p className="lobby-subtitle">Challenge friends or solve together</p>

        <div className="tab-bar">
          <button
            className={`tab-button ${tab === 'create' ? 'active' : ''}`}
            onClick={() => { setTab('create'); setError(''); }}
          >
            Create Room
          </button>
          <button
            className={`tab-button ${tab === 'join' ? 'active' : ''}`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Join Room
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="tab-content">
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>

          {tab === 'create' && (
            <>
              <div className="form-group">
                <label className="form-label">Game Mode</label>
                <div className="mode-selector">
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      className={`mode-button ${mode === m.value ? 'active' : ''}`}
                      onClick={() => setMode(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <div className="difficulty-selector">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      className={`difficulty-button ${difficulty === d ? 'active' : ''}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary btn-full"
                disabled={!validName || creating}
                onClick={handleCreateRoom}
              >
                {creating ? 'Creating...' : 'Create Room'}
              </button>
            </>
          )}

          {tab === 'join' && (
            <>
              <div className="form-group">
                <label className="form-label">Room ID</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Enter room ID..."
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={10}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                disabled={!validName || !validRoomId || joining}
                onClick={handleJoinRoom}
              >
                {joining ? 'Joining...' : 'Join Room'}
              </button>

              <div className="available-rooms">
                <div className="available-rooms-header">
                  <h3>Available Rooms</h3>
                  <button className="btn-refresh" onClick={fetchRooms} title="Refresh">
                    &#x21bb;
                  </button>
                </div>
                {availableRooms.length === 0 && (
                  <p className="no-rooms">No rooms available. Create one!</p>
                )}
                {availableRooms.map((room) => (
                  <button
                    key={room.id}
                    className="room-list-item"
                    onClick={() => handleRoomSelect(room.id)}
                  >
                    <div className="room-list-info">
                      <span className="room-list-id">{room.id}</span>
                      <span className="room-list-creator">{room.creator || room.players?.[0]?.name || '???'}</span>
                    </div>
                    <div className="room-list-meta">
                      <span className="badge badge-mode">{room.mode}</span>
                      <span className="badge badge-difficulty">{room.difficulty}</span>
                      <span className="badge badge-players">
                        {room.playerCount || room.players?.length || 1}/4
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
