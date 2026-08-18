/** Grabación de audio para Habla ya (PCM en vivo para Whisper + blob para reproducir). */

import { resampleTo16k } from './whisperLocal';

export type RecorderSession = {
  stop: () => Promise<{ blob: Blob }>;
};

export type LiveRecorderHandlers = {
  /** Trozos de audio ya a 16 kHz mono, según se habla. */
  onPcm?: (samples: Float32Array) => void;
};

const TARGET_RATE = 16_000;

export async function startRecorderSession(
  handlers: LiveRecorderHandlers = {},
): Promise<RecorderSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    },
  });

  const mimeCandidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  const mime = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
  const recorder = mime
    ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128_000 })
    : new MediaRecorder(stream, { audioBitsPerSecond: 128_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(1000);

  let audioCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let mute: GainNode | null = null;

  try {
    audioCtx = new AudioContext();
    await audioCtx.resume().catch(() => undefined);
    source = audioCtx.createMediaStreamSource(stream);
    processor = audioCtx.createScriptProcessor(4096, 1, 1);
    const nativeRate = audioCtx.sampleRate || 44_100;
    processor.onaudioprocess = (event) => {
      if (!handlers.onPcm) return;
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input);
      handlers.onPcm(nativeRate === TARGET_RATE ? copy : resampleTo16k(copy, nativeRate));
    };
    mute = audioCtx.createGain();
    mute.gain.value = 0;
    source.connect(processor);
    processor.connect(mute);
    mute.connect(audioCtx.destination);
  } catch (error) {
    console.warn('[hablaya] captura PCM en vivo no disponible', error);
  }

  return {
    stop: async () => {
      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Error de grabación'));
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        try {
          if (recorder.state !== 'inactive') {
            try {
              recorder.requestData();
            } catch {
              /* ignore */
            }
            recorder.stop();
          } else resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        } catch (error) {
          reject(error);
        }
      });

      try {
        processor?.disconnect();
        source?.disconnect();
        mute?.disconnect();
        await audioCtx?.close().catch(() => undefined);
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((t) => t.stop());
      return { blob };
    },
  };
}

export function transcriptLooksUsable(text: string): boolean {
  const cleaned = text
    .trim()
    .replace(/\(sin transcripción[^)]*\)/gi, '')
    .replace(/\s+/g, ' ');
  if (!cleaned) return false;
  const words = cleaned.split(' ').filter((w) => /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/.test(w));
  return words.length >= 3 || (words.length >= 2 && cleaned.length >= 20);
}

export function transcriptTooShortMessage(): string {
  return 'Escribe al menos un resumen de 3 palabras sobre lo que se ha dicho.';
}
