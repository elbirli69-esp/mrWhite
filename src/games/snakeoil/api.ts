import { transcribeLocally } from '../hablaya/whisperLocal';
import type { AiEvaluation } from './types';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; transcript?: string };

async function postSnakeOil(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/api/snakeoil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || data.ok === false) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Error del servidor');
  }
  return data;
}

export async function transcribeBlob(
  blob: Blob,
  hint: string,
  onStatus?: (msg: string) => void,
): Promise<string> {
  const local = await transcribeLocally(blob, onStatus, hint);
  return local.text;
}

export async function requestObjection(input: {
  customerTitle: string;
  customerNeed: string;
  words: string[];
  productName: string;
  pitchTranscript: string;
}): Promise<ApiResult<string>> {
  try {
    const data = await postSnakeOil({ action: 'objection', ...input });
    const objection = typeof data.objection === 'string' ? data.objection : '';
    if (!objection) return { ok: false, error: 'Objeción vacía' };
    return { ok: true, data: objection };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Sin conexión' };
  }
}

export async function requestEvaluation(input: {
  customerTitle: string;
  customerNeed: string;
  words: string[];
  productName: string;
  pitchTranscript: string;
  objection: string;
  replyTranscript: string;
  pitchSeconds: number;
  replySeconds: number;
}): Promise<ApiResult<AiEvaluation>> {
  try {
    const data = await postSnakeOil({ action: 'evaluate', ...input });
    const evaluation = data.evaluation as AiEvaluation | undefined;
    if (!evaluation || typeof evaluation.score !== 'number') {
      return { ok: false, error: 'Evaluación incompleta' };
    }
    return { ok: true, data: evaluation };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Sin conexión' };
  }
}

/** Transcribe audio y pide objeción. */
export async function pitchToObjection(input: {
  blob: Blob;
  customerTitle: string;
  customerNeed: string;
  words: string[];
  productName: string;
  onStatus?: (msg: string) => void;
  onTranscript?: (text: string) => void;
}): Promise<ApiResult<{ transcript: string; objection: string }>> {
  let transcript = '';
  try {
    transcript = await transcribeBlob(input.blob, input.productName, input.onStatus);
    input.onTranscript?.(transcript);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error al transcribir',
      transcript,
    };
  }

  input.onStatus?.('Inventando objeción…');
  const objection = await requestObjection({
    customerTitle: input.customerTitle,
    customerNeed: input.customerNeed,
    words: input.words,
    productName: input.productName,
    pitchTranscript: transcript,
  });
  if (!objection.ok) return { ok: false, error: objection.error, transcript };
  return { ok: true, data: { transcript, objection: objection.data } };
}
