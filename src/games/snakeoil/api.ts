import { transcribeLocally } from '../hablaya/whisperLocal';
import type { AiEvaluation, BadgeId, Customer, ConversationTurn, Difficulty, MatchFormat } from './types';

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

function customerPayload(customer: Customer) {
  return {
    name: customer.name,
    description: customer.description,
    personality: customer.personality,
    need: customer.need,
    secretConcern: customer.secretConcern,
    patience: customer.patience,
    skepticism: customer.skepticism,
    humor: customer.humor,
  };
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
  customer: Customer;
  words: string[];
  productName: string;
  pitchTranscript: string;
  difficulty: Difficulty;
  objectionKindHint?: string;
  turn?: 1 | 2;
  previousObjection?: string;
  previousReply?: string;
}): Promise<ApiResult<{ objection: string; kind: string }>> {
  try {
    const data = await postSnakeOil({
      action: 'objection',
      customer: customerPayload(input.customer),
      words: input.words,
      productName: input.productName,
      pitchTranscript: input.pitchTranscript,
      difficulty: input.difficulty,
      objectionKindHint: input.objectionKindHint,
      turn: input.turn ?? 1,
      previousObjection: input.previousObjection,
      previousReply: input.previousReply,
    });
    const objection = typeof data.objection === 'string' ? data.objection : '';
    if (!objection) return { ok: false, error: 'Objeción vacía' };
    return {
      ok: true,
      data: { objection, kind: typeof data.kind === 'string' ? data.kind : 'freeform' },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Sin conexión' };
  }
}

function normalizeEvaluation(raw: Record<string, unknown>): AiEvaluation | null {
  if (typeof raw.score !== 'number') return null;
  const dims = (raw.dimensions ?? {}) as Record<string, unknown>;
  const badges = Array.isArray(raw.badges)
    ? raw.badges.filter((b): b is BadgeId => typeof b === 'string')
    : [];
  return {
    score: raw.score,
    dimensions: {
      persuasion: Number(dims.persuasion ?? 0),
      creativity: Number(dims.creativity ?? 0),
      improvisation: Number(dims.improvisation ?? 0),
      coherence: Number(dims.coherence ?? 0),
      humor: Number(dims.humor ?? 0),
      adaptation: Number(dims.adaptation ?? dims.customerFit ?? 0),
      defense: Number(dims.defense ?? dims.objectionHandling ?? 0),
    },
    customerBuyProbability: Number(
      raw.customerBuyProbability ?? raw.customer_buy_probability ?? 0,
    ),
    strengths: Array.isArray(raw.strengths) ? (raw.strengths as string[]) : [],
    weaknesses: Array.isArray(raw.weaknesses) ? (raw.weaknesses as string[]) : [],
    bestMoment: typeof raw.bestMoment === 'string' ? raw.bestMoment : String(raw.best_moment ?? ''),
    funnyComment:
      typeof raw.funnyComment === 'string' ? raw.funnyComment : String(raw.funny_comment ?? ''),
    customerVerdict:
      typeof raw.customerVerdict === 'string'
        ? raw.customerVerdict
        : String(raw.customer_verdict ?? ''),
    label: typeof raw.label === 'string' ? raw.label : 'Vendedor',
    badges,
    winningStyle: ((typeof raw.winningStyle === 'string'
      ? raw.winningStyle
      : raw.winning_style) as AiEvaluation['winningStyle']) || 'balanced',
  };
}

export async function requestEvaluation(input: {
  customer: Customer;
  words: string[];
  productName: string;
  conversation: ConversationTurn[];
  pitchSeconds: number;
  replySeconds: number;
  difficulty: Difficulty;
  format: MatchFormat;
  eventTitle?: string;
}): Promise<ApiResult<AiEvaluation>> {
  try {
    const data = await postSnakeOil({
      action: 'evaluate',
      customer: customerPayload(input.customer),
      words: input.words,
      productName: input.productName,
      conversation: input.conversation,
      pitchSeconds: input.pitchSeconds,
      replySeconds: input.replySeconds,
      difficulty: input.difficulty,
      format: input.format,
      eventTitle: input.eventTitle,
    });
    const evaluation = normalizeEvaluation((data.evaluation ?? {}) as Record<string, unknown>);
    if (!evaluation) return { ok: false, error: 'Evaluación incompleta' };
    return { ok: true, data: evaluation };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Sin conexión' };
  }
}

export async function pitchToObjection(input: {
  blob: Blob;
  customer: Customer;
  words: string[];
  productName: string;
  difficulty: Difficulty;
  objectionKindHint?: string;
  onStatus?: (msg: string) => void;
  onTranscript?: (text: string) => void;
}): Promise<ApiResult<{ transcript: string; objection: string; kind: string }>> {
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

  input.onStatus?.('El cliente está pensando…');
  const objection = await requestObjection({
    customer: input.customer,
    words: input.words,
    productName: input.productName,
    pitchTranscript: transcript,
    difficulty: input.difficulty,
    objectionKindHint: input.objectionKindHint,
    turn: 1,
  });
  if (!objection.ok) return { ok: false, error: objection.error, transcript };
  return {
    ok: true,
    data: {
      transcript,
      objection: objection.data.objection,
      kind: objection.data.kind,
    },
  };
}
