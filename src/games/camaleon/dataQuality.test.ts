import { describe, expect, it } from 'vitest';
import { CAMALEON_CATEGORIES } from './data';

describe('El Intruso tableros', () => {
  it('cada categoría tiene 16 palabras únicas', () => {
    for (const category of CAMALEON_CATEGORIES) {
      expect(category.words).toHaveLength(16);
      expect(new Set(category.words).size).toBe(16);
      expect(category.words.every((w) => w.trim().length > 0)).toBe(true);
    }
  });

  it('no repite palabras entre tableros', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const category of CAMALEON_CATEGORIES) {
      for (const word of category.words) {
        if (seen.has(word)) duplicates.push(word);
        seen.add(word);
      }
    }
    expect(duplicates).toEqual([]);
  });
});
