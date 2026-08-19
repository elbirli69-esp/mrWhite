import { shuffle } from '../../utils/game';
import { PAPER_CATEGORIES, categoriesForMode } from './data';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;
export const MIN_PAPERS_PER_PLAYER = 2;
export const MAX_PAPERS_PER_PLAYER = 8;
export const MIN_PACK_COUNT = 12;
export const MAX_PACK_COUNT = 40;

export type PaperSource = 'table' | 'pack';
export type RoundKind = 'describe' | 'oneWord' | 'mime';

export interface PapelitosConfig {
  playerCount: number;
  paperSource: PaperSource;
  /** Cuántos papeles escribe cada jugador (modo mesa). */
  papersPerPlayer: number;
  /** Cuántos papeles sacar del pack. */
  packCount: number;
  /** Ids de categorías seleccionadas (modo pack). */
  categoryIds: string[];
  turnSeconds: number;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: PapelitosConfig = {
  playerCount: 6,
  paperSource: 'pack',
  papersPerPlayer: 4,
  packCount: 24,
  categoryIds: ['famosos', 'cine'],
  turnSeconds: 60,
  adultMode: false,
};

export type PapelitosScreen =
  | 'home'
  | 'config'
  | 'names'
  | 'write'
  | 'passWrite'
  | 'ready'
  | 'roundIntro'
  | 'passTurn'
  | 'play'
  | 'turnEnd'
  | 'matchEnd';

export interface PapelitosPlayer {
  id: number;
  name: string;
  team: 0 | 1;
}

export interface Slip {
  id: string;
  text: string;
}

export const ROUND_ORDER: RoundKind[] = ['describe', 'oneWord', 'mime'];

export function roundTitle(kind: RoundKind): string {
  switch (kind) {
    case 'describe':
      return 'Ronda 1 · Describir';
    case 'oneWord':
      return 'Ronda 2 · Una palabra';
    case 'mime':
      return 'Ronda 3 · Mímica';
    default:
      return kind;
  }
}

export function roundRules(kind: RoundKind): string {
  switch (kind) {
    case 'describe':
      return 'Podéis hablar libremente, pero no decir la palabra ni traducciones obvias.';
    case 'oneWord':
      return 'Solo una palabra por papel. Sin gestos de deletrear.';
    case 'mime':
      return 'Solo mímica. Sin hablar ni hacer sonidos.';
    default:
      return '';
  }
}

export function validatePapelitosConfig(config: PapelitosConfig): { valid: boolean; error: string | null } {
  const {
    playerCount,
    paperSource,
    papersPerPlayer,
    packCount,
    categoryIds,
    turnSeconds,
    adultMode,
  } = config;

  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return { valid: false, error: `Jugadores entre ${MIN_PLAYERS} y ${MAX_PLAYERS}.` };
  }
  if (paperSource !== 'table' && paperSource !== 'pack') {
    return { valid: false, error: 'Elige mesa o pack listo.' };
  }
  if (![30, 45, 60, 90].includes(turnSeconds)) {
    return { valid: false, error: 'Duración: 30, 45, 60 o 90 segundos.' };
  }

  if (paperSource === 'table') {
    if (
      !Number.isInteger(papersPerPlayer) ||
      papersPerPlayer < MIN_PAPERS_PER_PLAYER ||
      papersPerPlayer > MAX_PAPERS_PER_PLAYER
    ) {
      return {
        valid: false,
        error: `Papeles por jugador: ${MIN_PAPERS_PER_PLAYER}–${MAX_PAPERS_PER_PLAYER}.`,
      };
    }
  } else {
    if (!Number.isInteger(packCount) || packCount < MIN_PACK_COUNT || packCount > MAX_PACK_COUNT) {
      return { valid: false, error: `Papeles del pack: ${MIN_PACK_COUNT}–${MAX_PACK_COUNT}.` };
    }
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return { valid: false, error: 'Elige al menos una categoría.' };
    }
    const allowed = new Set(categoriesForMode(adultMode).map((c) => c.id));
    if (categoryIds.some((id) => !allowed.has(id))) {
      return { valid: false, error: 'Hay categorías no válidas para este modo.' };
    }
    const poolSize = poolFromCategories(categoryIds, adultMode).length;
    if (poolSize < packCount) {
      return {
        valid: false,
        error: `Con esas categorías solo hay ${poolSize} papeles. Baja la cantidad o añade categorías.`,
      };
    }
  }

  return { valid: true, error: null };
}

export function isPapelitosConfig(value: unknown): value is PapelitosConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.playerCount === 'number' &&
    (c.paperSource === 'table' || c.paperSource === 'pack') &&
    typeof c.papersPerPlayer === 'number' &&
    typeof c.packCount === 'number' &&
    Array.isArray(c.categoryIds) &&
    c.categoryIds.every((id) => typeof id === 'string') &&
    typeof c.turnSeconds === 'number' &&
    (c.adultMode === undefined || typeof c.adultMode === 'boolean')
  );
}

export function createPlayers(names: string[]): PapelitosPlayer[] {
  const count = names.length;
  const team0 = Math.ceil(count / 2);
  const teams = shuffle([
    ...Array.from({ length: team0 }, () => 0 as const),
    ...Array.from({ length: count - team0 }, () => 1 as const),
  ]);
  return teams.map((team, index) => ({
    id: index + 1,
    name: names[index]?.trim() || `Jugador ${index + 1}`,
    team,
  }));
}

export function teamLabel(team: 0 | 1): string {
  return team === 0 ? 'Equipo A' : 'Equipo B';
}

export function poolFromCategories(categoryIds: readonly string[], adultMode: boolean): string[] {
  const allowed = new Set(categoriesForMode(adultMode).map((c) => c.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of categoryIds) {
    if (!allowed.has(id)) continue;
    const cat = PAPER_CATEGORIES.find((c) => c.id === id);
    if (!cat) continue;
    for (const text of cat.slips) {
      const key = normalizeSlip(text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }
  }
  return out;
}

export function buildPackSlips(categoryIds: readonly string[], count: number, adultMode: boolean): Slip[] {
  const pool = shuffle(poolFromCategories(categoryIds, adultMode));
  return pool.slice(0, Math.min(count, pool.length)).map((text, index) => ({
    id: `pack-${index}-${normalizeSlip(text)}`,
    text,
  }));
}

export function normalizeSlip(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function makeTableSlips(entries: Array<{ playerId: number; texts: string[] }>): Slip[] {
  const slips: Slip[] = [];
  let n = 0;
  for (const entry of entries) {
    for (const raw of entry.texts) {
      const text = raw.trim();
      if (!text) continue;
      slips.push({
        id: `table-${entry.playerId}-${n}-${normalizeSlip(text)}`,
        text,
      });
      n += 1;
    }
  }
  return slips;
}

export function validatePlayerSlips(
  texts: string[],
  expected: number,
): { valid: boolean; error: string | null } {
  if (texts.length !== expected) {
    return { valid: false, error: `Haz falta escribir ${expected} papeles.` };
  }
  for (let i = 0; i < texts.length; i += 1) {
    if (!texts[i]?.trim()) {
      return { valid: false, error: `Falta el papel ${i + 1}.` };
    }
  }
  const keys = texts.map((t) => normalizeSlip(t));
  if (new Set(keys).size !== keys.length) {
    return { valid: false, error: 'No repitas el mismo papel.' };
  }
  return { valid: true, error: null };
}

/** Al acabar una ronda, todos los papeles vuelven al bote (barajados). */
export function refillBowl(allSlips: readonly Slip[]): Slip[] {
  return shuffle([...allSlips]);
}
