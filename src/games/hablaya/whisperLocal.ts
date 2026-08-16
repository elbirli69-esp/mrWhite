/**
 * Whisper local en el navegador (Transformers.js + WebGPU, con fallback WASM).
 * Multilingüe (castellano). El modelo se descarga la primera vez y queda en caché.
 */

type AsrPipeline = (
  audio: Float32Array | string,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | Array<{ text?: string }>>;

let transcriberPromise: Promise<AsrPipeline> | null = null;
let loadedDevice: 'webgpu' | 'wasm' | null = null;

const MODEL_ID = 'Xenova/whisper-tiny';

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
  // Import dinámico para no hinchar el bundle inicial del hub
  const transformers = await import('@huggingface/transformers');
  transformers.env.allowLocalModels = false;
  transformers.env.useBrowserCache = true;

  // Cast: la unión de sobrecargas de pipeline es demasiado compleja para tsc
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
        onStatus?.('Cargando Whisper (WebGPU)…');
        try {
          const pipe = await loadPipeline('webgpu', 'fp32');
          loadedDevice = 'webgpu';
          return pipe;
        } catch (error) {
          console.warn('[hablaya] WebGPU falló, usando WASM', error);
        }
      }

      onStatus?.('Cargando Whisper (WASM)…');
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

/** Decodifica el blob de MediaRecorder a mono Float32 @ 16 kHz. */
export async function decodeBlobToWhisperAudio(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await audioCtx.close().catch(() => undefined);
  }

  const channelCount = decoded.numberOfChannels;
  const length = decoded.length;
  const mixed = new Float32Array(length);
  for (let c = 0; c < channelCount; c += 1) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < length; i += 1) {
      mixed[i]! += data[i]! / channelCount;
    }
  }

  const targetRate = 16000;
  if (decoded.sampleRate === targetRate) return mixed;

  const ratio = decoded.sampleRate / targetRate;
  const newLength = Math.max(1, Math.round(mixed.length / ratio));
  const resampled = new Float32Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const srcIndex = i * ratio;
    const left = Math.floor(srcIndex);
    const right = Math.min(left + 1, mixed.length - 1);
    const frac = srcIndex - left;
    resampled[i] = mixed[left]! * (1 - frac) + mixed[right]! * frac;
  }
  return resampled;
}

export function whisperDeviceLabel(): string | null {
  return loadedDevice;
}

/**
 * Transcribe audio en el dispositivo. Primera llamada descarga el modelo (~75 MB).
 */
export async function transcribeLocally(
  blob: Blob,
  onStatus?: (msg: string) => void,
): Promise<{ text: string; device: 'webgpu' | 'wasm' }> {
  onStatus?.('Preparando audio…');
  const audio = await decodeBlobToWhisperAudio(blob);
  if (audio.length < 1600) {
    throw new Error('Audio demasiado corto para transcribir');
  }

  const transcriber = await getTranscriber(onStatus);
  onStatus?.(
    loadedDevice === 'webgpu'
      ? 'Transcribiendo en el dispositivo (WebGPU)…'
      : 'Transcribiendo en el dispositivo (WASM)…',
  );

  const output = await transcriber(audio, {
    language: 'spanish',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });

  const raw = Array.isArray(output) ? output[0] : output;
  const text = (raw?.text ?? '').trim();
  if (!text) {
    throw new Error('Whisper local no devolvió texto (¿silencio?)');
  }

  return { text, device: loadedDevice ?? 'wasm' };
}
