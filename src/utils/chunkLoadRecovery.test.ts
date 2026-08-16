import { describe, expect, it } from 'vitest';
import {
  clearChunkReloadGuard,
  isChunkLoadFailure,
  shouldReloadForChunkError,
} from './chunkLoadRecovery';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

describe('chunkLoadRecovery', () => {
  it('detecta el error de chunk dinámico de Vite/PWA', () => {
    expect(
      isChunkLoadFailure(
        new Error(
          'Failed to fetch dynamically imported module: https://mr-white-omega.vercel.app/assets/transformers.web-BBL-Th-f.js',
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadFailure(new Error('Falló Whisper local (OOM)'))).toBe(false);
  });

  it('permite pocas recargas y luego corta', () => {
    const storage = memoryStorage();
    expect(shouldReloadForChunkError(storage)).toBe(true);
    expect(shouldReloadForChunkError(storage)).toBe(true);
    expect(shouldReloadForChunkError(storage)).toBe(false);
    clearChunkReloadGuard(storage);
    expect(shouldReloadForChunkError(storage)).toBe(true);
  });
});
