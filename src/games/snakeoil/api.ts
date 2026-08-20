import { transcribeLocally } from '../hablaya/whisperLocal';

export type SnakeOilScoreResult = {
  ok: boolean;
  score?: number;
  feedback?: string;
  transcript?: string;
  error?: string;
};

/** Whisper local + puntuación DeepSeek (/api/snakeoil). */
export async function evaluatePitchRecording(input: {
  blob: Blob;
  customer: string;
  product: string;
  durationSec: number;
  onStatus?: (msg: string) => void;
  onTranscript?: (transcript: string) => void;
}): Promise<SnakeOilScoreResult> {
  let transcript = '';
  try {
    const local = await transcribeLocally(input.blob, input.onStatus, input.product);
    transcript = local.text;
    input.onTranscript?.(transcript);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al transcribir';
    return { ok: false, error: message, transcript };
  }

  input.onStatus?.('Enviando a DeepSeek…');
  const scored = await scorePitch({
    transcript,
    customer: input.customer,
    product: input.product,
    durationSec: input.durationSec,
  });

  return { ...scored, transcript: scored.transcript ?? transcript };
}

export async function scorePitch(input: {
  transcript: string;
  customer: string;
  product: string;
  durationSec: number;
}): Promise<SnakeOilScoreResult> {
  try {
    const response = await fetch('/api/snakeoil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as SnakeOilScoreResult;
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.error || 'No se pudo evaluar', transcript: input.transcript };
    }
    return { ...data, transcript: data.transcript ?? input.transcript };
  } catch {
    return { ok: false, error: 'Sin conexión con el evaluador', transcript: input.transcript };
  }
}
