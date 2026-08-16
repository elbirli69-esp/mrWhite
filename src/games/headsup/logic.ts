import { ADULT_WORD_PAIRS } from '../../data/adultWords';
import { WORD_PAIRS } from '../../data/words';
import { randomInt, shuffle } from '../../utils/game';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export interface HeadsUpConfig {
  playerCount: number;
  /** Segundos por ronda del que sostiene el móvil. */
  roundSeconds: number;
  allowSkip: boolean;
  /** 0 = no hay puntuación objetivo; se juegan `roundsPerMatch` turnos. */
  winScore: number;
  roundsPerMatch: number;
  /** Pack malsonante / +18. */
  adultMode: boolean;
}

export const DEFAULT_CONFIG: HeadsUpConfig = {
  playerCount: 4,
  roundSeconds: 60,
  allowSkip: true,
  winScore: 10,
  roundsPerMatch: 8,
  adultMode: false,
};

export type HeadsUpScreen = 'home' | 'config' | 'names' | 'lobby' | 'play' | 'roundEnd' | 'matchEnd';

export interface HeadsUpPlayer {
  id: number;
  name: string;
  score: number;
}

export function validateHeadsUpConfig(config: HeadsUpConfig): { valid: boolean; error: string | null } {
  const { playerCount, roundSeconds, winScore, roundsPerMatch } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (![30, 45, 60, 90].includes(roundSeconds)) {
    return { valid: false, error: 'Duración de ronda no válida (30, 45, 60 o 90).' };
  }
  if (winScore < 0 || winScore > 50) {
    return { valid: false, error: 'Puntos para ganar entre 0 y 50 (0 = sin objetivo).' };
  }
  if (!Number.isInteger(roundsPerMatch) || roundsPerMatch < 1 || roundsPerMatch > 30) {
    return { valid: false, error: 'Rondas del partido entre 1 y 30.' };
  }
  return { valid: true, error: null };
}

export function isHeadsUpConfig(value: unknown): value is HeadsUpConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.roundSeconds === 'number' &&
    typeof c.allowSkip === 'boolean' &&
    typeof c.winScore === 'number' &&
    typeof c.roundsPerMatch === 'number' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function buildWordDeck(count = 80, adultMode = false): string[] {
  const pool = adultMode ? ADULT_WORD_PAIRS : WORD_PAIRS;
  const words = pool.map(([normal]) => normal);
  return shuffle(words).slice(0, Math.min(count, words.length));
}

export function createPlayers(names: string[]): HeadsUpPlayer[] {
  return names.map((name, index) => ({
    id: index + 1,
    name: name.trim() || `Jugador ${index + 1}`,
    score: 0,
  }));
}

export function nextPlayerIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

export function pickRandomStart(total: number): number {
  return randomInt(Math.max(1, total));
}
