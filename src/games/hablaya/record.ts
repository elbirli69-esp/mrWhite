/** Grabación de audio para Habla ya (la transcripción la hace Whisper local en el navegador). */

export type RecorderSession = {
  stop: () => Promise<{ blob: Blob }>;
};

export async function startRecorderSession(): Promise<RecorderSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      // La supresión agresiva a veces “come” consonantes y Whisper confunde más.
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
  // Timeslice moderado: menos overhead que 250ms y no pierde el final.
  recorder.start(1000);

  return {
    stop: async () => {
      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Error de grabación'));
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        try {
          if (recorder.state !== 'inactive') {
            // Vaciar el buffer pendiente antes de stop.
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
