import { describe, expect, it } from 'vitest';
import {
  HABLAYA_WHISPER_BUILD,
  aggregateFileProgress,
  extractTranscriptText,
  pickWhisperModelId,
  resampleTo16k,
  toWhisperSamples,
} from './whisperLocal';

describe('HABLAYA_WHISPER_BUILD', () => {
  it('expone el stamp de la build actual (PWA)', () => {
    expect(HABLAYA_WHISPER_BUILD).toBe('local-whisper-6');
  });
});

describe('aggregateFileProgress', () => {
  it('pondera varios ficheros por bytes', () => {
    const files = new Map([
      ['a.onnx', { loaded: 50, total: 100 }],
      ['b.onnx', { loaded: 0, total: 100 }],
    ]);
    expect(aggregateFileProgress(files)).toBe(25);
  });

  it('devuelve 0 si no hay totales', () => {
    expect(aggregateFileProgress(new Map())).toBe(0);
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

describe('toWhisperSamples', () => {
  it('devuelve Float32Array con subarray (requisito del pipeline)', () => {
    const samples = toWhisperSamples(new Float32Array([0.1, 0.2, 0.3, 0.4]));
    expect(samples).toBeInstanceOf(Float32Array);
    expect(typeof samples.subarray).toBe('function');
    const slice = samples.subarray(1, 3);
    expect(slice.length).toBe(2);
    expect(slice[0]).toBeCloseTo(0.2, 5);
    expect(slice[1]).toBeCloseTo(0.3, 5);
  });

  it('convierte ArrayLike a Float32Array', () => {
    const samples = toWhisperSamples([0, 1, -1]);
    expect(samples).toBeInstanceOf(Float32Array);
    expect(Array.from(samples)).toEqual([0, 1, -1]);
  });

  it('no deja pasar un objeto tipo RawAudio (causa «subarray is not a function»)', () => {
    const wrapped = { data: new Float32Array([1, 2]), sampling_rate: 16_000 };
    // Si alguien pasara esto al pipeline, prepareAudios lo devolvería tal cual.
    expect(typeof (wrapped as { subarray?: unknown }).subarray).toBe('undefined');
    const fixed = toWhisperSamples(wrapped.data);
    expect(typeof fixed.subarray).toBe('function');
  });
});
