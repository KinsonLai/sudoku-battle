import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    const previousSocketId = sessionStorage.getItem('previousSocketId');

    socket.on('connect', () => {
      setConnected(true);
      if (previousSocketId) {
        socket.emit('reconnect', { previousSocketId });
        sessionStorage.removeItem('previousSocketId');
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      if (socket.id) {
        sessionStorage.setItem('previousSocketId', socket.id);
      }
    });

    socket.on('reconnect_success', () => {
      sessionStorage.removeItem('previousSocketId');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_success');
    };
  }, []);

  const joinRoom = useCallback((roomId, name) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const onJoined = (data) => {
        socket.off('room_joined', onJoined);
        socket.off('join_error', onError);
        resolve(data);
      };

      const onError = (data) => {
        socket.off('room_joined', onJoined);
        socket.off('join_error', onError);
        reject(new Error(data.message || 'Failed to join room'));
      };

      socket.on('room_joined', onJoined);
      socket.on('join_error', onError);
      socket.emit('join_room', { name, roomId });
    });
  }, []);

  const createRoom = useCallback((name, mode, difficulty) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const onCreated = (data) => {
        socket.off('room_created', onCreated);
        socket.off('create_error', onError);
        resolve(data);
      };

      const onError = (data) => {
        socket.off('room_created', onCreated);
        socket.off('create_error', onError);
        reject(new Error(data.message || 'Failed to create room'));
      };

      socket.on('room_created', onCreated);
      socket.on('create_error', onError);
      socket.emit('create_room', { name, mode, difficulty });
    });
  }, []);

  return {
    socket: socketRef.current,
    connected,
    joinRoom,
    createRoom,
  };
}
