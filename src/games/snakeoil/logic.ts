import { buildCustomerDeck, buildWordDeck } from './data';
import { shuffle } from '../../utils/game';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const HAND_SIZE = 6;
export const PRODUCT_WORDS = 2;
export const SECONDS_OPTIONS = [30, 45, 60] as const;
export const AI_WEIGHT_OPTIONS = [0, 25, 50, 75, 100] as const;

/** Quién decide el ganador de la ronda. */
export type JudgeMode = 'customer' | 'ai' | 'both';

export interface SnakeOilConfig {
  playerCount: number;
  secondsPerPitch: number;
  judgeMode: JudgeMode;
  /**
   * Si judgeMode === 'both': peso de la IA al sugerir (solo informativo en UI;
   * el cliente sigue eligiendo). Reservado por si se usa en desempates.
   */
  aiWeight: number;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: SnakeOilConfig = {
  playerCount: 4,
  secondsPerPitch: 30,
  judgeMode: 'both',
  aiWeight: 50,
  adultMode: false,
};

export type SnakeOilScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'pass'
  | 'customerReveal'
  | 'build'
  | 'pitch'
  | 'review'
  | 'pickWinner'
  | 'roundResult'
  | 'matchEnd';

export interface SnakeOilPlayer {
  id: number;
  name: string;
  /** Cartas de cliente ganadas. */
  score: number;
  hand: string[];
}

export interface PitchRecord {
  playerId: number;
  wordA: string;
  wordB: string;
  product: string;
  transcript: string;
  aiScore: number | null;
  aiFeedback: string | null;
  audioUrl: string | null;
}

export function validateConfig(config: SnakeOilConfig): { valid: boolean; error: string | null } {
  if (!Number.isInteger(config.playerCount) || config.playerCount < MIN_PLAYERS || config.playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (!(SECONDS_OPTIONS as readonly number[]).includes(config.secondsPerPitch)) {
    return { valid: false, error: 'Duración del pitch: 30, 45 o 60 segundos.' };
  }
  if (config.judgeMode !== 'customer' && config.judgeMode !== 'ai' && config.judgeMode !== 'both') {
    return { valid: false, error: 'Elige quién decide el ganador.' };
  }
  if (!(AI_WEIGHT_OPTIONS as readonly number[]).includes(config.aiWeight)) {
    return { valid: false, error: 'Peso de la IA no válido.' };
  }
  const words = buildWordDeck(config.adultMode);
  const need = config.playerCount * HAND_SIZE + config.playerCount * 4;
  if (words.length < need) {
    return { valid: false, error: 'No hay suficientes cartas de palabra para esta mesa.' };
  }
  if (buildCustomerDeck(config.adultMode).length < config.playerCount) {
    return { valid: false, error: 'No hay suficientes clientes para todos los jugadores.' };
  }
  return { valid: true, error: null };
}

export function isSnakeOilConfig(value: unknown): value is SnakeOilConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.secondsPerPitch === 'number' &&
    (c.judgeMode === 'customer' || c.judgeMode === 'ai' || c.judgeMode === 'both') &&
    typeof c.aiWeight === 'number' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function createPlayers(names: string[]): SnakeOilPlayer[] {
  return names.map((name, index) => ({
    id: index + 1,
    name: name.trim() || `Jugador ${index + 1}`,
    score: 0,
    hand: [],
  }));
}

export function productLabel(wordA: string, wordB: string): string {
  return `${wordA.trim()} ${wordB.trim()}`.replace(/\s+/g, ' ').trim();
}

export function dealHands(
  players: SnakeOilPlayer[],
  deck: string[],
): { players: SnakeOilPlayer[]; deck: string[] } {
  let remaining = [...deck];
  const nextPlayers = players.map((p) => {
    const hand = remaining.slice(0, HAND_SIZE);
    remaining = remaining.slice(HAND_SIZE);
    return { ...p, hand };
  });
  return { players: nextPlayers, deck: remaining };
}

export function refillHand(
  hand: string[],
  used: [string, string],
  deck: string[],
): { hand: string[]; deck: string[] } {
  const removeOne = (list: string[], word: string) => {
    const idx = list.indexOf(word);
    if (idx === -1) return list;
    return [...list.slice(0, idx), ...list.slice(idx + 1)];
  };
  let nextHand = removeOne(hand, used[0]);
  nextHand = removeOne(nextHand, used[1]);
  let remaining = [...deck];
  while (nextHand.length < HAND_SIZE && remaining.length > 0) {
    nextHand = [...nextHand, remaining[0]!];
    remaining = remaining.slice(1);
  }
  return { hand: nextHand, deck: remaining };
}

export function pickCustomer(deck: string[]): { customer: string; deck: string[] } {
  if (deck.length === 0) return { customer: 'Un cliente misterioso', deck: [] };
  return { customer: deck[0]!, deck: deck.slice(1) };
}

export function createMatchDecks(adultMode: boolean): {
  wordDeck: string[];
  customerDeck: string[];
} {
  return {
    wordDeck: shuffle(buildWordDeck(adultMode)),
    customerDeck: shuffle(buildCustomerDeck(adultMode)),
  };
}

export function ranking(players: SnakeOilPlayer[]): SnakeOilPlayer[] {
  return [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'));
}

/** Ganador por nota IA (empate → primero en orden de pitch). */
export function winnerByAi(pitches: PitchRecord[]): number | null {
  let bestId: number | null = null;
  let bestScore = -1;
  for (const pitch of pitches) {
    const score = pitch.aiScore;
    if (score == null) continue;
    if (score > bestScore) {
      bestScore = score;
      bestId = pitch.playerId;
    }
  }
  return bestId;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

export function sellerIds(players: SnakeOilPlayer[], customerId: number): number[] {
  return players.filter((p) => p.id !== customerId).map((p) => p.id);
}
