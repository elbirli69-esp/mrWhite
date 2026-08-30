import { describe, expect, it } from 'vitest';
import { SPYFALL_LOCATIONS } from './data';

describe('¿Dónde estamos? lugares', () => {
  it('cada lugar tiene 8 roles únicos', () => {
    for (const location of SPYFALL_LOCATIONS) {
      expect(location.roles).toHaveLength(8);
      expect(new Set(location.roles).size).toBe(8);
    }
  });

  it('no usa objetos como rol en cine o gimnasio', () => {
    const cine = SPYFALL_LOCATIONS.find((l) => l.id === 'cine');
    const gym = SPYFALL_LOCATIONS.find((l) => l.id === 'gimnasio');
    expect(cine?.roles).not.toContain('Palomitas');
    expect(gym?.roles).not.toContain('Principiantes');
  });
});
