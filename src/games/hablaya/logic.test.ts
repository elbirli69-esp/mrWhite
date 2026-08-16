import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  averageVotes,
  clampScore,
  combineScore,
  createPlayers,
  ranking,
  validateConfig,
} from './logic';

describe('validateConfig', () => {
  it('acepta la config por defecto', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toEqual({ valid: true, error: null });
  });

  it('rechaza pocos jugadores', () => {
    const result = validateConfig({ ...DEFAULT_CONFIG, playerCount: 1 });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Jugadores/);
  });

  it('exige suficientes categorías para rondas × jugadores', () => {
    const result = validateConfig({
      ...DEFAULT_CONFIG,
      playerCount: 10,
      rounds: 5,
      useBuiltInCategories: false,
      customCategories: ['Solo una'],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/categorías/);
  });
});

describe('scoring helpers', () => {
  it('clampScore limita a 0–10', () => {
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(11)).toBe(10);
    expect(clampScore(7.26)).toBe(7.3);
  });

  it('averageVotes ignora vacío y media redondeada', () => {
    expect(averageVotes({})).toBeNull();
    expect(averageVotes({ 1: 8, 2: 6 })).toBe(7);
  });

  it('combineScore mezcla IA y votos con peso', () => {
    expect(
      combineScore({
        evalMode: 'both',
        aiWeight: 50,
        aiScore: 8,
        votes: { 1: 6, 2: 6 },
      }),
    ).toBe(7);

    expect(
      combineScore({
        evalMode: 'ai',
        aiWeight: 100,
        aiScore: 9,
        votes: { 1: 2 },
      }),
    ).toBe(9);

    expect(
      combineScore({
        evalMode: 'votes',
        aiWeight: 0,
        aiScore: 9,
        votes: { 1: 4 },
      }),
    ).toBe(4);
  });

  it('combineScore usa la fuente disponible si falta la otra', () => {
    expect(
      combineScore({
        evalMode: 'both',
        aiWeight: 50,
        aiScore: 8,
        votes: {},
      }),
    ).toBe(8);

    expect(
      combineScore({
        evalMode: 'both',
        aiWeight: 50,
        aiScore: null,
        votes: { 1: 5 },
      }),
    ).toBe(5);
  });
});

describe('players', () => {
  it('createPlayers y ranking', () => {
    const players = createPlayers([' Ana ', '', 'Zoe']);
    expect(players[0]).toMatchObject({ id: 1, name: 'Ana', score: 0 });
    expect(players[1]?.name).toBe('Jugador 2');

    players[0]!.score = 3;
    players[2]!.score = 10;
    expect(ranking(players).map((p) => p.name)).toEqual(['Zoe', 'Ana', 'Jugador 2']);
  });
});
