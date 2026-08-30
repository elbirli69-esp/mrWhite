import { normalWordsForJustOne } from '../../data/wordFilters';
import { randomInt, shuffle } from '../../utils/game';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

export interface JustOneConfig {
  playerCount: number;
  totalRounds: number;
  /** Elimina pistas duplicadas (sin distinguir mayúsculas/acentos). */
  removeDuplicates: boolean;
  /** Mostrar pistas anuladas tachadas al adivinador. */
  showInvalidClues: boolean;
  /** Pack malsonante / +18. */
  adultMode: boolean;
}

export const DEFAULT_CONFIG: JustOneConfig = {
  playerCount: 4,
  totalRounds: 8,
  removeDuplicates: true,
  showInvalidClues: false,
  adultMode: false,
};

export type JustOneScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'roundIntro'
  | 'pass'
  | 'clueReveal'
  | 'clueEntry'
  | 'clueReview'
  | 'guess'
  | 'roundResult'
  | 'matchEnd';

export interface JustOnePlayer {
  id: number;
  name: string;
}

export function validateJustOneConfig(config: JustOneConfig): { valid: boolean; error: string | null } {
  const { playerCount, totalRounds } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (![5, 8, 11, 13].includes(totalRounds)) {
    return { valid: false, error: 'Rondas válidas: 5, 8, 11 o 13.' };
  }
  return { valid: true, error: null };
}

export function isJustOneConfig(value: unknown): value is JustOneConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.totalRounds === 'number' &&
    typeof c.removeDuplicates === 'boolean' &&
    typeof c.showInvalidClues === 'boolean' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function createPlayers(names: string[]): JustOnePlayer[] {
  return names.map((name, index) => ({
    id: index + 1,
    name: name.trim() || `Jugador ${index + 1}`,
  }));
}

export function buildWordDeck(count = 40, adultMode = false): string[] {
  const words = normalWordsForJustOne(adultMode);
  return shuffle(words).slice(0, Math.min(count, words.length));
}

export function normalizeClue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñü\s]/gi, '');
}

export function evaluateClues(
  clues: string[],
  removeDuplicates: boolean,
): { text: string; valid: boolean }[] {
  if (!removeDuplicates) {
    return clues.map((text) => ({ text, valid: text.trim().length > 0 }));
  }
  const norms = clues.map(normalizeClue);
  const counts = new Map<string, number>();
  for (const n of norms) {
    if (!n) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return clues.map((text, i) => {
    const n = norms[i] ?? '';
    if (!n) return { text, valid: false };
    return { text, valid: (counts.get(n) ?? 0) === 1 };
  });
}

export function guessesMatch(guess: string, secret: string): boolean {
  return normalizeClue(guess) === normalizeClue(secret);
}

export function pickGuesserIndex(round: number, total: number, avoid: number | null): number {
  if (total <= 0) return 0;
  if (avoid === null) return randomInt(total);
  return (avoid + 1 + (round % Math.max(1, total - 1))) % total;
}
