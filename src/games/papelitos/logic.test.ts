import { describe, expect, it } from 'vitest';
import {
  buildPackSlips,
  makeTableSlips,
  normalizeSlip,
  poolFromCategories,
  validatePapelitosConfig,
  validatePlayerSlips,
  DEFAULT_CONFIG,
} from './logic';

describe('papelitos logic', () => {
  it('valida pack con categorías y cantidad', () => {
    expect(
      validatePapelitosConfig({
        ...DEFAULT_CONFIG,
        paperSource: 'pack',
        categoryIds: ['famosos'],
        packCount: 20,
      }).valid,
    ).toBe(true);
    expect(
      validatePapelitosConfig({
        ...DEFAULT_CONFIG,
        paperSource: 'pack',
        categoryIds: [],
        packCount: 20,
      }).valid,
    ).toBe(false);
  });

  it('valida modo mesa', () => {
    expect(
      validatePapelitosConfig({
        ...DEFAULT_CONFIG,
        paperSource: 'table',
        papersPerPlayer: 4,
      }).valid,
    ).toBe(true);
    expect(
      validatePapelitosConfig({
        ...DEFAULT_CONFIG,
        paperSource: 'table',
        papersPerPlayer: 1,
      }).valid,
    ).toBe(false);
  });

  it('arma pack sin duplicados', () => {
    const slips = buildPackSlips(['famosos', 'cine'], 24, false);
    expect(slips).toHaveLength(24);
    expect(new Set(slips.map((s) => normalizeSlip(s.text))).size).toBe(24);
  });

  it('rechaza papeles vacíos o repetidos de un jugador', () => {
    expect(validatePlayerSlips(['Ana', ''], 2).valid).toBe(false);
    expect(validatePlayerSlips(['Ana', 'ana'], 2).valid).toBe(false);
    expect(validatePlayerSlips(['Ana', 'Luis'], 2).valid).toBe(true);
  });

  it('crea papeles de mesa', () => {
    const slips = makeTableSlips([
      { playerId: 1, texts: ['Uno', 'Dos'] },
      { playerId: 2, texts: ['Tres'] },
    ]);
    expect(slips.map((s) => s.text)).toEqual(['Uno', 'Dos', 'Tres']);
  });

  it('el pool adult no se mezcla en modo normal', () => {
    const normal = poolFromCategories(['adult'], false);
    expect(normal).toHaveLength(0);
    const adult = poolFromCategories(['adult'], true);
    expect(adult.length).toBeGreaterThan(0);
  });
});
