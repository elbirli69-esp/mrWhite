import { randomInt } from '../../utils/game';
import {
  ADULT_SOLUTION_WORDS,
  ADULT_VALID_GUESSES,
  SOLUTION_WORDS,
  VALID_GUESSES,
} from './words';

export const WORD_LENGTH = 5;
export const DEFAULT_MAX_ATTEMPTS = 6;
export const MIN_ATTEMPTS = 5;
export const MAX_ATTEMPTS = 8;

export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

export interface AdivinaConfig {
  maxAttempts: number;
  /** Obligatorio reutilizar verdes y amarillas reveladas. */
  hardMode: boolean;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: AdivinaConfig = {
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  hardMode: false,
  adultMode: false,
};

export type AdivinaScreen = 'home' | 'config' | 'play' | 'result';

export interface LetterResult {
  letter: string;
  status: Exclude<LetterStatus, 'empty' | 'tbd'>;
}

export interface GuessRow {
  letters: LetterResult[];
  word: string;
}

export interface AdivinaStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Índice 0 = 1 intento … maxAttempts-1. */
  distribution: number[];
}

export function emptyStats(maxAttempts = DEFAULT_MAX_ATTEMPTS): AdivinaStats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: Array.from({ length: maxAttempts }, () => 0),
  };
}

/** Normaliza entrada a A–Z / Ñ, sin tildes ni espacios. */
export function normalizeWord(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/Ü/g, 'U')
    // Proteger Ñ antes de NFD (Ñ → N + tilde).
    .replace(/Ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'Ñ')
    .replace(/[^A-ZÑ]/g, '');
}

export function validateAdivinaConfig(config: AdivinaConfig): { valid: boolean; error: string | null } {
  if (
    !Number.isInteger(config.maxAttempts) ||
    config.maxAttempts < MIN_ATTEMPTS ||
    config.maxAttempts > MAX_ATTEMPTS
  ) {
    return { valid: false, error: `Intentos entre ${MIN_ATTEMPTS} y ${MAX_ATTEMPTS}.` };
  }
  if (typeof config.hardMode !== 'boolean') {
    return { valid: false, error: 'Modo difícil no válido.' };
  }
  if (typeof config.adultMode !== 'boolean') {
    return { valid: false, error: 'Versión adultos no válida.' };
  }
  return { valid: true, error: null };
}

export function isAdivinaConfig(value: unknown): value is AdivinaConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.maxAttempts === 'number' &&
    typeof c.hardMode === 'boolean' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function isAdivinaStats(value: unknown): value is AdivinaStats {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.played === 'number' &&
    typeof s.wins === 'number' &&
    typeof s.currentStreak === 'number' &&
    typeof s.maxStreak === 'number' &&
    Array.isArray(s.distribution) &&
    s.distribution.every((n) => typeof n === 'number')
  );
}

export function solutionPool(adultMode: boolean): readonly string[] {
  return adultMode ? ADULT_SOLUTION_WORDS : SOLUTION_WORDS;
}

export function validGuessSet(adultMode: boolean): ReadonlySet<string> {
  return adultMode ? ADULT_VALID_GUESSES : VALID_GUESSES;
}

export function pickSolution(adultMode: boolean, avoid: string | null = null): string {
  const pool = solutionPool(adultMode);
  if (pool.length === 0) return 'MESA';
  if (pool.length === 1) return pool[0]!;
  let word = pool[randomInt(pool.length)]!;
  if (avoid && pool.length > 1) {
    let guard = 0;
    while (word === avoid && guard < 12) {
      word = pool[randomInt(pool.length)]!;
      guard += 1;
    }
  }
  return word;
}

/**
 * Evalúa un intento estilo Wordle (verdes primero, luego amarillos con cupo).
 */
export function evaluateGuess(guessRaw: string, solutionRaw: string): LetterResult[] {
  const guess = normalizeWord(guessRaw);
  const solution = normalizeWord(solutionRaw);
  if (guess.length !== WORD_LENGTH || solution.length !== WORD_LENGTH) {
    throw new Error('La palabra debe tener 5 letras.');
  }

  const result: LetterResult[] = Array.from({ length: WORD_LENGTH }, (_, i) => ({
    letter: guess[i]!,
    status: 'absent' as const,
  }));

  const remaining: Record<string, number> = {};
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess[i] === solution[i]) {
      result[i] = { letter: guess[i]!, status: 'correct' };
    } else {
      const ch = solution[i]!;
      remaining[ch] = (remaining[ch] ?? 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (result[i]!.status === 'correct') continue;
    const ch = guess[i]!;
    if ((remaining[ch] ?? 0) > 0) {
      result[i] = { letter: ch, status: 'present' };
      remaining[ch] = remaining[ch]! - 1;
    }
  }

  return result;
}

export function isValidGuess(guessRaw: string, adultMode: boolean): boolean {
  const guess = normalizeWord(guessRaw);
  if (guess.length !== WORD_LENGTH) return false;
  return validGuessSet(adultMode).has(guess);
}

/** Comprueba modo difícil: verdes fijos y amarillos reutilizados. */
export function hardModeViolation(
  guessRaw: string,
  previous: GuessRow[],
): string | null {
  if (previous.length === 0) return null;
  const guess = normalizeWord(guessRaw);

  const greens: Array<string | null> = Array.from({ length: WORD_LENGTH }, () => null);
  const mustInclude = new Set<string>();

  for (const row of previous) {
    for (let i = 0; i < row.letters.length; i += 1) {
      const cell = row.letters[i]!;
      if (cell.status === 'correct') {
        greens[i] = cell.letter;
      } else if (cell.status === 'present') {
        mustInclude.add(cell.letter);
      }
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    const letter = greens[i];
    if (letter && guess[i] !== letter) {
      return `Modo difícil: la posición ${i + 1} debe ser ${letter}.`;
    }
  }

  for (const letter of mustInclude) {
    if (!guess.includes(letter)) {
      return `Modo difícil: debes usar la letra ${letter}.`;
    }
  }

  return null;
}

export function keyboardStatuses(rows: GuessRow[]): Record<string, LetterStatus> {
  const rank: Record<Exclude<LetterStatus, 'empty' | 'tbd'>, number> = {
    absent: 1,
    present: 2,
    correct: 3,
  };
  const map: Record<string, LetterStatus> = {};
  for (const row of rows) {
    for (const cell of row.letters) {
      const prev = map[cell.letter];
      if (!prev || prev === 'empty' || prev === 'tbd') {
        map[cell.letter] = cell.status;
        continue;
      }
      if (rank[cell.status] > rank[prev as keyof typeof rank]) {
        map[cell.letter] = cell.status;
      }
    }
  }
  return map;
}

export function recordResult(
  stats: AdivinaStats,
  won: boolean,
  attemptsUsed: number,
  maxAttempts: number,
): AdivinaStats {
  const distribution =
    stats.distribution.length === maxAttempts
      ? [...stats.distribution]
      : Array.from({ length: maxAttempts }, (_, i) => stats.distribution[i] ?? 0);

  const next: AdivinaStats = {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak: won ? stats.currentStreak + 1 : 0,
    maxStreak: stats.maxStreak,
    distribution,
  };
  if (won) {
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
    const idx = Math.min(Math.max(attemptsUsed - 1, 0), maxAttempts - 1);
    next.distribution[idx] = (next.distribution[idx] ?? 0) + 1;
  }
  return next;
}

export const KEYBOARD_ROWS: readonly (readonly string[])[] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
] as const;
