/**
 * Whisper local en el navegador (Transformers.js + WebGPU, con fallback WASM).
 * Multilingüe (castellano). El modelo se descarga la primera vez y queda en caché.
 */

type AsrPipeline = (
  audio: Float32Array | { data: Float32Array; sampling_rate: number } | string,
  options?: Record<string, unknown>,
) => Promise<unknown>;

let transcriberPromise: Promise<AsrPipeline> | null = null;
let loadedDevice: 'webgpu' | 'wasm' | null = null;
let loadedModelId: string | null = null;

const TARGET_RATE = 16_000;

/** Stamp para comprobar que el móvil no está con una PWA vieja. */
export const HABLAYA_WHISPER_BUILD = 'local-whisper-8';

/** Opciones ASR alineadas con producción (tests de fixtures las reutilizan). */
export const HABLAYA_WHISPER_ASR_OPTIONS = {
  language: 'spanish',
  task: 'transcribe',
  // 30s es el sweet-spot de Whisper; 20s con q8 alucinaba mucho en castellano.
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: true,
  max_new_tokens: 444,
  temperature: 0,
} as const;

export type DeviceHints = {
  userAgent?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
};

/**
 * Calidad > tamaño: tiny falla mucho en castellano (marcas, nombres…).
 * - Móvil / poca RAM: whisper-base
 * - Escritorio capaz: whisper-small
 */
export function pickWhisperModelId(hints: DeviceHints = {}): string {
  const ua = hints.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '') ?? '';
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const memory =
    hints.deviceMemory ??
    (typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined);
  const cores =
    hints.hardwareConcurrency ??
    (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined);
  const saveData =
    hints.saveData ??
    (typeof navigator !== 'undefined'
      ? Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
      : false);

  const lowMem = typeof memory === 'number' && memory <= 4;
  const fewCores = (cores || 8) <= 4;
  const constrained = mobileUa || lowMem || fewCores || Boolean(saveData);
  if (constrained) return 'Xenova/whisper-base';

  const ampleMem = typeof memory !== 'number' || memory >= 8;
  const ampleCores = (cores || 4) >= 6;
  if (ampleMem && ampleCores) return 'Xenova/whisper-small';
  return 'Xenova/whisper-base';
}

function modelShortName(modelId: string): string {
  if (modelId.includes('small')) return 'small';
  if (modelId.includes('base')) return 'base';
  return 'tiny';
}

function pickModelId(): string {
  return pickWhisperModelId();
}

async function webgpuAvailable(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}

async function loadPipeline(
  modelId: string,
  device: 'webgpu' | 'wasm',
  dtype: string,
  onProgress?: (info: {
    status: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  }) => void,
): Promise<AsrPipeline> {
  let transformers: typeof import('@huggingface/transformers');
  try {
    transformers = await import('@huggingface/transformers');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'error desconocido';
    throw new Error(
      `No se pudo cargar el motor Whisper (${detail}). Suele ser caché tras un deploy: cierra la pestaña y vuelve a abrir Habla ya.`,
    );
  }
  transformers.env.allowLocalModels = false;
  transformers.env.useBrowserCache = true;

  const create = transformers.pipeline as unknown as (
    task: string,
    model: string,
    options?: Record<string, unknown>,
  ) => Promise<AsrPipeline>;
  return create('automatic-speech-recognition', modelId, {
    device,
    dtype,
    progress_callback: onProgress
      ? (info: {
          status: string;
          file?: string;
          progress?: number;
          loaded?: number;
          total?: number;
        }) => onProgress(info)
      : undefined,
  });
}

/** Media de progreso 0–100 a partir de varios ficheros del modelo. */
export function aggregateFileProgress(
  files: Map<string, { loaded: number; total: number }>,
): number {
  let loaded = 0;
  let total = 0;
  for (const entry of files.values()) {
    loaded += entry.loaded;
    total += entry.total;
  }
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((100 * loaded) / total)));
}

export function isWhisperPipelineReady(): boolean {
  return Boolean(transcriberPromise && loadedDevice && loadedModelId);
}

export type WhisperPreloadHandlers = {
  onStatus?: (msg: string) => void;
  onProgress?: (percent: number) => void;
};

