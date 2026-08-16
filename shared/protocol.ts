import type { GameConfig, PlayerRole } from './game-types.js';

export type RoomPhase = 'lobby' | 'reveal' | 'play' | 'ended';

/** Asiento visible para todos (sin rol/palabra vivos). */
export interface PublicSeat {
  playerId: string;
  name: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  /** Solo presente si ya fue eliminado. */
  eliminatedRound: number | null;
  revealedRole: PlayerRole | null;
  /** En fase reveal: si ya confirmó haber visto su rol. */
  revealAcked: boolean;
}

export interface OnlineEliminationResult {
  playerId: string;
  playerName: string;
  role: PlayerRole;
  round: number;
}

export interface PublicRoomState {
  code: string;
  phase: RoomPhase;
  hostPlayerId: string;
  config: Pick<GameConfig, 'mrWhiteCount' | 'farsanteCount' | 'mrWhiteHasHints' | 'adultMode'>;
  seats: PublicSeat[];
  currentRound: number;
  startingPlayerId: string | null;
  starterName: string | null;
  lastElimination: OnlineEliminationResult | null;
  /** true cuando no queda ningún Mr White vivo. */
  allMrWhiteOut: boolean;
  /** Palabra normal; solo en fase ended o allMrWhiteOut. */
  revealedWord: string | null;
  /** Cuántos han confirmado ver su rol (fase reveal). */
  revealAckCount: number;
}

export interface PrivateRolePayload {
  role: PlayerRole;
  word: string | null;
  hint: string | null;
}

export type ClientMessage =
  | {
      type: 'createRoom';
      name: string;
      playerId: string;
      mrWhiteCount?: number;
      farsanteCount?: number;
      mrWhiteHasHints?: boolean;
      adultMode?: boolean;
    }
  | { type: 'joinRoom'; code: string; name: string; playerId: string }
  | { type: 'reconnect'; code: string; playerId: string }
  | { type: 'setReady'; ready: boolean }
  | {
      type: 'updateConfig';
      mrWhiteCount: number;
      farsanteCount: number;
      mrWhiteHasHints: boolean;
      adultMode: boolean;
    }
  | { type: 'startGame' }
  | { type: 'ackReveal' }
  | { type: 'beginPlay' }
  | { type: 'eliminate'; targetPlayerId: string }
  | { type: 'dismissElimination' }
  | { type: 'newGame' }
  | { type: 'leaveRoom' };

export type ServerMessage =
  | { type: 'error'; message: string }
  | { type: 'joined'; playerId: string; code: string }
  | { type: 'roomState'; state: PublicRoomState }
  | { type: 'privateRole'; payload: PrivateRolePayload };
