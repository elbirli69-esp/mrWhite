import type { GameConfig, Player, PlayerRole, SelectedWords } from './game-types.js';
import { ADULT_WORD_PAIRS } from './adultWords.js';
import { WORD_PAIRS } from './words.js';

/** Entero aleatorio en [0, max) con crypto si está disponible. */
export function randomInt(max: number): number {
  if (max <= 0) return 0;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! % max;
  }
  return Math.floor(Math.random() * max);
}

/** Mezcla un array (Fisher–Yates) y lo devuelve. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Elige una pareja de palabras al azar (normal o +18). */
export function pickRandomWordPair(adultMode = false): SelectedWords {
  const pool = adultMode ? ADULT_WORD_PAIRS : WORD_PAIRS;
  const index = randomInt(pool.length);
  const [normal, farsante, hint] = pool[index]!;
  return { normal, farsante, hint };
}

/**
 * Elige al azar quién empieza a hablar.
 * Si se indica un id a evitar y hay más de un jugador, no lo repite.
 */
export function pickStartingPlayerId(
  players: Player[],
  avoidPlayerId: number | null = null,
): number {
  if (players.length === 0) return 0;

  const candidates =
    avoidPlayerId !== null && players.length > 1
      ? players.filter((p) => p.id !== avoidPlayerId)
      : players;

  const pool = candidates.length > 0 ? candidates : players;
  return pool[randomInt(pool.length)]!.id;
}

/** Elige un playerId (string) al azar para empezar a hablar. */
export function pickStartingPlayerIdString(
  playerIds: string[],
  avoidPlayerId: string | null = null,
): string {
  if (playerIds.length === 0) return '';

  const candidates =
    avoidPlayerId !== null && playerIds.length > 1
      ? playerIds.filter((id) => id !== avoidPlayerId)
      : playerIds;

  const pool = candidates.length > 0 ? candidates : playerIds;
  return pool[randomInt(pool.length)]!;
}

function buildRolePool(config: GameConfig): PlayerRole[] {
  const { playerCount, mrWhiteCount, farsanteCount } = config;
  const normalCount = playerCount - mrWhiteCount - farsanteCount;

  return [
    ...Array.from({ length: mrWhiteCount }, () => 'mrWhite' as const),
    ...Array.from({ length: farsanteCount }, () => 'farsante' as const),
    ...Array.from({ length: normalCount }, () => 'normal' as const),
  ];
}

function mrWhiteIndices(roles: PlayerRole[]): number[] {
  return roles.flatMap((role, index) => (role === 'mrWhite' ? [index] : []));
}

function sameIndices(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((value, i) => value === sortedB[i]);
}

/**
 * Asigna roles aleatorios. Si se pasan los índices Mr White de la partida anterior
 * y hay otras opciones posibles, evita repetir exactamente los mismos Mr White.
 */
export function assignRoles(
  config: GameConfig,
  previousMrWhiteIndices: number[] = [],
): PlayerRole[] {
  const pool = buildRolePool(config);
  const canAvoidRepeat =
    previousMrWhiteIndices.length > 0 &&
    config.mrWhiteCount > 0 &&
    config.mrWhiteCount < config.playerCount;

  let roles = shuffle(pool);

  if (canAvoidRepeat) {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      if (!sameIndices(mrWhiteIndices(roles), previousMrWhiteIndices)) {
        break;
      }
      roles = shuffle(pool);
    }
  }

  return roles;
}

/** Crea la lista de jugadores con nombres, roles y palabras (modo local). */
export function createPlayers(
  config: GameConfig,
  words: SelectedWords,
  names: string[],
  previousPlayers: Player[] = [],
): Player[] {
  const previousMrWhiteIndices =
    previousPlayers.length === names.length
      ? previousPlayers.flatMap((player, index) =>
          player.role === 'mrWhite' ? [index] : [],
        )
      : [];

  const roles = assignRoles(config, previousMrWhiteIndices);

  return roles.map((role, index) => {
    let word: string | null = null;
    let hint: string | null = null;
    if (role === 'normal') word = words.normal;
    if (role === 'farsante') word = words.farsante;
    if (role === 'mrWhite' && config.mrWhiteHasHints) hint = words.hint;

    const name = names[index]?.trim() || `Jugador ${index + 1}`;

    return {
      id: index + 1,
      name,
      role,
      word,
      hint,
      eliminatedRound: null,
    };
  });
}

export interface OnlineSeatDeal {
  playerId: string;
  name: string;
  role: PlayerRole;
  word: string | null;
  hint: string | null;
}

/** Reparte roles/palabras a asientos online (ids string). */
export function dealOnlineSeats(
  config: GameConfig,
  words: SelectedWords,
  seats: { playerId: string; name: string }[],
  previousMrWhitePlayerIds: string[] = [],
): OnlineSeatDeal[] {
  const previousMrWhiteIndices = seats.flatMap((seat, index) =>
    previousMrWhitePlayerIds.includes(seat.playerId) ? [index] : [],
  );

  const roles = assignRoles(config, previousMrWhiteIndices);

  return seats.map((seat, index) => {
    const role = roles[index]!;
    let word: string | null = null;
    let hint: string | null = null;
    if (role === 'normal') word = words.normal;
    if (role === 'farsante') word = words.farsante;
    if (role === 'mrWhite' && config.mrWhiteHasHints) hint = words.hint;

    return {
      playerId: seat.playerId,
      name: seat.name,
      role,
      word,
      hint,
    };
  });
}

/** Código de sala corto (A-Z0-9 sin ambigüos). */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 4): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]!;
  }
  return code;
}
