import type { WebSocket } from 'ws';
import type { GameConfig, PlayerRole, SelectedWords } from '../../shared/game-types.js';
import {
  dealOnlineSeats,
  generateRoomCode,
  pickRandomWordPair,
  pickStartingPlayerIdString,
} from '../../shared/game-logic.js';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../shared/game-types.js';
import { validateConfig } from '../../shared/validation.js';
import type {
  ClientMessage,
  PrivateRolePayload,
  PublicRoomState,
  PublicSeat,
  RoomPhase,
  ServerMessage,
} from '../../shared/protocol.js';

const EMPTY_ROOM_TTL_MS = 45 * 60 * 1000;

interface SeatInternal {
  playerId: string;
  name: string;
  ready: boolean;
  connected: boolean;
  socket: WebSocket | null;
  role: PlayerRole | null;
  word: string | null;
  hint: string | null;
  eliminatedRound: number | null;
  revealAcked: boolean;
}

export class Room {
  readonly code: string;
  hostPlayerId: string;
  phase: RoomPhase = 'lobby';
  mrWhiteCount: number;
  farsanteCount: number;
  mrWhiteHasHints: boolean;
  adultMode: boolean;
  seats = new Map<string, SeatInternal>();
  words: SelectedWords | null = null;
  currentRound = 1;
  startingPlayerId: string | null = null;
  previousStartingPlayerId: string | null = null;
  previousMrWhitePlayerIds: string[] = [];
  lastElimination: PublicRoomState['lastElimination'] = null;
  emptySince: number | null = null;

  constructor(
    code: string,
    hostPlayerId: string,
    mrWhiteCount: number,
    farsanteCount: number,
    mrWhiteHasHints = false,
    adultMode = false,
  ) {
    this.code = code;
    this.hostPlayerId = hostPlayerId;
    this.mrWhiteCount = mrWhiteCount;
    this.farsanteCount = farsanteCount;
    this.mrWhiteHasHints = mrWhiteHasHints;
    this.adultMode = adultMode;
  }

  get connectedCount(): number {
    let n = 0;
    for (const seat of this.seats.values()) {
      if (seat.connected) n += 1;
    }
    return n;
  }

  touchOccupancy(): void {
    this.emptySince = this.connectedCount === 0 ? Date.now() : null;
  }

  isExpired(now = Date.now()): boolean {
    return this.emptySince !== null && now - this.emptySince >= EMPTY_ROOM_TTL_MS;
  }

  addSeat(playerId: string, name: string, socket: WebSocket, asHost: boolean): void {
    this.seats.set(playerId, {
      playerId,
      name: name.trim(),
      ready: false,
      connected: true,
      socket,
      role: null,
      word: null,
      hint: null,
      eliminatedRound: null,
      revealAcked: false,
    });
    if (asHost) this.hostPlayerId = playerId;
    this.touchOccupancy();
  }

  reconnect(playerId: string, socket: WebSocket): boolean {
    const seat = this.seats.get(playerId);
    if (!seat) return false;
    if (seat.socket && seat.socket !== socket && seat.socket.readyState === 1) {
      try {
        seat.socket.close(4000, 'Replaced by reconnect');
      } catch {
        // ignore
      }
    }
    seat.socket = socket;
    seat.connected = true;
    this.touchOccupancy();
    return true;
  }

  disconnect(playerId: string, socket: WebSocket): void {
    const seat = this.seats.get(playerId);
    if (!seat || seat.socket !== socket) return;
    seat.connected = false;
    seat.socket = null;
    if (this.phase === 'lobby') {
      seat.ready = false;
    }
    if (playerId === this.hostPlayerId) {
      this.transferHost();
    }
    this.touchOccupancy();
  }

  transferHost(): void {
    const connected = [...this.seats.values()].filter((s) => s.connected);
    if (connected.length === 0) {
      this.hostPlayerId = '';
      return;
    }
    const next = connected.find((s) => s.playerId !== this.hostPlayerId) ?? connected[0]!;
    this.hostPlayerId = next.playerId;
  }

  removeSeat(playerId: string): void {
    this.seats.delete(playerId);
    if (playerId === this.hostPlayerId) this.transferHost();
    this.touchOccupancy();
  }

  configForValidation(playerCount: number): GameConfig {
    return {
      playerCount,
      mrWhiteCount: this.mrWhiteCount,
      farsanteCount: this.farsanteCount,
      mrWhiteHasHints: this.mrWhiteHasHints,
      adultMode: this.adultMode,
    };
  }

