import { randomInt, shuffle } from '../../utils/game';
import { customerPool, wordPool } from './content';
import {
  DEFAULT_CONFIG,
  type AiEvaluation,
  type CustomerBrief,
  type DimensionScores,
  type RoundDeal,
  type SnakeOilConfig,
} from './types';

export const PITCH_SECONDS_OPTIONS = [45, 60] as const;
export const OBJECTION_SECONDS_OPTIONS = [15, 20] as const;
export const WORD_COUNT_OPTIONS = [2, 3] as const;

export function validateConfig(config: SnakeOilConfig): { valid: boolean; error: string | null } {
  if (config.playMode !== 'solo') {
    return { valid: false, error: 'El MVP solo soporta modo solitario por ahora.' };
  }
  if (config.wordCount !== 2 && config.wordCount !== 3) {
    return { valid: false, error: 'Elige 2 o 3 palabras.' };
  }
  if (!(PITCH_SECONDS_OPTIONS as readonly number[]).includes(config.pitchSeconds)) {
    return { valid: false, error: 'Duración del pitch: 45 o 60 segundos.' };
  }
  if (!(OBJECTION_SECONDS_OPTIONS as readonly number[]).includes(config.objectionSeconds)) {
    return { valid: false, error: 'Duración de la respuesta: 15 o 20 segundos.' };
  }
  return { valid: true, error: null };
}

export function isSnakeOilConfig(value: unknown): value is SnakeOilConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    (c.playMode === undefined || c.playMode === 'solo') &&
    typeof c.wordCount === 'number' &&
    typeof c.pitchSeconds === 'number' &&
    typeof c.objectionSeconds === 'number' &&
    typeof c.enableObjection === 'boolean' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean') &&
    (c.gameMode === undefined ||
      c.gameMode === 'classic' ||
      c.gameMode === 'duel' ||
      c.gameMode === 'objection' ||
      c.gameMode === 'chaos')
  );
}

export function normalizeConfig(raw: Partial<SnakeOilConfig> | SnakeOilConfig): SnakeOilConfig {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    playMode: 'solo',
    adultMode: raw.adultMode ?? false,
    enableObjection: raw.enableObjection ?? true,
    gameMode: raw.gameMode ?? 'classic',
  };
}

export function dealRound(config: SnakeOilConfig, avoidCustomerId: string | null = null): RoundDeal {
  const customers = customerPool(config.adultMode);
  let customer = customers[randomInt(customers.length)]!;
  if (avoidCustomerId && customers.length > 1) {
    let guard = 0;
    while (customer.id === avoidCustomerId && guard < 10) {
      customer = customers[randomInt(customers.length)]!;
      guard += 1;
    }
  }
  const words = shuffle(wordPool(config.adultMode)).slice(0, config.wordCount);
  return { customer, words };
}

export function suggestProductName(words: string[]): string {
  if (words.length === 0) return 'Producto misterioso';
  if (words.length === 1) return `El ${words[0]} 3000`;
  const [a, b, c] = words;
  if (words.length === 2) return `${a}-${b} Pro`;
  return `El ${a}${b} ${c}`;
}

export function emptyDimensions(): DimensionScores {
  return {
    persuasion: 0,
    creativity: 0,
    improvisation: 0,
    coherence: 0,
    humor: 0,
    customerFit: 0,
    objectionHandling: 0,
    clarity: 0,
    originality: 0,
    fluency: 0,
    wordUse: 0,
  };
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Leyenda del snake oil';
  if (score >= 80) return 'Excelente vendedor';
  if (score >= 70) return 'Cierre casi cerrado';
  if (score >= 55) return 'Vendedor con potencial';
  if (score >= 40) return 'Pitch a medias';
  if (score >= 25) return 'Cliente confuso';
  return 'Todavía no sé qué vendías';
}

export function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function customerHeadline(customer: CustomerBrief): string {
  return `${customer.emoji} ${customer.title}`;
}

/** Combina IA (70%) y votos humanos (30%). MVP solo: votos = null → 100% IA. */
export function combineRoundScore(aiScore: number, playerVoteAvg: number | null, aiWeight = 70): number {
  const ai = clamp100(aiScore);
  if (playerVoteAvg == null) return ai;
  const w = Math.max(0, Math.min(100, aiWeight)) / 100;
  return clamp100(ai * w + clamp100(playerVoteAvg) * (1 - w));
}

export type MatchStats = {
  rounds: number;
  bestScore: number;
  totalScore: number;
  bestCreativity: number;
  bestImprovisation: number;
  bestObjection: number;
};

export function emptyStats(): MatchStats {
  return {
    rounds: 0,
    bestScore: 0,
    totalScore: 0,
    bestCreativity: 0,
    bestImprovisation: 0,
    bestObjection: 0,
  };
}

export function updateStats(stats: MatchStats, evaluation: AiEvaluation): MatchStats {
  return {
    rounds: stats.rounds + 1,
    bestScore: Math.max(stats.bestScore, evaluation.score),
    totalScore: stats.totalScore + evaluation.score,
    bestCreativity: Math.max(stats.bestCreativity, evaluation.dimensions.creativity),
    bestImprovisation: Math.max(stats.bestImprovisation, evaluation.dimensions.improvisation),
    bestObjection: Math.max(stats.bestObjection, evaluation.dimensions.objectionHandling),
  };
}
