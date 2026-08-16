import { ADULT_WORD_PAIRS } from '../../data/adultWords';
import { WORD_PAIRS } from '../../data/words';
import { randomInt, shuffle } from '../../utils/game';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export interface FakeArtistConfig {
  playerCount: number;
  fakerCount: number;
  /** Cuántos trazos hace cada jugador en total (repartidos en orden). */
  strokesPerPlayer: number;
  fakeCanGuess: boolean;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: FakeArtistConfig = {
  playerCount: 5,
  fakerCount: 1,
  strokesPerPlayer: 2,
  fakeCanGuess: true,
  adultMode: false,
};

export type FakeArtistScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'reveal'
  | 'pass'
  | 'ready'
  | 'draw'
  | 'vote'
  | 'guess'
  | 'end';

export type FakeArtistRole = 'artist' | 'faker';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  playerId: number;
  points: Point[];
}

export interface FakeArtistPlayer {
  id: number;
  name: string;
  role: FakeArtistRole;
}

export function validateConfig(config: FakeArtistConfig): { valid: boolean; error: string | null } {
  const { playerCount, fakerCount, strokesPerPlayer } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (!Number.isInteger(fakerCount) || fakerCount < 1) {
    return { valid: false, error: 'Debe haber al menos un artista falso.' };
  }
  if (fakerCount >= playerCount) {
    return { valid: false, error: 'Debe quedar al menos un artista que conozca la palabra.' };
  }
  if (![1, 2, 3].includes(strokesPerPlayer)) {
    return { valid: false, error: 'Trazos por jugador: 1, 2 o 3.' };
  }
  return { valid: true, error: null };
}

export function isFakeArtistConfig(value: unknown): value is FakeArtistConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.fakerCount === 'number' &&
    typeof c.strokesPerPlayer === 'number' &&
    typeof c.fakeCanGuess === 'boolean' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function pickWord(adultMode: boolean): string {
  const pool = adultMode ? ADULT_WORD_PAIRS : WORD_PAIRS;
  return pool[randomInt(pool.length)]![0];
}

export function createPlayers(
  config: FakeArtistConfig,
  names: string[],
  previousFakerIds: number[] = [],
): FakeArtistPlayer[] {
  const roles: FakeArtistRole[] = [
    ...Array.from({ length: config.fakerCount }, () => 'faker' as const),
    ...Array.from({ length: config.playerCount - config.fakerCount }, () => 'artist' as const),
  ];
  let shuffled = shuffle(roles);
  if (previousFakerIds.length > 0 && config.fakerCount < config.playerCount) {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const ids = shuffled
        .map((role, index) => (role === 'faker' ? index + 1 : -1))
        .filter((id) => id > 0);
      const same =
        ids.length === previousFakerIds.length &&
        [...ids].sort((a, b) => a - b).every((id, i) => id === [...previousFakerIds].sort((a, b) => a - b)[i]);
      if (!same) break;
      shuffled = shuffle(roles);
    }
  }
  return shuffled.map((role, index) => ({
    id: index + 1,
    name: names[index]?.trim() || `Jugador ${index + 1}`,
    role,
  }));
}

export function buildStrokeOrder(players: FakeArtistPlayer[], strokesPerPlayer: number): number[] {
  const order: number[] = [];
  for (let round = 0; round < strokesPerPlayer; round += 1) {
    for (const player of players) order.push(player.id);
  }
  return order;
}

export function guessesMatch(guess: string, secret: string): boolean {
  const norm = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
  return norm(guess) === norm(secret);
}
