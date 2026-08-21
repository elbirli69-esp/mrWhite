import { randomInt, shuffle } from '../../utils/game';
import {
  PACK_OPTIONS,
  pairsForMode,
  secretsForPack,
  type BinaryPair,
  type SecretPackId,
} from './data';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const PAIRS_PER_ROUND = 14;

export type { BinaryPair, SecretPackId };
export { PACK_OPTIONS };

export interface CafeOTeConfig {
  playerCount: number;
  totalRounds: number;
  /** Preguntas máximas por ronda antes de fallar. */
  maxQuestions: number;
  /** Permite una respuesta «ambos» o «ninguno» por ronda. */
  allowWildcard: boolean;
  pack: SecretPackId;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: CafeOTeConfig = {
  playerCount: 4,
  totalRounds: 8,
  maxQuestions: 10,
  allowWildcard: true,
  pack: 'mix',
  adultMode: false,
};

export type CafeOTeScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'roundIntro'
  | 'passToThinker'
  | 'thinkerReveal'
  | 'play'
  | 'roundResult'
  | 'matchEnd';

export type PlayMode = 'ask' | 'guess';

export type PairAnswer = 'left' | 'right' | 'both' | 'neither';

export interface CafeOTePlayer {
  id: number;
  name: string;
}

export interface HistoryEntry {
  left: string;
  right: string;
  answer: PairAnswer;
}

export function validateCafeOTeConfig(config: CafeOTeConfig): { valid: boolean; error: string | null } {
  const { playerCount, totalRounds, maxQuestions, pack } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (![5, 8, 11].includes(totalRounds)) {
    return { valid: false, error: 'Rondas válidas: 5, 8 u 11.' };
  }
  if (![8, 10, 12, 15].includes(maxQuestions)) {
    return { valid: false, error: 'Preguntas máximas: 8, 10, 12 o 15.' };
  }
  if (!PACK_OPTIONS.some((p) => p.id === pack)) {
    return { valid: false, error: 'Pack no válido.' };
  }
  return { valid: true, error: null };
}

export function isCafeOTeConfig(value: unknown): value is CafeOTeConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.totalRounds === 'number' &&
    typeof c.maxQuestions === 'number' &&
    typeof c.allowWildcard === 'boolean' &&
    typeof c.pack === 'string' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function createPlayers(names: string[]): CafeOTePlayer[] {
  return names.map((name, index) => ({
    id: index + 1,
    name: name.trim() || `Jugador ${index + 1}`,
  }));
}

export function pickThinkerIndex(round: number, total: number): number {
  if (total <= 0) return 0;
  return (round - 1) % total;
}

export function buildSecretDeck(pack: SecretPackId, adultMode: boolean, count = 40): string[] {
  const pool = [...secretsForPack(pack, adultMode)];
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function pickRoundPairs(adultMode: boolean, count = PAIRS_PER_ROUND): BinaryPair[] {
  const pool = [...pairsForMode(adultMode)];
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function normalizeGuess(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñü\s]/gi, '')
    .replace(/\s+/g, ' ');
}

export function guessesMatch(guess: string, secret: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(secret);
}

export function answerLabel(entry: HistoryEntry): string {
  switch (entry.answer) {
    case 'left':
      return entry.left;
    case 'right':
      return entry.right;
    case 'both':
      return 'Los dos';
    case 'neither':
      return 'Ninguno';
    default:
      return '—';
  }
}

/** Puntos de la ronda: 0 si falla; 1 base + 1 bonus si usó pocas preguntas. */
export function scoreRound(won: boolean, questionsUsed: number, maxQuestions: number): number {
  if (!won) return 0;
  const half = Math.ceil(maxQuestions / 2);
  return questionsUsed <= half ? 2 : 1;
}

export function pickSecret(deck: string[], round: number, avoid: string | null = null): string {
  if (deck.length === 0) return 'Café';
  let word = deck[(round - 1) % deck.length] ?? deck[0]!;
  if (avoid && deck.length > 1 && word === avoid) {
    word = deck[randomInt(deck.length)]!;
  }
  return word;
}

export function isCustomPairValid(left: string, right: string): boolean {
  return left.trim().length > 0 && right.trim().length > 0 && normalizeGuess(left) !== normalizeGuess(right);
}