  private allMrWhiteOut(): boolean {
    const dealt = [...this.seats.values()].filter((s) => s.role !== null);
    if (dealt.length === 0) return false;
    const anyMrWhite = dealt.some((s) => s.role === 'mrWhite');
    if (!anyMrWhite) return false;
    return !dealt.some((s) => s.role === 'mrWhite' && s.eliminatedRound === null);
  }

  toPublicState(): PublicRoomState {
    const seats: PublicSeat[] = [...this.seats.values()].map((seat) => ({
      playerId: seat.playerId,
      name: seat.name,
      ready: seat.ready,
      connected: seat.connected,
      isHost: seat.playerId === this.hostPlayerId,
      eliminatedRound: seat.eliminatedRound,
      revealedRole:
        seat.eliminatedRound !== null || this.phase === 'ended' ? seat.role : null,
      revealAcked: seat.revealAcked,
    }));

    const starter = this.startingPlayerId
      ? this.seats.get(this.startingPlayerId)
      : undefined;

    const showWord = this.phase === 'ended' || this.allMrWhiteOut();

    return {
      code: this.code,
      phase: this.phase,
      hostPlayerId: this.hostPlayerId,
      config: {
        mrWhiteCount: this.mrWhiteCount,
        farsanteCount: this.farsanteCount,
        mrWhiteHasHints: this.mrWhiteHasHints,
        adultMode: this.adultMode,
      },
      seats,
      currentRound: this.currentRound,
      startingPlayerId: this.startingPlayerId,
      starterName: starter?.name ?? null,
      lastElimination: this.lastElimination,
      allMrWhiteOut: this.allMrWhiteOut(),
      revealedWord: showWord ? (this.words?.normal ?? null) : null,
      revealAckCount: [...this.seats.values()].filter((s) => s.revealAcked).length,
    };
  }

  privateRoleFor(playerId: string): PrivateRolePayload | null {
    const seat = this.seats.get(playerId);
    if (!seat || seat.role === null) return null;
    return { role: seat.role, word: seat.word, hint: seat.hint };
  }

  broadcast(message: ServerMessage, exceptPlayerId?: string): void {
    const raw = JSON.stringify(message);
    for (const seat of this.seats.values()) {
      if (exceptPlayerId && seat.playerId === exceptPlayerId) continue;
      if (seat.socket && seat.socket.readyState === 1) {
        seat.socket.send(raw);
      }
    }
  }

  sendTo(playerId: string, message: ServerMessage): void {
    const seat = this.seats.get(playerId);
    if (seat?.socket && seat.socket.readyState === 1) {
      seat.socket.send(JSON.stringify(message));
    }
  }

  syncAll(): void {
    const state = this.toPublicState();
    for (const seat of this.seats.values()) {
      if (!seat.socket || seat.socket.readyState !== 1) continue;
      seat.socket.send(JSON.stringify({ type: 'roomState', state } satisfies ServerMessage));
      const priv = this.privateRoleFor(seat.playerId);
      if (priv && (this.phase === 'reveal' || this.phase === 'play' || this.phase === 'ended')) {
        seat.socket.send(
          JSON.stringify({ type: 'privateRole', payload: priv } satisfies ServerMessage),
        );
      }
    }
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRoom = new Map<string, string>();

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  roomForPlayer(playerId: string): Room | undefined {
    const code = this.playerRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  sweepExpired(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.isExpired(now)) {
        for (const seat of room.seats.values()) {
          this.playerRoom.delete(seat.playerId);
        }
        this.rooms.delete(code);
      }
    }
  }

  createRoom(
    playerId: string,
    name: string,
    socket: WebSocket,
    mrWhiteCount = 1,
    farsanteCount = 1,
    mrWhiteHasHints = false,
    adultMode = false,
  ): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const room = new Room(
      code,
      playerId,
      mrWhiteCount,
      farsanteCount,
      mrWhiteHasHints,
      adultMode,
    );
    room.addSeat(playerId, name, socket, true);
    this.rooms.set(code, room);
    this.playerRoom.set(playerId, code);
    return room;
  }

  joinRoom(code: string, playerId: string, name: string, socket: WebSocket): Room {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('No existe una sala con ese código.');
    if (room.phase !== 'lobby') throw new Error('La partida ya ha empezado.');
    if (room.seats.size >= MAX_PLAYERS) throw new Error('La sala está llena.');
    if (room.seats.has(playerId)) {
      room.reconnect(playerId, socket);
      const seat = room.seats.get(playerId)!;
      if (name.trim()) seat.name = name.trim();
      this.playerRoom.set(playerId, room.code);
      return room;
    }
    room.addSeat(playerId, name, socket, false);
    this.playerRoom.set(playerId, room.code);
    return room;
  }

  reconnect(code: string, playerId: string, socket: WebSocket): Room {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('No existe una sala con ese código.');
    if (!room.reconnect(playerId, socket)) {
      throw new Error('No estás en esta sala. Únete de nuevo.');
    }
    this.playerRoom.set(playerId, room.code);
    return room;
  }

  unbindPlayer(playerId: string): void {
    this.playerRoom.delete(playerId);
  }

  leave(playerId: string, socket: WebSocket): Room | undefined {
    const room = this.roomForPlayer(playerId);
    if (!room) return undefined;
    room.disconnect(playerId, socket);
    if (room.phase === 'lobby' && !room.seats.get(playerId)?.connected) {
      room.removeSeat(playerId);
      this.playerRoom.delete(playerId);
    }
    if (room.seats.size === 0) {
      this.rooms.delete(room.code);
    }
    return room;
  }
}

