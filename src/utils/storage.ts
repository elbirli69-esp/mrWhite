import type { GameConfig } from '../types/game';
import { DEFAULT_CONFIG, MAX_PLAYERS, MIN_PLAYERS } from '../types/game';

const CONFIG_KEY = 'mr-white-config';
const NAMES_KEY = 'mr-white-names';

function isValidConfigShape(value: unknown): value is {
  playerCount: number;
  mrWhiteCount: number;
  farsanteCount: number;
  mrWhiteHasHints?: boolean;
} {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    typeof c.mrWhiteCount === 'number' &&
    typeof c.farsanteCount === 'number' &&
    Number.isInteger(c.playerCount) &&
    Number.isInteger(c.mrWhiteCount) &&
    Number.isInteger(c.farsanteCount) &&
    c.playerCount >= MIN_PLAYERS &&
    c.playerCount <= MAX_PLAYERS &&
    c.mrWhiteCount >= 0 &&
    c.farsanteCount >= 0 &&
    (c.mrWhiteHasHints === undefined || typeof c.mrWhiteHasHints === 'boolean')
  );
}

/** Lee la última configuración guardada o el valor por defecto. */
export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed: unknown = JSON.parse(raw);
    if (!isValidConfigShape(parsed)) return { ...DEFAULT_CONFIG };
    return {
      playerCount: parsed.playerCount,
      mrWhiteCount: parsed.mrWhiteCount,
      farsanteCount: parsed.farsanteCount,
      mrWhiteHasHints: parsed.mrWhiteHasHints ?? DEFAULT_CONFIG.mrWhiteHasHints,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Guarda la configuración en localStorage. */
export function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignorar errores de cuota / modo privado
  }
}

/** Lee los últimos nombres guardados. */
export function loadNames(playerCount: number): string[] {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (!raw) return defaultNames(playerCount);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultNames(playerCount);
    const names = parsed.filter((n): n is string => typeof n === 'string');
    return resizeNames(names, playerCount);
  } catch {
    return defaultNames(playerCount);
  }
}

/** Guarda los nombres en localStorage. */
export function saveNames(names: string[]): void {
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  } catch {
    // Ignorar
  }
}

export function defaultNames(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

/** Ajusta el array de nombres al número de jugadores. */
export function resizeNames(names: string[], count: number): string[] {
  if (names.length === count) return names;
  if (names.length > count) return names.slice(0, count);
  return [...names, ...Array.from({ length: count - names.length }, () => '')];
}

/** Comprueba que todos los nombres estén rellenos. */
export function validateNames(names: string[], expectedCount: number): string | null {
  if (names.length !== expectedCount) {
    return 'El número de nombres no coincide con los jugadores.';
  }
  for (let i = 0; i < names.length; i += 1) {
    if (!names[i]?.trim()) {
      return `Introduce el nombre del jugador ${i + 1}.`;
    }
  }
  return null;
}
