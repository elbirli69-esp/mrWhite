import { buildCategoryPool } from './categories';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const SECONDS_OPTIONS = [30, 45, 60, 90] as const;
export const ROUNDS_OPTIONS = [1, 2, 3, 4, 5] as const;
export const AI_WEIGHT_OPTIONS = [0, 25, 50, 75, 100] as const;

export type TopicMode = 'serious' | 'invented';
export type EvalMode = 'both' | 'ai' | 'votes';

export interface HablaYaConfig {
  playerCount: number;
  secondsPerTurn: number;
  rounds: number;
  topicMode: TopicMode;
  evalMode: EvalMode;
  /** Porcentaje de peso de la IA en la media (0–100). Solo aplica si evalMode === 'both'. */
  aiWeight: number;
  useBuiltInCategories: boolean;
  customCategories: string[];
  adultMode: boolean;
}

export const DEFAULT_CONFIG: HablaYaConfig = {
  playerCount: 4,
  secondsPerTurn: 45,
  rounds: 1,
  topicMode: 'serious',
  evalMode: 'both',
  aiWeight: 50,
  useBuiltInCategories: true,
  customCategories: [],
  adultMode: false,
};

export type HablaYaScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'pass'
  | 'pick'
  | 'record'
  | 'review'
  | 'turnResult'
  | 'matchEnd';

export interface HablaYaPlayer {
  id: number;
  name: string;
  score: number;
}

export interface TurnRecord {
  round: number;
  playerId: number;
  category: string;
  aiScore: number | null;
  aiFeedback: string | null;
  votes: Record<number, number>;
  finalScore: number;
  transcript: string;
}

export function validateConfig(config: HablaYaConfig): { valid: boolean; error: string | null } {
  const {
    playerCount,
    secondsPerTurn,
    rounds,
    topicMode,
    evalMode,
    aiWeight,
    useBuiltInCategories,
    customCategories,
  } = config;

  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (!(SECONDS_OPTIONS as readonly number[]).includes(secondsPerTurn)) {
    return { valid: false, error: 'Duración: 30, 45, 60 o 90 segundos.' };
  }
  if (!(ROUNDS_OPTIONS as readonly number[]).includes(rounds)) {
    return { valid: false, error: 'Rondas: de 1 a 5.' };
  }
  if (topicMode !== 'serious' && topicMode !== 'invented') {
    return { valid: false, error: 'Elige modo serio o inventado.' };
  }
  if (evalMode !== 'both' && evalMode !== 'ai' && evalMode !== 'votes') {
    return { valid: false, error: 'Elige cómo se puntúa.' };
  }
  if (!(AI_WEIGHT_OPTIONS as readonly number[]).includes(aiWeight)) {
    return { valid: false, error: 'Peso de la IA: 0, 25, 50, 75 o 100.' };
  }

  const pool = buildCategoryPool({
    useBuiltIn: useBuiltInCategories,
    adultMode: config.adultMode,
    custom: customCategories,
  });
  const turnsNeeded = playerCount * rounds;
  if (pool.length < turnsNeeded) {
    return {
      valid: false,
      error: `Hacen falta al menos ${turnsNeeded} categorías (hay ${pool.length}). Añade custom o baja rondas.`,
    };
  }

  return { valid: true, error: null };
}

export function isHablaYaConfig(value: unknown): value is HablaYaConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.secondsPerTurn === 'number' &&
    typeof c.rounds === 'number' &&
    (c.topicMode === 'serious' || c.topicMode === 'invented') &&
    (c.evalMode === 'both' || c.evalMode === 'ai' || c.evalMode === 'votes') &&
    typeof c.aiWeight === 'number' &&
    typeof c.useBuiltInCategories === 'boolean' &&
    Array.isArray(c.customCategories) &&
    c.customCategories.every((x) => typeof x === 'string') &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function createPlayers(names: string[]): HablaYaPlayer[] {
  return names.map((name, index) => ({
    id: index + 1,
    name: name.trim() || `Jugador ${index + 1}`,
    score: 0,
  }));
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

export function averageVotes(votes: Record<number, number>): number | null {
  const values = Object.values(votes).filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return clampScore(sum / values.length);
}

/**
 * Combina nota IA y votos según modo y peso.
 * Si falta una fuente en modo "both", usa la disponible.
 */
export function combineScore(options: {
  evalMode: EvalMode;
  aiWeight: number;
  aiScore: number | null;
  votes: Record<number, number>;
}): number | null {
  const voteAvg = averageVotes(options.votes);
  const ai = options.aiScore == null ? null : clampScore(options.aiScore);

  if (options.evalMode === 'ai') return ai;
  if (options.evalMode === 'votes') return voteAvg;

  if (ai != null && voteAvg != null) {
    const w = options.aiWeight / 100;
    return clampScore(ai * w + voteAvg * (1 - w));
  }
  if (ai != null) return ai;
  return voteAvg;
}

export function ranking(players: HablaYaPlayer[]): HablaYaPlayer[] {
  return [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));
}
