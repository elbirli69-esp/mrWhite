import { ADULT_WORD_PAIRS } from '../../data/adultWords';
import { WORD_PAIRS } from '../../data/words';
import { randomInt, shuffle } from '../../utils/game';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;
export const BOARD_SIZE = 25;
export const GRID_COLS = 5;
export const MIN_CLUE_COUNT = 1;
export const MAX_CLUE_COUNT = 5;

export type TeamColor = 'red' | 'blue';
export type CardKind = TeamColor | 'neutral' | 'assassin';

export interface CodigoSecretoConfig {
  playerCount: number;
  /** Pack malsonante / +18. */
  adultMode: boolean;
}

export const DEFAULT_CONFIG: CodigoSecretoConfig = {
  playerCount: 6,
  adultMode: false,
};

export type CodigoSecretoScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'reveal'
  | 'pass'
  | 'ready'
  | 'passClue'
  | 'clue'
  | 'passGuess'
  | 'guess'
  | 'end';

export interface CodigoSecretoPlayer {
  id: number;
  name: string;
  team: TeamColor;
  isSpymaster: boolean;
}

export interface BoardCard {
  id: number;
  word: string;
  kind: CardKind;
  revealed: boolean;
}

export interface CodigoSecretoDeal {
  cards: BoardCard[];
  startingTeam: TeamColor;
}

export interface ActiveClue {
  word: string;
  count: number;
}

export function validateCodigoSecretoConfig(
  config: CodigoSecretoConfig,
): { valid: boolean; error: string | null } {
  const { playerCount } = config;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  return { valid: true, error: null };
}

export function isCodigoSecretoConfig(value: unknown): value is CodigoSecretoConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    Number.isInteger(c.playerCount) &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

function wordPool(adultMode: boolean): string[] {
  const pairs = adultMode ? ADULT_WORD_PAIRS : WORD_PAIRS;
  const seen = new Set<string>();
  const words: string[] = [];
  for (const [a, b] of pairs) {
    for (const word of [a, b]) {
      const key = normalizeWord(word);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      words.push(word);
    }
  }
  return words;
}

export function normalizeWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function validateClue(word: string, count: number, cards: readonly BoardCard[]): string | null {
  const trimmed = word.trim();
  if (!trimmed) return 'Escribe una pista.';
  if (/\s/.test(trimmed)) return 'La pista debe ser una sola palabra.';
  if (!Number.isInteger(count) || count < MIN_CLUE_COUNT || count > MAX_CLUE_COUNT) {
    return `El número debe estar entre ${MIN_CLUE_COUNT} y ${MAX_CLUE_COUNT}.`;
  }
  const clueKey = normalizeWord(trimmed);
  if (cards.some((card) => !card.revealed && normalizeWord(card.word) === clueKey)) {
    return 'No puedes usar una palabra que esté en el tablero.';
  }
  return null;
}

export function buildKindLayout(startingTeam: TeamColor): CardKind[] {
  const other: TeamColor = startingTeam === 'red' ? 'blue' : 'red';
  return shuffle([
    ...Array.from({ length: 9 }, () => startingTeam),
    ...Array.from({ length: 8 }, () => other),
    ...Array.from({ length: 7 }, () => 'neutral' as const),
    'assassin',
  ]);
}

export function createDeal(adultMode = false, startingTeam?: TeamColor): CodigoSecretoDeal {
  const team = startingTeam ?? (randomInt(2) === 0 ? 'red' : 'blue');
  const pool = wordPool(adultMode);
  if (pool.length < BOARD_SIZE) {
    throw new Error('No hay suficientes palabras para el tablero.');
  }
  const words = shuffle(pool).slice(0, BOARD_SIZE);
  const kinds = buildKindLayout(team);
  const cards = words.map((word, index) => ({
    id: index,
    word,
    kind: kinds[index]!,
    revealed: false,
  }));
  return { cards, startingTeam: team };
}

