import { ADULT_WORD_PAIRS } from '../../data/adultWords';
import { WORD_PAIRS } from '../../data/words';
import { randomInt, shuffle } from '../../utils/game';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export interface UnanimoConfig {
  playerCount: number;
  wordsPerPlayer: number;
  totalRounds: number;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: UnanimoConfig = {
  playerCount: 4,
  wordsPerPlayer: 8,
  totalRounds: 5,
  adultMode: false,
};

export type UnanimoScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'roundIntro'
  | 'pass'
  | 'entry'
  | 'results'
  | 'matchEnd';

export interface UnanimoPlayer {
  id: number;
  name: string;
  score: number;
}

export interface WordStat {
  word: string;
  count: number;
  playerIds: number[];
  points: number;
}

export function validateConfig(config: UnanimoConfig): { valid: boolean; error: string | null } {
  const { playerCount, wordsPerPlayer, totalRounds } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (![5, 6, 7, 8, 10].includes(wordsPerPlayer)) {
    return { valid: false, error: 'Palabras por jugador: 5, 6, 7, 8 o 10.' };
  }
  if (![3, 5, 7, 10].includes(totalRounds)) {
    return { valid: false, error: 'Rondas: 3, 5, 7 o 10.' };
  }
  return { valid: true, error: null };
}

export function isUnanimoConfig(value: unknown): value is UnanimoConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.wordsPerPlayer === 'number' &&
    typeof c.totalRounds === 'number' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function createPlayers(names: string[]): UnanimoPlayer[] {
  return names.map((name, index) => ({
    id: index + 1,
    name: name.trim() || `Jugador ${index + 1}`,
    score: 0,
  }));
}

export function pickTheme(adultMode: boolean, used: string[] = []): string {
  const pool = (adultMode ? ADULT_WORD_PAIRS : WORD_PAIRS).map(([w]) => w);
  const available = pool.filter((w) => !used.includes(w));
  const list = available.length > 0 ? available : pool;
  return list[randomInt(list.length)]!;
}

export function normalizeWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñü\s]/gi, '')
    .replace(/\s+/g, ' ');
}

/**
 * Puntos por palabra:
 * - 1 solo jugador: 0 (demasiado original)
 * - mayoría absoluta (> mitad): 3
 * - 2+ pero no mayoría: 1
 */
export function scoreRound(
  submissions: { playerId: number; words: string[] }[],
  playerCount: number,
): { stats: WordStat[]; pointsByPlayer: Record<number, number> } {
  const map = new Map<string, { display: string; playerIds: number[] }>();

  for (const submission of submissions) {
    const seen = new Set<string>();
    for (const raw of submission.words) {
      const key = normalizeWord(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const prev = map.get(key);
      if (prev) {
        prev.playerIds.push(submission.playerId);
      } else {
        map.set(key, { display: raw.trim(), playerIds: [submission.playerId] });
      }
    }
  }

  const majority = Math.floor(playerCount / 2) + 1;
  const pointsByPlayer: Record<number, number> = {};
  for (const sub of submissions) pointsByPlayer[sub.playerId] = 0;

  const stats: WordStat[] = [...map.entries()]
    .map(([, value]) => {
      const count = value.playerIds.length;
      let points = 0;
      if (count >= majority) points = 3;
      else if (count >= 2) points = 1;
      for (const id of value.playerIds) {
        pointsByPlayer[id] = (pointsByPlayer[id] ?? 0) + points;
      }
      return {
        word: value.display,
        count,
        playerIds: value.playerIds,
        points,
      };
    })
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

  return { stats, pointsByPlayer };
}

export function emptyWords(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

export function shuffleOrder(ids: number[]): number[] {
  return shuffle(ids);
}
