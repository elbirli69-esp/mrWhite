import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./whisperLocal', async () => {
  const actual = await vi.importActual<typeof import('./whisperLocal')>('./whisperLocal');
  return {
    ...actual,
    transcribeLocally: vi.fn(),
  };
});

import { evaluateRecording, scoreSpeech } from './api';
import { transcribeLocally } from './whisperLocal';

const transcribeMock = vi.mocked(transcribeLocally);

describe('evaluateRecording', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('devuelve error si Whisper local falla (sin llamar al score)', async () => {
    transcribeMock.mockRejectedValueOnce(new Error('Falló Whisper local (OOM)'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await evaluateRecording({
      blob: new Blob(['x'], { type: 'audio/webm' }),
      category: 'Fútbol',
      topicMode: 'serious',
      durationSec: 30,
    });

    expect(result).toEqual({
      ok: false,
      error: 'Falló Whisper local (OOM)',
      transcript: '',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('transcribe y puntúa cuando Whisper OK', async () => {
    const statuses: string[] = [];
    const transcripts: string[] = [];
    transcribeMock.mockResolvedValueOnce({ text: 'Hablé de Messi', device: 'wasm' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, score: 8, feedback: 'Bien' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await evaluateRecording({
      blob: new Blob(['x'], { type: 'audio/webm' }),
      category: 'Fútbol',
      topicMode: 'serious',
      durationSec: 30,
      onStatus: (msg) => statuses.push(msg),
      onTranscript: (text) => transcripts.push(text),
    });

    expect(result.ok).toBe(true);
    expect(result.transcript).toBe('Hablé de Messi');
    expect(result.score).toBe(8);
    expect(transcripts).toEqual(['Hablé de Messi']);
    expect(statuses).toContain('Enviando a DeepSeek…');
  });
});

describe('scoreSpeech', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propaga error de red', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const result = await scoreSpeech({
      transcript: 'texto',
      category: 'X',
      topicMode: 'invented',
      durationSec: 20,
    });
    expect(result).toEqual({
      ok: false,
      error: 'Sin conexión con el evaluador',
      transcript: 'texto',
    });
  });
});
