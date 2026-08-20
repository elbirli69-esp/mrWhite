import { randomInt, shuffle } from '../../utils/game';
import {
  customerPool,
  eventsForDifficulty,
  objectionTypesForDifficulty,
  wordPool,
} from './content';
import type {
  AiEvaluation,
  Badge,
  BadgeId,
  Customer,
  Difficulty,
  DimensionScores,
  MatchFormat,
  PersistentStats,
  RoundDeal,
  SnakeOilConfig,
  TwistEvent,
  WordCard,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const BADGE_CATALOG: Record<BadgeId, Badge> = {
  nato_seller: {
    id: 'nato_seller',
    title: 'VENDEDOR NATO',
    description: 'Persuasión por las nubes.',
    emoji: '🏆',
  },
  improv_mind: {
    id: 'improv_mind',
    title: 'MENTE IMPROVISADORA',
    description: 'Respuesta excelente a lo inesperado.',
    emoji: '🧠',
  },
  absurd_works: {
    id: 'absurd_works',
    title: 'ABSURDO PERO FUNCIONA',
    description: 'Idea loca con alta probabilidad de compra.',
    emoji: '😂',
  },
  actor: {
    id: 'actor',
    title: 'ACTOR',
    description: 'Adaptación excelente al personaje.',
    emoji: '🎭',
  },
  no_escape: {
    id: 'no_escape',
    title: 'SIN SALIDA',
    description: 'Defendió una objeción especialmente dura.',
    emoji: '🔥',
  },
  nonsense: {
    id: 'nonsense',
    title: 'ESTO NO TIENE SENTIDO',
    description: 'Coherencia baja, creatividad/humor altos.',
    emoji: '💀',
  },
  combo_king: {
    id: 'combo_king',
    title: 'REY DEL COMBO',
    description: 'Mantuvo una racha de fuego.',
    emoji: '⚡',
  },
  closer: {
    id: 'closer',
    title: 'CIERRE LETAL',
    description: 'Alta probabilidad de compra.',
    emoji: '💰',
  },
  poet: {
    id: 'poet',
    title: 'POETA DEL PITCH',
    description: 'Creatividad descomunal.',
    emoji: '✨',
  },
  survivor: {
    id: 'survivor',
    title: 'SUPERVIVIENTE',
    description: 'Salvó una negociación difícil.',
    emoji: '🛡️',
  },
};

export function formatPresets(format: MatchFormat): {
  pitchSeconds: number;
  replySeconds: number;
  enableObjection: boolean;
  forceEventChance: number;
  secondObjectionChance: number;
} {
  if (format === 'quick') {
    return {
      pitchSeconds: 30,
      replySeconds: 15,
      enableObjection: true,
      forceEventChance: 0,
      secondObjectionChance: 0,
    };
  }
  return {
    pitchSeconds: 60,
    replySeconds: 20,
    enableObjection: true,
    forceEventChance: 0.55,
    secondObjectionChance: 0.35,
  };
}

export const PITCH_SECONDS_OPTIONS = [30, 45, 60] as const;
export const REPLY_SECONDS_OPTIONS = [10, 15, 20] as const;
export const WORD_COUNT_OPTIONS = [2, 3] as const;

export function validateConfig(config: SnakeOilConfig): { valid: boolean; error: string | null } {
  if (config.playMode !== 'solo') {
    return { valid: false, error: 'El MVP solo soporta modo solitario por ahora.' };
  }
  if (config.wordCount !== 2 && config.wordCount !== 3) {
    return { valid: false, error: 'Elige 2 o 3 palabras.' };
  }
  if (![30, 45, 60].includes(config.pitchSeconds)) {
    return { valid: false, error: 'Duración del pitch: 30, 45 o 60 segundos.' };
  }
  if (![10, 15, 20].includes(config.replySeconds)) {
    return { valid: false, error: 'Duración de la respuesta: 10, 15 o 20 segundos.' };
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
    (typeof c.replySeconds === 'number' || typeof c.objectionSeconds === 'number') &&
    (c.enableObjection === undefined || typeof c.enableObjection === 'boolean') &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean') &&
    (c.difficulty === undefined ||
      c.difficulty === 'easy' ||
      c.difficulty === 'normal' ||
      c.difficulty === 'hard') &&
    (c.format === undefined || c.format === 'quick' || c.format === 'full')
  );
}

export function normalizeConfig(raw: Partial<SnakeOilConfig> & { objectionSeconds?: number }): SnakeOilConfig {
  const format = raw.format ?? DEFAULT_CONFIG.format;
  const preset = formatPresets(format);
  const replySeconds = raw.replySeconds ?? raw.objectionSeconds ?? preset.replySeconds;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    playMode: 'solo',
    format,
    difficulty: raw.difficulty ?? 'normal',
    adultMode: raw.adultMode ?? false,
    enableObjection: raw.enableObjection ?? true,
    gameMode: raw.gameMode ?? 'objection',
    pitchSeconds: raw.pitchSeconds ?? preset.pitchSeconds,
    replySeconds,
  };
}

