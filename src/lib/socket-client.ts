'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

function resolveSocketUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SOCKET_URL || '';
  }

  const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      const isLocalTarget = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      const isBrowserLocal =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      // Never connect a production domain browser to a baked localhost env URL
      if (!isLocalTarget || isBrowserLocal) {
        return configured;
      }
    } catch {
      // Ignore malformed configured URL and fall back to same-origin
    }
  }

  return window.location.origin;
}

function getOrCreateSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (!globalSocket) {
    globalSocket = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });
  }
  return globalSocket;
}

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
    const socket = getOrCreateSocket();
    if (!socket) return;
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
      socket?.emit('ping_check', () => {
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
    const socket = getOrCreateSocket();
    if (!socket) return () => {};
    socket.on('score_update', callback);
    return () => {
      socket.off('score_update', callback);
    };
  }, []);

  const subscribeToMatchStatus = useCallback((callback: (data: any) => void) => {
    const socket = getOrCreateSocket();
    if (!socket) return () => {};
    socket.on('match_status_change', callback);
    return () => {
      socket.off('match_status_change', callback);
    };
  }, []);

  const subscribeToSchedule = useCallback((callback: (data: any) => void) => {
    const socket = getOrCreateSocket();
    if (!socket) return () => {};
    socket.on('schedule_update', callback);
    return () => {
      socket.off('schedule_update', callback);
    };
  }, []);

  const subscribeToReconnect = useCallback((callback: () => void) => {
    const socket = getOrCreateSocket();
    if (!socket) return () => {};
    socket.io.on('reconnect', callback);
    return () => {
      socket.io.off('reconnect', callback);
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
    subscribeToReconnect,
  };
}