/**
 * Descarga y deja listo Whisper en el dispositivo (caché del navegador).
 * Seguro llamar varias veces: reutiliza la misma carga.
 */
export async function preloadWhisperLocal(
  handlers: WhisperPreloadHandlers = {},
): Promise<{ device: 'webgpu' | 'wasm'; modelId: string }> {
  const fileProgress = new Map<string, { loaded: number; total: number }>();
  const onFileProgress = (info: {
    status: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  }) => {
    if (info.status === 'progress' && info.file && typeof info.loaded === 'number' && typeof info.total === 'number') {
      fileProgress.set(info.file, { loaded: info.loaded, total: info.total });
      handlers.onProgress?.(aggregateFileProgress(fileProgress));
    } else if (info.status === 'initiate' && info.file) {
      handlers.onStatus?.(`Descargando ${info.file}…`);
    } else if (info.status === 'done' && info.file) {
      handlers.onStatus?.(`Listo: ${info.file}`);
    }
  };

  const pipe = await getTranscriber(handlers.onStatus, onFileProgress);
  void pipe;
  handlers.onProgress?.(100);
  handlers.onStatus?.(
    loadedDevice === 'webgpu' ? 'Whisper listo (WebGPU)' : 'Whisper listo (WASM)',
  );
  return { device: loadedDevice ?? 'wasm', modelId: loadedModelId ?? pickModelId() };
}

async function getTranscriber(
  onStatus?: (msg: string) => void,
  onFileProgress?: (info: {
    status: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  }) => void,
): Promise<AsrPipeline> {
  const modelId = pickModelId();
  if (transcriberPromise && loadedModelId !== modelId) {
    transcriberPromise = null;
    loadedDevice = null;
    loadedModelId = null;
  }

  if (!transcriberPromise) {
    const shortName = modelShortName(modelId);
    transcriberPromise = (async () => {
      const preferGpu = await webgpuAvailable();
      if (preferGpu) {
        onStatus?.(`Descargando Whisper ${shortName} (WebGPU)…`);
        try {
          const pipe = await loadPipeline(modelId, 'webgpu', 'fp32', onFileProgress);
          loadedDevice = 'webgpu';
          loadedModelId = modelId;
          return pipe;
        } catch (error) {
          console.warn('[hablaya] WebGPU falló, usando WASM', error);
        }
      }

      onStatus?.(
        shortName === 'small'
          ? 'Descargando Whisper small (WASM fp32, primera vez puede tardar)…'
          : `Descargando Whisper ${shortName} (WASM fp32)…`,
      );
      // q8 en WASM es inestable y baja mucho el recall en castellano (ver fixtures).
      const pipe = await loadPipeline(modelId, 'wasm', 'fp32', onFileProgress);
      loadedDevice = 'wasm';
      loadedModelId = modelId;
      return pipe;
    })().catch((error) => {
      transcriberPromise = null;
      loadedDevice = null;
      loadedModelId = null;
      throw error;
    });
  }
  return transcriberPromise;
}

export function resampleTo16k(input: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === TARGET_RATE) return input;
  const ratio = sampleRate / TARGET_RATE;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const resampled = new Float32Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const srcIndex = i * ratio;
    const left = Math.floor(srcIndex);
    const right = Math.min(left + 1, input.length - 1);
    const frac = srcIndex - left;
    resampled[i] = input[left]! * (1 - frac) + input[right]! * frac;
  }
  return resampled;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mixed = new Float32Array(length);
  const channelCount = buffer.numberOfChannels;
  for (let c = 0; c < channelCount; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) {
      mixed[i]! += data[i]! / channelCount;
    }
  }
  return mixed;
}

/**
 * Decodifica MediaRecorder (webm/mp4/ogg) a mono Float32 @ 16 kHz.
 */
