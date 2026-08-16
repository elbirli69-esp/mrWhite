import { pipeline } from '@huggingface/transformers';
import wavefile from 'wavefile';
import { describe, expect, it } from 'vitest';
import { extractTranscriptText, toWhisperSamples } from './whisperLocal';

const JFK_WAV =
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';

const JFK_ASR_OPTIONS = {
  language: 'english',
  task: 'transcribe',
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: true,
  max_new_tokens: 444,
  temperature: 0,
} as const;

async function loadJfkFloat32(): Promise<Float32Array> {
  const buffer = Buffer.from(await fetch(JFK_WAV).then((r) => r.arrayBuffer()));
  const { WaveFile } = wavefile as unknown as {
    WaveFile: new (buf: Buffer) => {
      toBitDepth: (d: string) => void;
      toSampleRate: (n: number) => void;
      getSamples: () => Float32Array | Float32Array[];
    };
  };
  const wav = new WaveFile(buffer);
  wav.toBitDepth('32f');
  wav.toSampleRate(16_000);
  let samples = wav.getSamples();
  if (Array.isArray(samples)) samples = samples[0]!;
  return toWhisperSamples(samples);
}

describe('Whisper integración real (JFK)', () => {
  it(
    'transcribe audio real con Float32Array y comprueba la salida',
    async () => {
      const audio = await loadJfkFloat32();
      expect(audio).toBeInstanceOf(Float32Array);
      expect(typeof audio.subarray).toBe('function');

      const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        dtype: 'fp32',
      });

      const output = await asr(audio, { ...JFK_ASR_OPTIONS });
      const text = extractTranscriptText(output).toLowerCase();

      expect(text).toMatch(/ask not|country|americans|fellow/);
      expect(text.length).toBeGreaterThan(40);
    },
    180_000,
  );

  it(
    'regresión: { data, sampling_rate } provoca subarray is not a function',
    async () => {
      const audio = await loadJfkFloat32();
      const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        dtype: 'fp32',
      });

      await expect(
        asr(
          { data: audio, sampling_rate: 16_000 } as unknown as Float32Array,
          { ...JFK_ASR_OPTIONS },
        ),
      ).rejects.toThrow(/subarray is not a function/);
    },
    180_000,
  );
});
