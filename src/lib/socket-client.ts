'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<{
    message: string;
    courtNumber?: number;
    matchCode?: string;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

    if (!globalSocket) {
      globalSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
      });
    }

    const socket = globalSocket;
    socketRef.current = socket;

    function onConnect() {
      setIsConnected(true);
      measureLatency();
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onAnnouncement(data: any) {
      setAnnouncement(data);
      // Auto-hide announcement banner after 10 seconds
      setTimeout(() => {
        setAnnouncement((curr) => (curr?.message === data.message ? null : curr));
      }, 10000);
    }

    function measureLatency() {
      const start = Date.now();
      socket.emit('ping_check', () => {
        setLatency(Date.now() - start);
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('announcement', onAnnouncement);

    if (socket.connected) {
      setIsConnected(true);
      measureLatency();
    }

    // Ping interval to monitor latency every 15s
    const interval = setInterval(() => {
      if (socket.connected) {
        measureLatency();
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('announcement', onAnnouncement);
    };
  }, []);

  const subscribeToScore = useCallback((callback: (data: any) => void) => {
    if (!globalSocket) return () => {};
    globalSocket.on('score_update', callback);
    return () => {
      globalSocket?.off('score_update', callback);
    };
  }, []);

  const subscribeToMatchStatus = useCallback((callback: (data: any) => void) => {
    if (!globalSocket) return () => {};
    globalSocket.on('match_status_change', callback);
    return () => {
      globalSocket?.off('match_status_change', callback);
    };
  }, []);

  const subscribeToSchedule = useCallback((callback: (data: any) => void) => {
    if (!globalSocket) return () => {};
    globalSocket.on('schedule_update', callback);
    return () => {
      globalSocket?.off('schedule_update', callback);
    };
  }, []);

  const clearAnnouncement = useCallback(() => {
    setAnnouncement(null);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    latency,
    announcement,
    clearAnnouncement,
    subscribeToScore,
    subscribeToMatchStatus,
    subscribeToSchedule,
  };
}