function overlapScore(customerTags: string[], word: WordCard): number {
  let score = 0;
  for (const t of word.tags) {
    if (customerTags.includes(t)) score += 2;
  }
  return score;
}

/** 1–2 palabras afinadas al cliente + 1 comodín para forzar improvisación. */
export function pickInterestingWords(
  customer: Customer,
  count: 2 | 3,
  adultMode: boolean,
): string[] {
  const pool = wordPool(adultMode);
  const scored = pool
    .map((w) => ({ w, score: overlapScore(customer.tags, w) + Math.random() * 0.4 }))
    .sort((a, b) => b.score - a.score);

  const relatedCount = count === 2 ? 1 : 2;
  const related = scored.filter((s) => s.score >= 1.5).slice(0, relatedCount).map((s) => s.w);
  const used = new Set(related.map((w) => w.word));
  const wild = shuffle(pool.filter((w) => !used.has(w.word))).slice(0, count - related.length);
  const picked = [...related, ...wild];
  while (picked.length < count) {
    const extra = pool[randomInt(pool.length)]!;
    if (!picked.some((p) => p.word === extra.word)) picked.push(extra);
  }
  return shuffle(picked.slice(0, count)).map((w) => w.word);
}

function pickEvent(difficulty: Difficulty, chance: number): TwistEvent | null {
  if (Math.random() > chance) return null;
  const pool = eventsForDifficulty(difficulty);
  if (pool.length === 0) return null;
  return pool[randomInt(pool.length)]!;
}