export function handleClientMessage(
  manager: RoomManager,
  socket: WebSocket,
  playerIdRef: { current: string | null },
  raw: ClientMessage,
): void {
  const replyError = (message: string) => {
    socket.send(JSON.stringify({ type: 'error', message } satisfies ServerMessage));
  };

  switch (raw.type) {
    case 'createRoom': {
      const name = raw.name?.trim();
      if (!name) return replyError('Introduce tu nombre.');
      if (!raw.playerId) return replyError('Falta playerId.');
      playerIdRef.current = raw.playerId;
      const existing = manager.roomForPlayer(raw.playerId);
      if (existing) manager.leave(raw.playerId, socket);
      const room = manager.createRoom(
        raw.playerId,
        name,
        socket,
        raw.mrWhiteCount ?? 1,
        raw.farsanteCount ?? 1,
        raw.mrWhiteHasHints ?? false,
        raw.adultMode ?? false,
      );
      socket.send(
        JSON.stringify({
          type: 'joined',
          playerId: raw.playerId,
          code: room.code,
        } satisfies ServerMessage),
      );
      room.syncAll();
      return;
    }
    case 'joinRoom': {
      const name = raw.name?.trim();
      if (!name) return replyError('Introduce tu nombre.');
      if (!raw.playerId) return replyError('Falta playerId.');
      if (!raw.code?.trim()) return replyError('Introduce el código de sala.');
      playerIdRef.current = raw.playerId;
      try {
        const room = manager.joinRoom(raw.code.trim(), raw.playerId, name, socket);
        socket.send(
          JSON.stringify({
            type: 'joined',
            playerId: raw.playerId,
            code: room.code,
          } satisfies ServerMessage),
        );
        room.syncAll();
      } catch (err) {
        replyError(err instanceof Error ? err.message : 'No se pudo unir.');
      }
      return;
    }
    case 'reconnect': {
      if (!raw.playerId || !raw.code?.trim()) return replyError('Datos de reconexión incompletos.');
      playerIdRef.current = raw.playerId;
      try {
        const room = manager.reconnect(raw.code.trim(), raw.playerId, socket);
        socket.send(
          JSON.stringify({
            type: 'joined',
            playerId: raw.playerId,
            code: room.code,
          } satisfies ServerMessage),
        );
        room.syncAll();
      } catch (err) {
        replyError(err instanceof Error ? err.message : 'No se pudo reconectar.');
      }
      return;
    }
    default:
      break;
  }

  const playerId = playerIdRef.current;
  if (!playerId) return replyError('Conéctate a una sala primero.');
  const room = manager.roomForPlayer(playerId);
  if (!room) return replyError('No estás en ninguna sala.');
  const seat = room.seats.get(playerId);
  if (!seat) return replyError('Asiento no encontrado.');

  switch (raw.type) {
    case 'setReady': {
      if (room.phase !== 'lobby') return replyError('Solo en el lobby.');
      seat.ready = Boolean(raw.ready);
      room.syncAll();
      return;
    }
    case 'updateConfig': {
      if (playerId !== room.hostPlayerId) return replyError('Solo el anfitrión puede cambiar la config.');
      if (room.phase !== 'lobby') return replyError('Solo en el lobby.');
      room.mrWhiteCount = Math.max(0, Math.floor(raw.mrWhiteCount));
      room.farsanteCount = Math.max(0, Math.floor(raw.farsanteCount));
      room.mrWhiteHasHints = Boolean(raw.mrWhiteHasHints);
      room.adultMode = Boolean(raw.adultMode);
      room.syncAll();
      return;
    }
    case 'startGame': {
      if (playerId !== room.hostPlayerId) return replyError('Solo el anfitrión puede empezar.');
      if (room.phase !== 'lobby') return replyError('La partida ya está en curso.');
      const connectedSeats = [...room.seats.values()].filter((s) => s.connected);
      if (connectedSeats.length < MIN_PLAYERS) {
        return replyError(`Hacen falta al menos ${MIN_PLAYERS} jugadores conectados.`);
      }
      if (connectedSeats.length > MAX_PLAYERS) {
        return replyError(`Máximo ${MAX_PLAYERS} jugadores.`);
      }
      const notReady = connectedSeats.filter((s) => !s.ready);
      if (notReady.length > 0) {
        return replyError('Todos los jugadores conectados deben estar listos.');
      }
      const config = room.configForValidation(connectedSeats.length);
      const validation = validateConfig(config);
      if (!validation.valid) return replyError(validation.error ?? 'Configuración inválida.');

      // Quitar desconectados del lobby
      for (const s of [...room.seats.values()]) {
        if (!s.connected) {
          room.removeSeat(s.playerId);
          manager.unbindPlayer(s.playerId);
        }
      }

      const active = [...room.seats.values()];
      room.words = pickRandomWordPair(room.adultMode);
      const dealt = dealOnlineSeats(
        room.configForValidation(active.length),
        room.words,
        active.map((s) => ({ playerId: s.playerId, name: s.name })),
        room.previousMrWhitePlayerIds,
      );
      for (const d of dealt) {
        const target = room.seats.get(d.playerId)!;
        target.role = d.role;
        target.word = d.word;
        target.hint = d.hint;
        target.eliminatedRound = null;
        target.revealAcked = false;
        target.ready = false;
      }
      room.previousMrWhitePlayerIds = dealt
        .filter((d) => d.role === 'mrWhite')
        .map((d) => d.playerId);
      room.startingPlayerId = pickStartingPlayerIdString(
        dealt.map((d) => d.playerId),
        room.previousStartingPlayerId,
      );
      room.previousStartingPlayerId = room.startingPlayerId;
      room.currentRound = 1;
      room.lastElimination = null;
      room.phase = 'reveal';
      room.syncAll();
      return;
    }
    case 'ackReveal': {
      if (room.phase !== 'reveal') return;
      seat.revealAcked = true;
      room.syncAll();
      return;
    }
    case 'beginPlay': {
      if (playerId !== room.hostPlayerId) return replyError('Solo el anfitrión puede continuar.');
      if (room.phase !== 'reveal') return replyError('Aún no toca jugar.');
      const allAcked = [...room.seats.values()].every((s) => s.revealAcked);
      if (!allAcked) return replyError('Falta que todos vean su palabra.');
      room.phase = 'play';
      room.syncAll();
      return;
    }
    case 'eliminate': {
      if (playerId !== room.hostPlayerId) return replyError('Solo el anfitrión elimina (MVP).');
      if (room.phase !== 'play') return replyError('No hay eliminaciones ahora.');
      const target = room.seats.get(raw.targetPlayerId);
      if (!target || target.role === null) return replyError('Jugador no válido.');
      if (target.eliminatedRound !== null) return replyError('Ya estaba eliminado.');
      const alive = [...room.seats.values()].filter(
        (s) => s.eliminatedRound === null && s.role !== null,
      );
      const mrWhiteAlive = alive.some((s) => s.role === 'mrWhite');
      if (!mrWhiteAlive || alive.length <= 1) {
        return replyError('No se puede eliminar ahora.');
      }
      const round = room.currentRound;
      target.eliminatedRound = round;
      room.lastElimination = {
        playerId: target.playerId,
        playerName: target.name,
        role: target.role!,
        round,
      };
      room.currentRound = round + 1;

      const stillMrWhite = [...room.seats.values()].some(
        (s) => s.role === 'mrWhite' && s.eliminatedRound === null,
      );
      if (!stillMrWhite) {
        room.phase = 'ended';
      } else {
        const stillAlive = [...room.seats.values()].filter((s) => s.eliminatedRound === null);
        if (stillAlive.length <= 1) {
          room.phase = 'ended';
        }
      }
      room.syncAll();
      return;
    }
    case 'dismissElimination': {
      room.lastElimination = null;
      room.syncAll();
      return;
    }
    case 'newGame': {
      if (playerId !== room.hostPlayerId) return replyError('Solo el anfitrión.');
      for (const s of room.seats.values()) {
        s.role = null;
        s.word = null;
        s.hint = null;
        s.eliminatedRound = null;
        s.revealAcked = false;
        s.ready = false;
      }
      room.words = null;
      room.phase = 'lobby';
      room.currentRound = 1;
      room.lastElimination = null;
      room.startingPlayerId = null;
      room.syncAll();
      return;
    }
    case 'leaveRoom': {
      const left = manager.leave(playerId, socket);
      playerIdRef.current = null;
      left?.syncAll();
      return;
    }
    default:
      replyError('Mensaje desconocido.');
  }
}
