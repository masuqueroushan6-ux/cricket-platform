'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      // Don't disconnect global socket on unmount
    };
  }, []);

  const joinMatch = useCallback((matchId: string) => {
    getSocket().emit('join:match', matchId);
  }, []);

  const leaveMatch = useCallback((matchId: string) => {
    getSocket().emit('leave:match', matchId);
  }, []);

  const onMatchUpdate = useCallback((callback: (data: unknown) => void) => {
    const socket = getSocket();
    socket.on('match:update', callback);
    return () => socket.off('match:update', callback);
  }, []);

  const onBall = useCallback((callback: (data: unknown) => void) => {
    const socket = getSocket();
    socket.on('match:ball', callback);
    return () => socket.off('match:ball', callback);
  }, []);

  return { joinMatch, leaveMatch, onMatchUpdate, onBall };
}