export function dealRound(config: SnakeOilConfig, avoidCustomerId: string | null = null): RoundDeal {
  const customers = customerPool(config.adultMode);
  let customer = customers[randomInt(customers.length)]!;
  if (avoidCustomerId && customers.length > 1) {
    let guard = 0;
    while (customer.id === avoidCustomerId && guard < 12) {
      customer = customers[randomInt(customers.length)]!;
      guard += 1;
    }
  }

  const preset = formatPresets(config.format);
  const eventChance =
    config.format === 'quick' ? 0 : config.difficulty === 'hard' ? 0.7 : preset.forceEventChance;
  const secondChance =
    config.format === 'quick'
      ? 0
      : config.difficulty === 'hard'
        ? 0.55
        : config.difficulty === 'easy'
          ? 0.15
          : preset.secondObjectionChance;

  return {
    customer,
    words: pickInterestingWords(customer, config.wordCount, config.adultMode),
    event: pickEvent(config.difficulty, eventChance),
    forceSecondObjection: Math.random() < secondChance,
  };
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
    adaptation: 0,
    defense: 0,
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

export function customerHeadline(customer: Customer): string {
  return `${customer.emoji} ${customer.name}`;
}

export function difficultyLabel(d: Difficulty): string {
  if (d === 'easy') return 'Fácil';
  if (d === 'hard') return 'Difícil';
  return 'Normal';
}

export function combineRoundScore(aiScore: number, playerVoteAvg: number | null, aiWeight = 70): number {
  const ai = clamp100(aiScore);
  if (playerVoteAvg == null) return ai;
  const w = Math.max(0, Math.min(100, aiWeight)) / 100;
  return clamp100(ai * w + clamp100(playerVoteAvg) * (1 - w));
}

/** Combo: sube con respuestas fuertes; se rompe si la ronda es floja. */
export function nextCombo(current: number, evaluation: AiEvaluation): number {
  const d = evaluation.dimensions;
  const quality =
    d.persuasion * 0.25 +
    d.creativity * 0.2 +
    d.improvisation * 0.25 +
    d.adaptation * 0.15 +
    d.defense * 0.15;
  if (quality >= 72 || evaluation.customerBuyProbability >= 70) {
    return Math.min(8, current + 1);
  }
  if (quality >= 55) return current;
  return 0;
}

export function comboMultiplier(combo: number): number {
  if (combo <= 1) return 1;
  return Math.min(2, 1 + (combo - 1) * 0.12);
}

export function applyComboToScore(score: number, combo: number): number {
  return clamp100(score * comboMultiplier(combo));
}

export function detectBadges(evaluation: AiEvaluation, combo: number, hadHardTwist: boolean): BadgeId[] {
  const d = evaluation.dimensions;
  const badges: BadgeId[] = [];
  if (d.persuasion > 90) badges.push('nato_seller');
  if (d.improvisation >= 88 && hadHardTwist) badges.push('improv_mind');
  if (d.creativity >= 85 && evaluation.customerBuyProbability >= 70) badges.push('absurd_works');
  if (d.adaptation >= 88) badges.push('actor');
  if (d.defense >= 88 && hadHardTwist) badges.push('no_escape');
  if (d.coherence <= 45 && d.creativity >= 80 && d.humor >= 80) badges.push('nonsense');
  if (combo >= 3) badges.push('combo_king');
  if (evaluation.customerBuyProbability >= 85) badges.push('closer');
  if (d.creativity >= 92) badges.push('poet');
  if (evaluation.score >= 70 && d.defense >= 75 && hadHardTwist) badges.push('survivor');
  return [...new Set(badges)];
}

export function badgesFromIds(ids: BadgeId[]): Badge[] {
  return ids.map((id) => BADGE_CATALOG[id]).filter((b): b is Badge => Boolean(b));
}

export function emptyStats(): PersistentStats {
  return {
    gamesPlayed: 0,
    bestScore: 0,
    totalScore: 0,
    bestPersuasion: 0,
    bestCreativity: 0,
    bestImprovisation: 0,
    bestHumor: 0,
    bestBuyProbability: 0,
    bestCombo: 0,
    currentStreak: 0,
    bestStreak: 0,
    badges: [],
    customersBeaten: [],
  };
}

export function isPersistentStats(value: unknown): value is PersistentStats {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.gamesPlayed === 'number' && typeof s.bestScore === 'number';
}

export function updateStats(
  stats: PersistentStats,
  evaluation: AiEvaluation,
  combo: number,
  customerId: string,
): PersistentStats {
  const won = evaluation.customerBuyProbability >= 55 || evaluation.score >= 65;
  const streak = won ? stats.currentStreak + 1 : 0;
  const badges = [...new Set([...stats.badges, ...evaluation.badges])];
  const customersBeaten = won
    ? [...new Set([...stats.customersBeaten, customerId])]
    : stats.customersBeaten;
  return {
    gamesPlayed: stats.gamesPlayed + 1,
    bestScore: Math.max(stats.bestScore, evaluation.score),
    totalScore: stats.totalScore + evaluation.score,
    bestPersuasion: Math.max(stats.bestPersuasion, evaluation.dimensions.persuasion),
    bestCreativity: Math.max(stats.bestCreativity, evaluation.dimensions.creativity),
    bestImprovisation: Math.max(stats.bestImprovisation, evaluation.dimensions.improvisation),
    bestHumor: Math.max(stats.bestHumor, evaluation.dimensions.humor),
    bestBuyProbability: Math.max(stats.bestBuyProbability, evaluation.customerBuyProbability),
    bestCombo: Math.max(stats.bestCombo, combo),
    currentStreak: streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    badges,
    customersBeaten,
  };
}

export function pickObjectionKind(difficulty: Difficulty): string {
  const types = objectionTypesForDifficulty(difficulty);
  return types[randomInt(types.length)]!.id;
}

export function newRoundId(): string {
  return `r_${Date.now().toString(36)}_${randomInt(9999)}`;
}

export function soloPlayer(): { id: string; name: string; seat: number } {
  return { id: 'player-solo', name: 'Tú', seat: 0 };
}

/** Barras compactas para UI principal (análisis detallado aparte). */
export const PRIMARY_DIMS: Array<{ key: keyof DimensionScores; label: string }> = [
  { key: 'persuasion', label: 'Persuasión' },
  { key: 'creativity', label: 'Creatividad' },
  { key: 'improvisation', label: 'Improvisación' },
  { key: 'humor', label: 'Humor' },
  { key: 'adaptation', label: 'Adaptación' },
  { key: 'coherence', label: 'Coherencia' },
  { key: 'defense', label: 'Defensa' },
];

export function barFill(value: number): string {
  const filled = Math.round(value / 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
}
