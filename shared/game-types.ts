/** Roles asignables a cada jugador en una partida. */
export type PlayerRole = 'normal' | 'mrWhite' | 'farsante';

/** Configuración de partida. */
export interface GameConfig {
  playerCount: number;
  mrWhiteCount: number;
  farsanteCount: number;
  /** Si Mr White recibe una pista temática al revelar. */
  mrWhiteHasHints: boolean;
  /** Pack malsonante / +18. */
  adultMode: boolean;
}

/** Jugador con rol y palabra asignada (si aplica). Ids numéricos en modo local. */
export interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  /** Palabra visible al revelar; null solo para Mr White. */
  word: string | null;
  /**
   * Pista solo para Mr White (si la partida la tiene activada).
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

/** Resultado de la última eliminación (modo local). */
export interface EliminationResult {
  playerId: number;
  playerName: string;
  role: PlayerRole;
  round: number;
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
      return 'el impostor';
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
      return `Has eliminado a ${name}: era el impostor.`;
    case 'farsante':
      return `Has eliminado a ${name}: era un Farsante.`;
    case 'normal':
      return `Has eliminado a ${name}: era un jugador normal.`;
    default:
      return `Has eliminado a ${name}.`;
  }
}
