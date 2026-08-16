/** Grabación de audio para Habla ya (la transcripción la hace Whisper en el servidor). */

export type RecorderSession = {
  stop: () => Promise<{ blob: Blob }>;
};

export async function startRecorderSession(): Promise<RecorderSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
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
  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(250);

  return {
    stop: async () => {
      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Error de grabación'));
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        try {
          if (recorder.state !== 'inactive') recorder.stop();
          else resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
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
