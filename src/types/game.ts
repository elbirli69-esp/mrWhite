/** Roles asignables a cada jugador en una partida. */
export type PlayerRole = 'normal' | 'mrWhite' | 'farsante';

/** Configuración de partida (persistida en localStorage). */
export interface GameConfig {
  playerCount: number;
  mrWhiteCount: number;
  farsanteCount: number;
  /** Si Mr White recibe una pista temática al revelar. */
  mrWhiteHasHints: boolean;
  /** Pack malsonante / +18. */
  adultMode: boolean;
}

/** Jugador con rol y palabra asignada (si aplica). */
export interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  /** Palabra visible al revelar; null solo para Mr White. */
  word: string | null;
  /**
   * Pista solo para Mr White (si la partida la tiene activada):
   * asociación concreta de la palabra secreta para improvisar sin regalarla.
   */
  hint: string | null;
  /** Ronda en la que fue eliminado; null si sigue en juego. */
  eliminatedRound: number | null;
}

/** Pareja de palabras elegida para la partida. */
export interface SelectedWords {
  normal: string;
  farsante: string;
  /** Pista temática disponible para Mr White. */
  hint: string;
}

/** Resultado de la última eliminación (para mostrarlo en pantalla). */
export interface EliminationResult {
  playerId: number;
  playerName: string;
  role: PlayerRole;
  round: number;
}

/** Pantallas de la aplicación. */
export type AppScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'reveal'
  | 'pass'
  | 'ready'
  | 'play'
  | 'onlineJoin'
  | 'onlineLobby'
  | 'onlineReveal'
  | 'onlinePlay';

export interface GameState {
  screen: AppScreen;
  config: GameConfig;
  /** Nombres introducidos antes del reparto. */
  playerNames: string[];
  players: Player[];
  words: SelectedWords | null;
  currentPlayerIndex: number;
  /** Si el jugador actual ya ha revelado su palabra/rol. */
  revealed: boolean;
  /** Ronda actual de eliminación (empieza en 1). */
  currentRound: number;
  /** Última eliminación revelada. */
  lastElimination: EliminationResult | null;
  /** Id del jugador que empieza a hablar esta partida. */
  startingPlayerId: number | null;
}

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;

export const DEFAULT_CONFIG: GameConfig = {
  playerCount: 5,
  mrWhiteCount: 1,
  farsanteCount: 1,
  mrWhiteHasHints: false,
  adultMode: false,
};

/** Etiqueta legible del rol (revelada al eliminar). */
export function roleLabel(role: PlayerRole): string {
  switch (role) {
    case 'mrWhite':
      return 'Mr. White';
    case 'farsante':
      return 'Farsante';
    case 'normal':
      return 'jugador normal';
    default:
      return role;
  }
}

/** Mensaje al eliminar a alguien. */
export function eliminationMessage(name: string, role: PlayerRole): string {
  switch (role) {
    case 'mrWhite':
      return `Has eliminado a ${name}: era Mr. White.`;
    case 'farsante':
      return `Has eliminado a ${name}: era un Farsante.`;
    case 'normal':
      return `Has eliminado a ${name}: era un jugador normal.`;
    default:
      return `Has eliminado a ${name}.`;
  }
}
