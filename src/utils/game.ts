import { WORD_PAIRS } from '../data/words';
import type { GameConfig, Player, PlayerRole, SelectedWords } from '../types/game';

/** Mezcla un array in-place (Fisher–Yates) y lo devuelve. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Elige una pareja de palabras al azar. */
export function pickRandomWordPair(): SelectedWords {
  const index = Math.floor(Math.random() * WORD_PAIRS.length);
  const [normal, farsante] = WORD_PAIRS[index];
  return { normal, farsante };
}

/**
 * Asigna roles aleatorios sin repetición de asientos:
 * cada jugador recibe exactamente un rol.
 */
export function assignRoles(config: GameConfig): PlayerRole[] {
  const { playerCount, mrWhiteCount, farsanteCount } = config;
  const normalCount = playerCount - mrWhiteCount - farsanteCount;

  const roles: PlayerRole[] = [
    ...Array.from({ length: mrWhiteCount }, () => 'mrWhite' as const),
    ...Array.from({ length: farsanteCount }, () => 'farsante' as const),
    ...Array.from({ length: normalCount }, () => 'normal' as const),
  ];

  return shuffle(roles);
}

/** Crea la lista de jugadores con nombres, roles y palabras. */
export function createPlayers(
  config: GameConfig,
  words: SelectedWords,
  names: string[],
): Player[] {
  const roles = assignRoles(config);

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
