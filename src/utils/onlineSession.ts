const PLAYER_ID_KEY = 'mr-white-player-id';
const ROOM_SESSION_KEY = 'mr-white-room-session';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Id estable por pestaña/navegador para reconectar a la sala. */
export function getOrCreatePlayerId(): string {
  try {
    const existing = sessionStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    sessionStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

export interface RoomSession {
  code: string;
  playerId: string;
  name: string;
}

export function saveRoomSession(session: RoomSession): void {
  try {
    sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function loadRoomSession(): RoomSession | null {
  try {
    const raw = sessionStorage.getItem(ROOM_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as RoomSession).code !== 'string' ||
      typeof (parsed as RoomSession).playerId !== 'string' ||
      typeof (parsed as RoomSession).name !== 'string'
    ) {
      return null;
    }
    return parsed as RoomSession;
  } catch {
    return null;
  }
}

export function clearRoomSession(): void {
  try {
    sessionStorage.removeItem(ROOM_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function resolveWsUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'ws://localhost:8080';
    }
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}`;
  }
  return 'ws://localhost:8080';
}
