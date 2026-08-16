import { transcribeLocally } from './whisperLocal';

export type HablaYaScoreResult = {
  ok: boolean;
  score?: number;
  feedback?: string;
  transcript?: string;
  error?: string;
};

/** Whisper local en el navegador + puntuación DeepSeek en el servidor. */
export async function evaluateRecording(input: {
  blob: Blob;
  category: string;
  topicMode: 'serious' | 'invented';
  durationSec: number;
  onStatus?: (msg: string) => void;
  /** Se llama en cuanto Whisper termina, antes de esperar a DeepSeek. */
  onTranscript?: (transcript: string) => void;
}): Promise<HablaYaScoreResult> {
  let transcript = '';
  try {
    const local = await transcribeLocally(input.blob, input.onStatus);
    transcript = local.text;
    input.onTranscript?.(transcript);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al transcribir';
    return { ok: false, error: message, transcript };
  }

  input.onStatus?.('Enviando a DeepSeek…');
  const scored = await scoreSpeech({
    transcript,
    category: input.category,
    topicMode: input.topicMode,
    durationSec: input.durationSec,
  });

  return { ...scored, transcript: scored.transcript ?? transcript };
}

/** Re-puntuar solo con texto (tras editar la transcripción). */
export async function scoreSpeech(input: {
  transcript: string;
  category: string;
  topicMode: 'serious' | 'invented';
  durationSec: number;
}): Promise<HablaYaScoreResult> {
  try {
    const response = await fetch('/api/hablaya', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as HablaYaScoreResult;
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.error || 'No se pudo evaluar', transcript: input.transcript };
    }
    return { ...data, transcript: data.transcript ?? input.transcript };
  } catch {
    return { ok: false, error: 'Sin conexión con el evaluador', transcript: input.transcript };
  }
}
