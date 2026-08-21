import { describe, expect, it } from 'vitest';
import { WORD_PAIRS } from '../data/words';
import { ADULT_WORD_PAIRS } from '../data/adultWords';

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñ ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return norm(s).split(' ').filter(Boolean);
}

/** Misma heurística que el generador: farsante no debe ser casi la misma palabra. */
function tooClose(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return true;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta[0] && tb[0] && ta[0] === tb[0] && ta[0].length >= 4) return true;
  if (na.length >= 4 && nb.length >= 4) {
    const stem = na.slice(0, Math.min(na.length, nb.length) - 1);
    if (
      stem.length >= 4 &&
      na.startsWith(stem) &&
      nb.startsWith(stem) &&
      Math.abs(na.length - nb.length) <= 2
    ) {
      return true;
    }
  }
  return false;
}

const SOUND_HINT =
  /^(ladrido|ronroneo|rugido|mugido|gruñido|ulular|cuac|arrullo|croar|sisear|zumbido|graznar)$/i;

describe('Mr White word pairs quality', () => {
  it('tiene el catálogo esperado', () => {
    expect(WORD_PAIRS.length).toBeGreaterThan(1000);
  });

  it('farsantes no son casi la misma palabra', () => {
    const close = WORD_PAIRS.filter(([normal, farsante]) => tooClose(normal, farsante));
    expect(close).toEqual([]);
  });

  it('pistas no son sonidos ni rasgos delatores clásicos', () => {
    const bad = WORD_PAIRS.filter(([, , hint]) => SOUND_HINT.test(hint.trim()));
    expect(bad).toEqual([]);
  });

  it('ejemplos clave están a distancia media', () => {
    const byNormal = new Map(WORD_PAIRS.map((p) => [p[0], p]));
    expect(byNormal.get('Rana')).toEqual(['Rana', 'Tritón', 'Charca de noche']);
    expect(byNormal.get('Perro')).toEqual(['Perro', 'Lobo', 'Parque al atardecer']);
    expect(byNormal.get('Elefante')).toEqual(['Elefante', 'Rinoceronte', 'Sabana seca']);
  });

  it('pack adulto sin farsantes idénticos', () => {
    const close = ADULT_WORD_PAIRS.filter(([normal, farsante]) => tooClose(normal, farsante));
    expect(close).toEqual([]);
  });
});
