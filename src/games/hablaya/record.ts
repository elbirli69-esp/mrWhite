/** Grabación de audio + transcripción vía Web Speech API (si está disponible). */

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

export async function startRecorderSession(
  onTranscript?: (text: string) => void,
): Promise<RecorderSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime =
    MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(250);

  let finalTranscript = '';
  let interimTranscript = '';
  let recognition: SpeechRecognitionLike | null = null;
  const Ctor = getSpeechRecognitionCtor();

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
      onTranscript?.(`${finalTranscript}${interimTranscript}`.trim());
    };
    recognition.onerror = () => {
      // Seguir grabando aunque falle la transcripción
    };
    recognition.onend = () => {
      // Si el navegador corta la sesión a mitad, reanudar mientras grabamos
      try {
        if (recorder.state === 'recording') recognition?.start();
      } catch {
        // ignore
      }
    };
    try {
      recognition.start();
    } catch {
      recognition = null;
    }
  }

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

      try {
        recognition?.stop();
      } catch {
        // ignore
      }
      stream.getTracks().forEach((t) => t.stop());

      const transcript = `${finalTranscript}${interimTranscript}`.trim();
      return { blob, transcript };
    },
  };
}
