import { describe, expect, it } from 'vitest';
import {
  HABLAYA_WHISPER_BUILD,
  extractTranscriptText,
  pickWhisperModelId,
  resampleTo16k,
} from './whisperLocal';

describe('HABLAYA_WHISPER_BUILD', () => {
  it('expone el stamp de la build actual (PWA)', () => {
    expect(HABLAYA_WHISPER_BUILD).toBe('local-whisper-3');
  });
});

describe('pickWhisperModelId', () => {
  it('elige tiny en iPhone / Android', () => {
    expect(pickWhisperModelId({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })).toBe(
      'Xenova/whisper-tiny',
    );
    expect(pickWhisperModelId({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(
      'Xenova/whisper-tiny',
    );
  });

  it('elige tiny con poca RAM o pocos cores', () => {
    expect(
      pickWhisperModelId({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        deviceMemory: 4,
        hardwareConcurrency: 8,
      }),
    ).toBe('Xenova/whisper-tiny');

    expect(
      pickWhisperModelId({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        hardwareConcurrency: 4,
      }),
    ).toBe('Xenova/whisper-tiny');
  });

  it('elige base en escritorio capaz', () => {
    expect(
      pickWhisperModelId({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit',
        deviceMemory: 8,
        hardwareConcurrency: 8,
        saveData: false,
      }),
    ).toBe('Xenova/whisper-base');
  });

  it('elige tiny si saveData está activo', () => {
    expect(
      pickWhisperModelId({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        deviceMemory: 16,
        hardwareConcurrency: 16,
        saveData: true,
      }),
    ).toBe('Xenova/whisper-tiny');
  });
});

describe('extractTranscriptText', () => {
  it('lee string, objeto text y chunks', () => {
    expect(extractTranscriptText('  hola mundo  ')).toBe('hola mundo');
    expect(extractTranscriptText({ text: ' fútbol ' })).toBe('fútbol');
    expect(
      extractTranscriptText({
        chunks: [{ text: 'uno' }, { text: ' dos' }],
      }),
    ).toBe('uno  dos');
  });

  it('devuelve vacío si no hay texto', () => {
    expect(extractTranscriptText(null)).toBe('');
    expect(extractTranscriptText({})).toBe('');
    expect(extractTranscriptText({ chunks: [] })).toBe('');
  });
});

describe('resampleTo16k', () => {
  it('no cambia si ya está a 16 kHz', () => {
    const input = new Float32Array([0.1, -0.2, 0.3]);
    const out = resampleTo16k(input, 16_000);
    expect(out).toEqual(input);
  });

  it('reesamplea 8 kHz → 16 kHz duplicando longitud aprox.', () => {
    const input = new Float32Array([0, 1, 0, -1]);
    const out = resampleTo16k(input, 8_000);
    expect(out.length).toBe(8);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[out.length - 1]!).toBeCloseTo(-1, 5);
  });
});
