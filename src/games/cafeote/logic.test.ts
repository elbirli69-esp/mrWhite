import { describe, expect, it } from 'vitest';
import { BINARY_PAIRS } from './data';
import {
  answerLabel,
  guessesMatch,
  isCustomPairValid,
  normalizeGuess,
  pickThinkerIndex,
  scoreRound,
  validateCafeOTeConfig,
  DEFAULT_CONFIG,
} from './logic';

describe('cafeote normalizeGuess', () => {
  it('ignora mayúsculas, tildes y puntuación', () => {
    expect(normalizeGuess('  Café!! ')).toBe('cafe');
    expect(normalizeGuess('José')).toBe('jose');
  });
});

describe('cafeote guessesMatch', () => {
  it('acepta variantes normales', () => {
    expect(guessesMatch('Rosalia', 'Rosalía')).toBe(true);
    expect(guessesMatch('bad bunny', 'Bad Bunny')).toBe(true);
    expect(guessesMatch('Messi', 'Ronaldo')).toBe(false);
  });
});

describe('cafeote scoreRound', () => {
  it('da 0 si falla', () => {
    expect(scoreRound(false, 3, 10)).toBe(0);
  });

  it('da bonus con pocas preguntas', () => {
    expect(scoreRound(true, 3, 10)).toBe(2);
    expect(scoreRound(true, 8, 10)).toBe(1);
  });
});

describe('cafeote validate', () => {
  it('acepta config por defecto', () => {
    expect(validateCafeOTeConfig(DEFAULT_CONFIG).valid).toBe(true);
  });

  it('rechaza jugadores fuera de rango', () => {
    expect(validateCafeOTeConfig({ ...DEFAULT_CONFIG, playerCount: 2 }).valid).toBe(false);
  });
});

describe('cafeote helpers', () => {
  it('rota el pensador', () => {
    expect(pickThinkerIndex(1, 4)).toBe(0);
    expect(pickThinkerIndex(2, 4)).toBe(1);
    expect(pickThinkerIndex(5, 4)).toBe(0);
  });

  it('etiqueta respuestas', () => {
    expect(answerLabel({ left: 'Café', right: 'Té', answer: 'left' })).toBe('Café');
    expect(answerLabel({ left: 'Café', right: 'Té', answer: 'both' })).toBe('Los dos');
  });

  it('valida pares libres', () => {
    expect(isCustomPairValid('Café', 'Té')).toBe(true);
    expect(isCustomPairValid('Café', 'café')).toBe(false);
    expect(isCustomPairValid('', 'Té')).toBe(false);
  });

  it('no repite opciones entre pares binarios', () => {
    const options: string[] = [];
    for (const pair of BINARY_PAIRS) {
      options.push(pair.left, pair.right);
    }
    expect(new Set(options).size).toBe(options.length);
  });
});
