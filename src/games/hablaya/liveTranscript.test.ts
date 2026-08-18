import { describe, expect, it } from 'vitest';
import { concatFloat32, stitchTranscript } from './liveTranscript';

describe('stitchTranscript', () => {
  it('concatena si no hay solape', () => {
    expect(stitchTranscript('Un avión sirve', 'para volar')).toBe('Un avión sirve para volar');
  });

  it('quita palabras repetidas en el borde', () => {
    expect(stitchTranscript('Un avión sirve para volar', 'para volar a alta velocidad')).toBe(
      'Un avión sirve para volar a alta velocidad',
    );
  });

  it('si el nuevo texto incluye el anterior, se queda con el más largo', () => {
    expect(stitchTranscript('Un avión', 'Un avión sirve para volar')).toBe('Un avión sirve para volar');
  });
});

describe('concatFloat32', () => {
  it('une buffers', () => {
    const out = concatFloat32(new Float32Array([1, 2]), new Float32Array([3]));
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });
});