export function createPlayers(names: string[]): CodigoSecretoPlayer[] {
  const count = names.length;
  const redCount = Math.ceil(count / 2);
  const assignment: TeamColor[] = shuffle([
    ...Array.from({ length: redCount }, () => 'red' as const),
    ...Array.from({ length: count - redCount }, () => 'blue' as const),
  ]);

  const players: CodigoSecretoPlayer[] = assignment.map((team, index) => ({
    id: index + 1,
    name: names[index]?.trim() || `Jugador ${index + 1}`,
    team,
    isSpymaster: false,
  }));

  const firstRed = players.find((p) => p.team === 'red');
  const firstBlue = players.find((p) => p.team === 'blue');
  if (firstRed) firstRed.isSpymaster = true;
  if (firstBlue) firstBlue.isSpymaster = true;

  return players;
}

export function teamLabel(team: TeamColor): string {
  return team === 'red' ? 'Rojos' : 'Azules';
}

export function oppositeTeam(team: TeamColor): TeamColor {
  return team === 'red' ? 'blue' : 'red';
}

export function remainingForTeam(cards: readonly BoardCard[], team: TeamColor): number {
  return cards.filter((card) => card.kind === team && !card.revealed).length;
}

export function countRevealed(cards: readonly BoardCard[], kind: CardKind): number {
  return cards.filter((card) => card.kind === kind && card.revealed).length;
}

export type GuessOutcome =
  | { type: 'continue'; card: BoardCard; guessesLeft: number }
  | { type: 'endTurn'; card: BoardCard; nextTeam: TeamColor }
  | { type: 'win'; card: BoardCard; winner: TeamColor }
  | { type: 'assassin'; card: BoardCard; winner: TeamColor };

export function applyGuess(params: {
  cards: BoardCard[];
  cardId: number;
  activeTeam: TeamColor;
  guessesLeft: number;
}): { cards: BoardCard[]; outcome: GuessOutcome } | null {
  const { cards, cardId, activeTeam, guessesLeft } = params;
  if (guessesLeft <= 0) return null;
  const index = cards.findIndex((card) => card.id === cardId);
  if (index < 0) return null;
  const target = cards[index]!;
  if (target.revealed) return null;

  const nextCards = cards.map((card) =>
    card.id === cardId ? { ...card, revealed: true } : card,
  );
  const card = nextCards[index]!;

  if (card.kind === 'assassin') {
    return {
      cards: nextCards,
      outcome: { type: 'assassin', card, winner: oppositeTeam(activeTeam) },
    };
  }

  if (card.kind === activeTeam) {
    if (remainingForTeam(nextCards, activeTeam) === 0) {
      return {
        cards: nextCards,
        outcome: { type: 'win', card, winner: activeTeam },
      };
    }
    const left = guessesLeft - 1;
    if (left <= 0) {
      return {
        cards: nextCards,
        outcome: { type: 'endTurn', card, nextTeam: oppositeTeam(activeTeam) },
      };
    }
    return {
      cards: nextCards,
      outcome: { type: 'continue', card, guessesLeft: left },
    };
  }

  // Neutral u otro equipo: fin de turno (y posible victoria del rival).
  if (card.kind === 'red' || card.kind === 'blue') {
    if (remainingForTeam(nextCards, card.kind) === 0) {
      return {
        cards: nextCards,
        outcome: { type: 'win', card, winner: card.kind },
      };
    }
  }

  return {
    cards: nextCards,
    outcome: { type: 'endTurn', card, nextTeam: oppositeTeam(activeTeam) },
  };
}

export function cardTone(kind: CardKind, revealed: boolean, showKey: boolean): string {
  if (!revealed && !showKey) {
    return 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]';
  }
  switch (kind) {
    case 'red':
      return revealed
        ? 'border-rose-400/50 bg-rose-500/35 text-rose-50'
        : 'border-rose-400/40 bg-rose-500/15 text-rose-100';
    case 'blue':
      return revealed
        ? 'border-sky-400/50 bg-sky-500/35 text-sky-50'
        : 'border-sky-400/40 bg-sky-500/15 text-sky-100';
    case 'neutral':
      return revealed
        ? 'border-stone-400/40 bg-stone-500/30 text-stone-100'
        : 'border-stone-400/30 bg-stone-500/10 text-stone-200';
    case 'assassin':
      return revealed
        ? 'border-zinc-200/40 bg-zinc-950 text-zinc-100'
        : 'border-zinc-400/50 bg-zinc-900/80 text-zinc-100';
    default:
      return 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]';
  }
}
