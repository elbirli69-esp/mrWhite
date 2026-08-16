/** Grabación de audio + intento de transcripción (Web Speech API). */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() != null;
}

export type RecorderSession = {
  stop: () => Promise<{ blob: Blob; transcript: string }>;
};

/**
 * Nota: en muchos móviles MediaRecorder y SpeechRecognition compiten por el micrófono
 * y la transcripción sale vacía. Por eso el juego admite resumen manual.
 */
export async function startRecorderSession(
  onTranscript?: (text: string) => void,
): Promise<RecorderSession> {
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

  let finalTranscript = '';
  let interimTranscript = '';
  let recognition: SpeechRecognitionLike | null = null;
  let wantRecognition = true;
  const Ctor = getSpeechRecognitionCtor();

  const publish = () => {
    onTranscript?.(`${finalTranscript}${interimTranscript}`.trim());
  };

  if (Ctor) {
    recognition = new Ctor();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]!;
        const piece = result[0]?.transcript ?? '';
        if (result.isFinal) finalTranscript += `${piece} `;
        else interim += piece;
      }
      interimTranscript = interim;
      publish();
    };
    recognition.onerror = () => {
      // Seguir grabando audio aunque falle el reconocimiento
    };
    recognition.onend = () => {
      if (!wantRecognition || recorder.state !== 'recording') return;
      window.setTimeout(() => {
        if (!wantRecognition || recorder.state !== 'recording' || !recognition) return;
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }, 120);
    };
    try {
      recognition.start();
    } catch {
      recognition = null;
      wantRecognition = false;
    }
  }

  return {
    stop: async () => {
      wantRecognition = false;

      const blobPromise = new Promise<Blob>((resolve, reject) => {
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

      // Dar un momento a que SpeechRecognition cierre resultados finales
      await new Promise<void>((resolve) => {
        if (!recognition) {
          resolve();
          return;
        }
        const previousOnEnd = recognition.onend;
        const done = () => {
          recognition!.onend = previousOnEnd;
          resolve();
        };
        recognition.onend = () => {
          done();
        };
        try {
          recognition.stop();
        } catch {
          try {
            recognition.abort();
          } catch {
            // ignore
          }
          done();
        }
        window.setTimeout(done, 600);
      });

      const blob = await blobPromise;
      stream.getTracks().forEach((t) => t.stop());

      const transcript = `${finalTranscript}${interimTranscript}`.trim();
      return { blob, transcript };
    },
  };
}

export function transcriptLooksUsable(text: string): boolean {
  const cleaned = text
    .trim()
    .replace(/\(sin transcripción[^)]*\)/gi, '')
    .replace(/\s+/g, ' ');
  // Al menos unas pocas palabras reales
  const words = cleaned.split(' ').filter((w) => w.length > 1);
  return words.length >= 4 || cleaned.length >= 24;
}
