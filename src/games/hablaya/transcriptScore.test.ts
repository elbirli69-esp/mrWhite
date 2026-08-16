import { describe, expect, it } from 'vitest';
import {
  countNiceToHave,
  hasAllMustHave,
  missingTokens,
  normalizeTranscript,
  tokenRecall,
} from './transcriptScore';

describe('transcriptScore', () => {
  it('normaliza A320 y acentos', () => {
    expect(normalizeTranscript('El A 320 y el avión')).toContain('a320');
    expect(normalizeTranscript('Selección Española')).toBe('seleccion espanola');
  });

  it('calcula recall y must-have', () => {
    const expected = 'Un avión sirve para volar a alta velocidad';
    const hyp = 'Una avion sirve para volar a alta velocidad';
    expect(tokenRecall(expected, hyp)).toBeGreaterThan(0.8);
    expect(hasAllMustHave(hyp, ['volar', 'velocidad'])).toBe(true);
    expect(missingTokens(expected, 'hola')).toContain('avion');
    expect(countNiceToHave(hyp, ['avion', 'boeing'])).toBe(1);
  });
});
