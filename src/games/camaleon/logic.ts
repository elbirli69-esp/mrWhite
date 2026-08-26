import { ADULT_CAMALEON_CATEGORIES } from './adultData';
import { CAMALEON_CATEGORIES } from './data';
import { randomInt, shuffle } from '../../utils/game';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;

export type CamaleonRole = 'normal' | 'chameleon';

export interface CamaleonConfig {
  playerCount: number;
  chameleonCount: number;
  /** Los normales ven las 16 palabras del tablero. */
  showWordGrid: boolean;
  /** Fase de pistas de una palabra antes de votar. */
  cluePhase: boolean;
  /** Si acusan al camaleón, puede intentar adivinar la palabra. */
  chameleonCanGuess: boolean;
  /** Pack malsonante / +18. */
  adultMode: boolean;
}

export const DEFAULT_CONFIG: CamaleonConfig = {
  playerCount: 5,
  chameleonCount: 1,
  showWordGrid: true,
  cluePhase: true,
  chameleonCanGuess: true,
  adultMode: false,
};

export type CamaleonScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'reveal'
  | 'pass'
  | 'ready'
  | 'clues'
  | 'passClue'
  | 'play'
  | 'guess'
  | 'end';

export interface CamaleonPlayer {
  id: number;
  name: string;
  role: CamaleonRole;
  clue: string;
  eliminatedRound: number | null;
}

export interface CamaleonDeal {
  categoryName: string;
  words: readonly string[];
  secretWord: string;
  secretIndex: number;
}

export interface CamaleonElimination {
  playerId: number;
  playerName: string;
  role: CamaleonRole;
  round: number;
}

export function validateCamaleonConfig(config: CamaleonConfig): { valid: boolean; error: string | null } {
  const { playerCount, chameleonCount } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (!Number.isInteger(chameleonCount) || chameleonCount < 1) {
    return { valid: false, error: 'Debe haber al menos un intruso.' };
  }
  if (chameleonCount >= playerCount) {
    return { valid: false, error: 'Debe quedar al menos un jugador que conozca la palabra.' };
  }
  return { valid: true, error: null };
}

export function isCamaleonConfig(value: unknown): value is CamaleonConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.chameleonCount === 'number' &&
    typeof c.showWordGrid === 'boolean' &&
    typeof c.cluePhase === 'boolean' &&
    typeof c.chameleonCanGuess === 'boolean' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean') &&
    Number.isInteger(c.playerCount) &&
    Number.isInteger(c.chameleonCount)
  );
}

export function pickDeal(adultMode = false): CamaleonDeal {
  const pool = adultMode ? ADULT_CAMALEON_CATEGORIES : CAMALEON_CATEGORIES;
  const category = pool[randomInt(pool.length)]!;
  const secretIndex = randomInt(category.words.length);
  return {
    categoryName: category.name,
    words: category.words,
    secretWord: category.words[secretIndex]!,
    secretIndex,
  };
}

export function createPlayers(
  config: CamaleonConfig,
  names: string[],
  previousChameleonIds: number[] = [],
): CamaleonPlayer[] {
  const roles: CamaleonRole[] = [
    ...Array.from({ length: config.chameleonCount }, () => 'chameleon' as const),
    ...Array.from({ length: config.playerCount - config.chameleonCount }, () => 'normal' as const),
  ];

  let shuffled = shuffle(roles);
  if (previousChameleonIds.length > 0 && config.chameleonCount < config.playerCount) {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const ids = shuffled
        .map((role, index) => (role === 'chameleon' ? index + 1 : -1))
        .filter((id) => id > 0);
      const same =
        ids.length === previousChameleonIds.length &&
        [...ids].sort((a, b) => a - b).every((id, i) => id === [...previousChameleonIds].sort((a, b) => a - b)[i]);
      if (!same) break;
      shuffled = shuffle(roles);
    }
  }

  return shuffled.map((role, index) => ({
    id: index + 1,
    name: names[index]?.trim() || `Jugador ${index + 1}`,
    role,
    clue: '',
    eliminatedRound: null,
  }));
}

export function pickStarterId(players: CamaleonPlayer[], avoidId: number | null): number {
  const pool =
    avoidId !== null && players.length > 1
      ? players.filter((p) => p.id !== avoidId)
      : players;
  return (pool.length > 0 ? pool : players)[randomInt((pool.length > 0 ? pool : players).length)]!.id;
}

export function normalizeGuess(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function guessesMatch(guess: string, secret: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(secret);
}
