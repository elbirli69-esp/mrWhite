import { concatFloat32, copyFloat32, stitchTranscript } from './liveTranscript';
import { transcribeSamples } from './whisperLocal';

const TARGET_RATE = 16_000;
/** ~6 s: primer parcial más rápido que 8 s sin perder contexto útil. */
export const LIVE_WINDOW_SEC = 6;
export const LIVE_OVERLAP_SEC = 1.5;
const WINDOW_SAMPLES = Math.round(TARGET_RATE * LIVE_WINDOW_SEC);
const OVERLAP_SAMPLES = Math.round(TARGET_RATE * LIVE_OVERLAP_SEC);

export type LiveWhisperTiming = {
  firstChunkQueuedAtMs?: number;
  firstResultAtMs?: number;
  windowsProcessed: number;
};

export type LiveWhisperController = {
  pushPcm: (samples: Float32Array) => void;
  flush: () => Promise<string>;
  getText: () => string;
  getTiming: () => LiveWhisperTiming;
};

/**
 * Acumula PCM a 16 kHz y transcribe ventanas mientras se habla.
 * El solape evita cortar palabras; el resultado se va uniendo.
 */
export function createLiveWhisperSession(input: {
  category: string;
  /** Prompt ASR opcional (p. ej. léxico Snake Oil). */
  prompt?: string;
  onUpdate: (text: string) => void;
  onFirstResult?: (msFromStart: number) => void;
}): LiveWhisperController {
  let pending: Float32Array = new Float32Array(0);
  let committed = '';
  let busy = false;
  let closed = false;
  const jobs: Float32Array[] = [];
  const startedAt = performance.now();
  const timing: LiveWhisperTiming = { windowsProcessed: 0 };
  let firstResultNotified = false;

  const pump = () => {
    if (busy || jobs.length === 0) return;
    const window = jobs.shift()!;
    busy = true;
    void transcribeSamples(window, {
      category: input.category,
      prompt: input.prompt,
      live: true,
    })
      .then((result) => {
        timing.windowsProcessed += 1;
        if (result.text.trim()) {
          if (!firstResultNotified) {
            firstResultNotified = true;
            timing.firstResultAtMs = performance.now() - startedAt;
            input.onFirstResult?.(timing.firstResultAtMs);
          }
          committed = stitchTranscript(committed, result.text);
          input.onUpdate(committed);
        }
      })
      .catch((error) => {
        console.warn('[hablaya] ventana en vivo falló', error);
      })
      .finally(() => {
        busy = false;
        pump();
      });
  };

  const enqueueReadyWindows = () => {
    if (closed) return;
    while (pending.length >= WINDOW_SAMPLES) {
      if (timing.firstChunkQueuedAtMs == null) {
        timing.firstChunkQueuedAtMs = performance.now() - startedAt;
      }
      jobs.push(copyFloat32(pending.subarray(0, WINDOW_SAMPLES)));
      pending = copyFloat32(pending.subarray(WINDOW_SAMPLES - OVERLAP_SAMPLES));
      pump();
    }
  };

  return {
    pushPcm(samples) {
      if (closed || samples.length === 0) return;
      pending = concatFloat32(pending, samples);
      enqueueReadyWindows();
    },
    async flush() {
      closed = true;
      if (pending.length / TARGET_RATE >= 0.45) {
        if (timing.firstChunkQueuedAtMs == null) {
          timing.firstChunkQueuedAtMs = performance.now() - startedAt;
        }
        jobs.push(copyFloat32(pending));
      }
      pending = new Float32Array(0);
      pump();
      while (busy || jobs.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      return committed;
    },
    getText: () => committed,
    getTiming: () => ({ ...timing }),
  };
}
