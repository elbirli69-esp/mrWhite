import { describe, expect, it } from 'vitest';
import {
  evaluateGuess,
  hardModeViolation,
  isValidGuess,
  keyboardStatuses,
  normalizeWord,
  recordResult,
  emptyStats,
  validateAdivinaConfig,
  DEFAULT_CONFIG,
} from './logic';

describe('adivina normalizeWord', () => {
  it('quita tildes y pasa a mayúsculas', () => {
    expect(normalizeWord('árbol')).toBe('ARBOL');
    expect(normalizeWord('  Café ')).toBe('CAFE');
  });

  it('conserva Ñ (no la convierte en N)', () => {
    expect(normalizeWord('niño')).toBe('NIÑO');
    expect(normalizeWord('ÑANDU')).toBe('ÑANDU');
    expect(normalizeWord('mañana')).toBe('MAÑANA');
  });
});

describe('adivina evaluateGuess', () => {
  it('marca verdes exactos', () => {
    const row = evaluateGuess('CASAS', 'CASAS');
    expect(row.every((c) => c.status === 'correct')).toBe(true);
  });

  it('reparte amarillos sin repetir de más', () => {
    // solución A L A M O — intento A A A A A → solo 2 verdes/amarillos para A
    const row = evaluateGuess('AAAAA', 'ALAMO');
    const aStatuses = row.filter((c) => c.letter === 'A').map((c) => c.status);
    expect(aStatuses.filter((s) => s === 'correct' || s === 'present')).toHaveLength(2);
  });

  it('prioriza verde sobre amarillo con la misma letra', () => {
    const row = evaluateGuess('OSOOS', 'OSOSO');
    expect(row[0]?.status).toBe('correct');
    expect(row[1]?.status).toBe('correct');
  });
});

describe('adivina validación', () => {
  it('acepta palabras del diccionario', () => {
    expect(isValidGuess('perro', false)).toBe(true);
    expect(isValidGuess('XXXXX', false)).toBe(false);
  });

  it('valida config', () => {
    expect(validateAdivinaConfig(DEFAULT_CONFIG).valid).toBe(true);
    expect(validateAdivinaConfig({ ...DEFAULT_CONFIG, maxAttempts: 3 }).valid).toBe(false);
  });
});

describe('adivina hard mode', () => {
  it('exige verdes fijos', () => {
    const previous = [
      {
        word: 'PLATO',
        letters: evaluateGuess('PLATO', 'PLAYA'),
      },
    ];
    expect(hardModeViolation('PLUMA', previous)).toMatch(/posición/i);
    expect(hardModeViolation('PLAYA', previous)).toBeNull();
  });
});

describe('adivina stats y teclado', () => {
  it('actualiza racha y distribución', () => {
    const stats = recordResult(emptyStats(6), true, 3, 6);
    expect(stats.played).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.distribution[2]).toBe(1);

    const lost = recordResult(stats, false, 6, 6);
    expect(lost.currentStreak).toBe(0);
    expect(lost.wins).toBe(1);
  });

  it('fusiona estados del teclado', () => {
    const rows = [
      { word: 'CASCO', letters: evaluateGuess('CASCO', 'CALOR') },
      { word: 'CALOR', letters: evaluateGuess('CALOR', 'CALOR') },
    ];
    const keys = keyboardStatuses(rows);
    expect(keys.C).toBe('correct');
    expect(keys.A).toBe('correct');
  });
});
