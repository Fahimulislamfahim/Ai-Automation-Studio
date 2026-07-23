'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/events';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Hook to access the Socket.IO client and subscribe to events
 */
export function useSocket() {
  const socketRef = useRef<SocketType | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Check initial state
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const on = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E]
    ) => {
      socketRef.current?.on(event, handler as never);
      return () => {
        socketRef.current?.off(event, handler as never);
      };
    },
    []
  );

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      socketRef.current?.emit(event, ...args);
    },
    []
  );

  return { socket: socketRef.current, connected, on, emit };
}
