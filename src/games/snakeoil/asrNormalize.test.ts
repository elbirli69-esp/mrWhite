import { describe, expect, it } from 'vitest';
import { normalizeGameTranscript } from './asrNormalize';

describe('normalizeGameTranscript', () => {
  it('corrige plurales evidentes hacia el léxico', () => {
    const r = normalizeGameTranscript(
      'Un calcetines detector de dinosaurios',
      ['calcetín', 'dinosaurio', 'microondas'],
      'DinoSock',
    );
    expect(r.normalized.toLowerCase()).toMatch(/calcetín/);
    expect(r.hits.some((h) => h.to === 'calcetín')).toBe(true);
  });

  it('no reescribe frases sin relación con el léxico', () => {
    const r = normalizeGameTranscript(
      'Hola esto es una prueba de audio cualquiera',
      ['calcetín', 'dinosaurio'],
      'DinoSock',
    );
    expect(r.hits).toHaveLength(0);
    expect(r.normalized).toMatch(/prueba de audio/);
  });

  it('tolera errores tipográficos cercanos', () => {
    const r = normalizeGameTranscript('detecta dinosauro', ['dinosaurio'], 'X');
    expect(r.normalized.toLowerCase()).toContain('dinosaurio');
  });
});