export async function decodeBlobToWhisperAudio(blob: Blob): Promise<Float32Array> {
  if (blob.size < 256) {
    throw new Error('La grabación está vacía o es demasiado corta');
  }

  const tryDecode = async (data: ArrayBuffer): Promise<Float32Array> => {
    // Preferir 16 kHz desde el decode cuando el navegador lo permita.
    const audioCtx = new AudioContext({ sampleRate: TARGET_RATE });
    try {
      const decoded = await audioCtx.decodeAudioData(data.slice(0));
      return resampleTo16k(mixToMono(decoded), decoded.sampleRate);
    } finally {
      await audioCtx.close().catch(() => undefined);
    }
  };

  try {
    return await tryDecode(await blob.arrayBuffer());
  } catch (firstError) {
    console.warn('[hablaya] decodeAudioData falló, reintentando vía <audio>', firstError);
  }

  const url = URL.createObjectURL(blob);
  try {
    const audioEl = document.createElement('audio');
    audioEl.preload = 'auto';
    audioEl.src = url;
    await new Promise<void>((resolve, reject) => {
      audioEl.onloadedmetadata = () => resolve();
      audioEl.onerror = () => reject(new Error('No se pudo leer el audio grabado'));
      window.setTimeout(() => reject(new Error('Timeout al leer el audio')), 8000);
    });
    return await tryDecode(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function extractTranscriptText(output: unknown): string {
  if (!output) return '';
  if (typeof output === 'string') return output.trim();
  if (Array.isArray(output)) {
    return output
      .map((item) => extractTranscriptText(item))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (typeof output === 'object') {
    const obj = output as { text?: unknown; chunks?: Array<{ text?: string }> };
    const fromText = typeof obj.text === 'string' ? obj.text.trim() : '';
    const fromChunks = Array.isArray(obj.chunks)
      ? obj.chunks
          .map((c) => (typeof c.text === 'string' ? c.text : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      : '';
    // A veces `text` llega cortado y los chunks traen más contenido.
    return fromChunks.length > fromText.length ? fromChunks : fromText;
  }
  return '';
}

export function whisperDeviceLabel(): 'webgpu' | 'wasm' | null {
  return loadedDevice;
}

/**
 * Whisper exige Float32Array (con .subarray). No pasar { data, sampling_rate }:
 * prepareAudios de Transformers.js no lo desempaqueta y falla con «subarray is not a function».
 */
export function toWhisperSamples(audio: Float32Array | ArrayLike<number>): Float32Array {
  if (audio instanceof Float32Array) {
    // Copia propia: evita buffers desconectados / vistas raras del AudioContext.
    return new Float32Array(audio);
  }
  return new Float32Array(audio);
}

/**
 * Transcribe audio en el dispositivo. Primera llamada descarga el modelo.
 */
export async function transcribeLocally(
  blob: Blob,
  onStatus?: (msg: string) => void,
): Promise<{ text: string; device: 'webgpu' | 'wasm' }> {
  onStatus?.('Preparando audio…');
  let audio: Float32Array;
  try {
    audio = toWhisperSamples(await decodeBlobToWhisperAudio(blob));
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'error desconocido';
    throw new Error(`No se pudo decodificar el audio (${detail})`);
  }

  const durationSec = audio.length / TARGET_RATE;
  if (durationSec < 0.4) {
    throw new Error('Audio demasiado corto para transcribir');
  }

  onStatus?.(`Audio listo (~${durationSec.toFixed(1)}s). Cargando modelo…`);
  const transcriber = await getTranscriber(onStatus);
  onStatus?.(
    loadedDevice === 'webgpu'
      ? 'Transcribiendo en el dispositivo (WebGPU)…'
      : 'Transcribiendo en el dispositivo (WASM, paciencia)…',
  );

  let output: unknown;
  try {
    // Pasar Float32Array crudo (ya a 16 kHz). No usar { data, sampling_rate }.
    output = await transcriber(audio, { ...HABLAYA_WHISPER_ASR_OPTIONS });
  } catch (error) {
    transcriberPromise = null;
    loadedDevice = null;
    loadedModelId = null;
    const detail = error instanceof Error ? error.message : 'error desconocido';
    throw new Error(`Falló Whisper local (${detail})`);
  }

  const text = extractTranscriptText(output);
  if (!text) {
    throw new Error(
      'Whisper no sacó texto. Habla más cerca del micrófono o escribe un resumen manual.',
    );
  }

  return { text, device: loadedDevice ?? 'wasm' };
}
