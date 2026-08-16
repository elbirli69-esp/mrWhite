import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, PrivateRolePayload, PublicRoomState, ServerMessage } from '../../shared/protocol';
import {
  clearRoomSession,
  getOrCreatePlayerId,
  loadRoomSession,
  resolveWsUrl,
  saveRoomSession,
} from '../utils/onlineSession';

export type OnlineConnection = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface UseOnlineRoomOptions {
  enabled: boolean;
}

export function useOnlineRoom({ enabled }: UseOnlineRoomOptions) {
  const [connection, setConnection] = useState<OnlineConnection>('idle');
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [privateRole, setPrivateRole] = useState<PrivateRolePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId] = useState(() => getOrCreatePlayerId());
  const [joinedCode, setJoinedCode] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<ClientMessage | null>(null);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return;
    }
    pendingRef.current = message;
  }, []);

  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'error':
        setError(message.message);
        break;
      case 'joined':
        setJoinedCode(message.code);
        setError(null);
        break;
      case 'roomState':
        setRoomState(message.state);
        setJoinedCode(message.state.code);
        break;
      case 'privateRole':
        setPrivateRole(message.payload);
        break;
      default:
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    intentionalCloseRef.current = false;
    setConnection('connecting');
    const url = resolveWsUrl();
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnection('connected');
      reconnectAttemptRef.current = 0;
      const pending = pendingRef.current;
      if (pending) {
        socket.send(JSON.stringify(pending));
        pendingRef.current = null;
        return;
      }
      const session = loadRoomSession();
      if (session && session.playerId === playerId && session.code) {
        socket.send(
          JSON.stringify({
            type: 'reconnect',
            code: session.code,
            playerId: session.playerId,
          } satisfies ClientMessage),
        );
      }
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as ServerMessage;
        handleServerMessage(parsed);
      } catch {
        setError('Respuesta inválida del servidor.');
      }
    };

    socket.onerror = () => {
      setError('No se pudo conectar al servidor de salas.');
    };

    socket.onclose = () => {
      socketRef.current = null;
      setConnection('disconnected');
      if (intentionalCloseRef.current || !enabled) return;
      const attempt = reconnectAttemptRef.current;
      reconnectAttemptRef.current = attempt + 1;
      const delay = Math.min(8000, 500 * 2 ** attempt);
      window.setTimeout(() => {
        if (!intentionalCloseRef.current && enabled) connect();
      }, delay);
    };
  }, [enabled, handleServerMessage, playerId]);

  useEffect(() => {
    if (!enabled) {
      intentionalCloseRef.current = true;
      socketRef.current?.close();
      socketRef.current = null;
      setConnection('idle');
      return;
    }
    connect();
    return () => {
      intentionalCloseRef.current = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, connect]);

  const createRoom = useCallback(
    (name: string, mrWhiteCount = 1, farsanteCount = 1) => {
      setError(null);
      setPrivateRole(null);
      const msg: ClientMessage = {
        type: 'createRoom',
        name,
        playerId,
        mrWhiteCount,
        farsanteCount,
      };
      pendingRef.current = msg;
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(msg));
        pendingRef.current = null;
      } else {
        connect();
      }
    },
    [connect, playerId],
  );

  const joinRoom = useCallback(
    (code: string, name: string) => {
      setError(null);
      setPrivateRole(null);
      const normalized = code.trim().toUpperCase();
      const msg: ClientMessage = {
        type: 'joinRoom',
        code: normalized,
        name,
        playerId,
      };
      pendingRef.current = msg;
      saveRoomSession({ code: normalized, playerId, name });
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(msg));
        pendingRef.current = null;
      } else {
        connect();
      }
    },
    [connect, playerId],
  );

  useEffect(() => {
    if (!joinedCode || !roomState) return;
    const me = roomState.seats.find((s) => s.playerId === playerId);
    saveRoomSession({
      code: joinedCode,
      playerId,
      name: me?.name ?? loadRoomSession()?.name ?? '',
    });
  }, [joinedCode, playerId, roomState]);

  const setReady = useCallback(
    (ready: boolean) => send({ type: 'setReady', ready }),
    [send],
  );

  const updateConfig = useCallback(
    (config: {
      mrWhiteCount: number;
      farsanteCount: number;
      mrWhiteHasHints: boolean;
      adultMode: boolean;
    }) =>
      send({
        type: 'updateConfig',
        mrWhiteCount: config.mrWhiteCount,
        farsanteCount: config.farsanteCount,
        mrWhiteHasHints: config.mrWhiteHasHints,
        adultMode: config.adultMode,
      }),
    [send],
  );

  const startGame = useCallback(() => send({ type: 'startGame' }), [send]);
  const ackReveal = useCallback(() => send({ type: 'ackReveal' }), [send]);
  const beginPlay = useCallback(() => send({ type: 'beginPlay' }), [send]);
  const eliminate = useCallback(
    (targetPlayerId: string) => send({ type: 'eliminate', targetPlayerId }),
    [send],
  );
  const dismissElimination = useCallback(
    () => send({ type: 'dismissElimination' }),
    [send],
  );
  const newGame = useCallback(() => {
    setPrivateRole(null);
    send({ type: 'newGame' });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'leaveRoom' });
    clearRoomSession();
    setRoomState(null);
    setPrivateRole(null);
    setJoinedCode(null);
    setError(null);
  }, [send]);

  const reset = useCallback(() => {
    intentionalCloseRef.current = true;
    send({ type: 'leaveRoom' });
    clearRoomSession();
    setRoomState(null);
    setPrivateRole(null);
    setJoinedCode(null);
    setError(null);
    pendingRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    setConnection('idle');
  }, [send]);

  const isHost = roomState?.hostPlayerId === playerId;

  return {
    connection,
    roomState,
    privateRole,
    error,
    playerId,
    joinedCode,
    isHost,
    clearError,
    createRoom,
    joinRoom,
    setReady,
    updateConfig,
    startGame,
    ackReveal,
    beginPlay,
    eliminate,
    dismissElimination,
    newGame,
    leaveRoom,
    reset,
  };
}

export type UseOnlineRoomReturn = ReturnType<typeof useOnlineRoom>;
