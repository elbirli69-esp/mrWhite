import { WORD_PAIRS } from '../data/words';
import type { GameConfig, Player, PlayerRole, SelectedWords } from '../types/game';

/** Entero aleatorio en [0, max) con crypto si está disponible. */
function randomInt(max: number): number {
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

/** Elige una pareja de palabras al azar. */
export function pickRandomWordPair(): SelectedWords {
  const index = randomInt(WORD_PAIRS.length);
  const [normal, farsante] = WORD_PAIRS[index]!;
  return { normal, farsante };
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

/** Crea la lista de jugadores con nombres, roles y palabras. */
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
    if (role === 'normal') word = words.normal;
    if (role === 'farsante') word = words.farsante;

    const name = names[index]?.trim() || `Jugador ${index + 1}`;

    return {
      id: index + 1,
      name,
      role,
      word,
      eliminatedRound: null,
    };
  });
}

/** Vibración corta si el dispositivo lo soporta. */
export function vibrateReveal(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([30, 40, 30]);
    }
  } catch {
    // Algunos navegadores lanzan si la vibración no está permitida
  }
}
