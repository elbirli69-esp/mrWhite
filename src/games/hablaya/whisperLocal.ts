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

/** Base multilingual: mucho mejor que tiny en castellano (~145 MB la 1ª vez). */
const MODEL_ID = 'Xenova/whisper-base';
const TARGET_RATE = 16_000;

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
  device: 'webgpu' | 'wasm',
  dtype: string,
): Promise<AsrPipeline> {
  const transformers = await import('@huggingface/transformers');
  transformers.env.allowLocalModels = false;
  transformers.env.useBrowserCache = true;

  const create = transformers.pipeline as unknown as (
    task: string,
    model: string,
    options?: Record<string, unknown>,
  ) => Promise<AsrPipeline>;
  return create('automatic-speech-recognition', MODEL_ID, { device, dtype });
}

async function getTranscriber(onStatus?: (msg: string) => void): Promise<AsrPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const preferGpu = await webgpuAvailable();
      if (preferGpu) {
        onStatus?.('Cargando Whisper base (WebGPU)…');
        try {
          const pipe = await loadPipeline('webgpu', 'fp32');
          loadedDevice = 'webgpu';
          return pipe;
        } catch (error) {
          console.warn('[hablaya] WebGPU falló, usando WASM', error);
        }
      }

      onStatus?.('Cargando Whisper base (WASM, puede tardar)…');
      const pipe = await loadPipeline('wasm', 'q8');
      loadedDevice = 'wasm';
      return pipe;
    })().catch((error) => {
      transcriberPromise = null;
      loadedDevice = null;
      throw error;
    });
  }
  return transcriberPromise;
}

function resampleTo16k(input: Float32Array, sampleRate: number): Float32Array {
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
 * Algunos navegadores fallan con decodeAudioData en webm “a medias”: hay fallback.
 */
export async function decodeBlobToWhisperAudio(blob: Blob): Promise<Float32Array> {
  if (blob.size < 256) {
    throw new Error('La grabación está vacía o es demasiado corta');
  }

  const tryDecode = async (data: ArrayBuffer): Promise<Float32Array> => {
    const audioCtx = new AudioContext();
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

  // Fallback: forzar decodificación cargando el blob en un elemento audio
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

    // Algunos webm vienen sin duración; igual intentamos decode del arrayBuffer otra vez
    // tras “tocar” el elemento (ayuda en Chrome).
    const buffer = await blob.arrayBuffer();
    return await tryDecode(buffer);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extractText(output: unknown): string {
  if (!output) return '';
  if (typeof output === 'string') return output.trim();
  if (Array.isArray(output)) {
    return output
      .map((item) => extractText(item))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if (typeof output === 'object') {
    const obj = output as { text?: unknown; chunks?: Array<{ text?: string }> };
    if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim();
    if (Array.isArray(obj.chunks)) {
      return obj.chunks
        .map((c) => (typeof c.text === 'string' ? c.text : ''))
        .join(' ')
        .trim();
    }
  }
  return '';
}

export function whisperDeviceLabel(): string | null {
  return loadedDevice;
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
    audio = await decodeBlobToWhisperAudio(blob);
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

  // return_timestamps: true es necesario para audios ≥ ~30s (chunking)
  let output: unknown;
  try {
    output = await transcriber(
      { data: audio, sampling_rate: TARGET_RATE },
      {
        language: 'spanish',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      },
    );
  } catch (error) {
    // Si el pipeline quedó a medias, permitir recargar
    transcriberPromise = null;
    loadedDevice = null;
    const detail = error instanceof Error ? error.message : 'error desconocido';
    throw new Error(`Falló Whisper local (${detail})`);
  }

  const text = extractText(output);
  if (!text) {
    throw new Error(
      'Whisper no sacó texto. Prueba a hablar más cerca del micrófono o escribe un resumen manual.',
    );
  }

  return { text, device: loadedDevice ?? 'wasm' };
}
