import { describe, expect, it } from 'vitest';
import { ADULT_WORD_PAIRS } from './adultWords';
import {
  isAbstractWord,
  normalWordsForHeadsUp,
  normalWordsForJustOne,
  normalWordsForUnanimo,
  pairsForFakeArtist,
  wordsForCodigoSecreto,
} from './wordFilters';
import { WORD_PAIRS } from './words';

describe('wordFilters', () => {
  it('excluye abstractos del modo familiar en En la frente', () => {
    const words = normalWordsForHeadsUp(false);
    expect(words).not.toContain('Éxito');
    expect(words).not.toContain('Destino');
    expect(words.length).toBeGreaterThan(900);
  });

  it('excluye palabras largas en En la frente', () => {
    const words = normalWordsForHeadsUp(false);
    expect(words.every((w) => w.length <= 12)).toBe(true);
  });

  it('Sin repetir comparte reglas con En la frente', () => {
    expect(normalWordsForJustOne(false).length).toBe(normalWordsForHeadsUp(false).length);
  });

  it('Todos igual excluye abstractos en modo familiar', () => {
    const words = normalWordsForUnanimo(false);
    expect(words.every((w) => !isAbstractWord(w))).toBe(true);
    expect(words.length).toBeGreaterThan(1100);
  });

  it('Trazo falso deja un pool dibujable amplio', () => {
    const pairs = pairsForFakeArtist(false);
    expect(pairs.length).toBeGreaterThan(900);
    expect(pairs.every(([w]) => w.length <= 14)).toBe(true);
  });

  it('Pista y número limita longitud de tablero', () => {
    const words = wordsForCodigoSecreto(false);
    expect(words.length).toBeGreaterThan(1500);
    expect(words.every((w) => w.length <= 16)).toBe(true);
  });

  it('modo adulto mantiene pools jugables', () => {
    expect(normalWordsForHeadsUp(true).length).toBeGreaterThan(400);
    expect(pairsForFakeArtist(true).length).toBeGreaterThan(400);
    expect(wordsForCodigoSecreto(true).length).toBeGreaterThan(600);
  });

  it('no vacía el corpus base', () => {
    expect(WORD_PAIRS.length).toBe(1190);
    expect(ADULT_WORD_PAIRS.length).toBeGreaterThan(650);
  });
});
