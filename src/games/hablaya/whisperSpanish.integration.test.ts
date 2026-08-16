import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@huggingface/transformers';
import wavefile from 'wavefile';
import { describe, expect, it } from 'vitest';
import {
  HABLAYA_WHISPER_ASR_OPTIONS,
  extractTranscriptText,
  toWhisperSamples,
} from './whisperLocal';
import {
  countNiceToHave,
  hasAllMustHave,
  missingTokens,
  tokenRecall,
} from './transcriptScore';

const here = dirname(fileURLToPath(import.meta.url));

type Clip = {
  id: string;
  expected: string;
  mustHave: string[];
  niceToHave: string[];
  minRecall: number;
  file: string;
};

function loadWavFloat32(path: string): Float32Array {
  const { WaveFile } = wavefile as unknown as {
    WaveFile: new (buf: Buffer) => {
      toBitDepth: (d: string) => void;
      toSampleRate: (n: number) => void;
      getSamples: () => Float32Array | Float32Array[];
    };
  };
  const wav = new WaveFile(readFileSync(path));
  wav.toBitDepth('32f');
  wav.toSampleRate(16_000);
  let samples = wav.getSamples();
  if (Array.isArray(samples)) samples = samples[0]!;
  return toWhisperSamples(samples);
}

const clips = JSON.parse(readFileSync(join(here, 'fixtures/clips.json'), 'utf8')) as Clip[];

describe('Whisper castellano · clips controlados', () => {
  it(
    'whisper-base fp32 alcanza umbrales en clips Edge-TTS (misma config que Habla ya)',
    async () => {
      const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        dtype: 'fp32',
      });

      const report: Array<Record<string, unknown>> = [];

      for (const clip of clips) {
        const audio = loadWavFloat32(join(here, 'fixtures', clip.file));
        const output = await asr(audio, { ...HABLAYA_WHISPER_ASR_OPTIONS });
        const text = extractTranscriptText(output);
        const recall = tokenRecall(clip.expected, text);
        const nice = countNiceToHave(text, clip.niceToHave);
        const okMust = hasAllMustHave(text, clip.mustHave);
        const miss = missingTokens(clip.expected, text);

        report.push({
          id: clip.id,
          recall: Number(recall.toFixed(3)),
          mustHaveOk: okMust,
          niceHits: nice,
          text,
          miss,
        });

        expect(text.length, `${clip.id} vacío`).toBeGreaterThan(8);
        expect(okMust, `${clip.id} falta mustHave. Got: ${text}`).toBe(true);
        expect(recall, `${clip.id} recall ${recall} < ${clip.minRecall}. Got: ${text}`).toBeGreaterThanOrEqual(
          clip.minRecall,
        );
      }

      // eslint-disable-next-line no-console
      console.log('[hablaya fixtures]', JSON.stringify(report, null, 2));
    },
    300_000,
  );

  it(
    'fp32 supera a q8 en recall medio (regresión de calidad WASM)',
    async () => {
      const sample = clips.find((c) => c.id === 'avion')!;
      const audio = loadWavFloat32(join(here, 'fixtures', sample.file));

      const asrFp = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        dtype: 'fp32',
      });
      const asrQ8 = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        dtype: 'q8',
      });

      const textFp = extractTranscriptText(await asrFp(audio, { ...HABLAYA_WHISPER_ASR_OPTIONS }));
      const textQ8 = extractTranscriptText(await asrQ8(audio, { ...HABLAYA_WHISPER_ASR_OPTIONS }));
      const recallFp = tokenRecall(sample.expected, textFp);
      const recallQ8 = tokenRecall(sample.expected, textQ8);

      // eslint-disable-next-line no-console
      console.log('[hablaya dtype]', { recallFp, recallQ8, textFp, textQ8 });

      expect(recallFp).toBeGreaterThanOrEqual(0.7);
      // q8 a menudo alucina; exigimos que fp32 no sea peor de forma clara.
      expect(recallFp + 0.05).toBeGreaterThanOrEqual(recallQ8);
    },
    300_000,
  );
});
