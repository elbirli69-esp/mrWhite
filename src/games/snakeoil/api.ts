import { transcribeLocally } from '../hablaya/whisperLocal';
import { normalizeGameTranscript } from './asrNormalize';
import type { PipelineTracker } from './pipelineMetrics';
import type { AiEvaluation, BadgeId, Customer, ConversationTurn, Difficulty, MatchFormat } from './types';
import { buildSnakeOilWhisperPrompt, snakeOilLexicon } from './whisperContext';

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
  extras: {
    customer?: Customer;
    words?: string[];
    productName?: string;
    preferFinalQuality?: boolean;
    tracker?: PipelineTracker;
  } = {},
): Promise<string> {
  const productName = extras.productName ?? hint;
  const words = extras.words ?? [];
  const prompt =
    extras.customer
      ? buildSnakeOilWhisperPrompt({
          customer: extras.customer,
          productName,
          words,
        })
      : undefined;
  const lexicon = snakeOilLexicon({
    words,
    productName,
    customerName: extras.customer?.name,
  });

  extras.tracker?.mark('finalWhisperStartMs');
  const local = await transcribeLocally(blob, onStatus, productName, {
    prompt,
    lexicon,
    preferFinalQuality: extras.preferFinalQuality ?? true,
  });
  extras.tracker?.mark('finalWhisperDoneMs');
  extras.tracker?.setMeta({
    usedFinalPass: true,
    audioSec: local.audioSec,
  });

  const normalized = normalizeGameTranscript(local.text, words, productName);
  extras.tracker?.setMeta({ normalizedHits: normalized.hits.length });
  return normalized.normalized || local.text;
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
  tracker?: PipelineTracker;
}): Promise<ApiResult<{ objection: string; kind: string }>> {
  try {
    input.tracker?.mark('deepseekStartMs');
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
    input.tracker?.mark('deepseekDoneMs');
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
    winningStyle:
      ((typeof raw.winningStyle === 'string'
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
  tracker?: PipelineTracker;
}): Promise<ApiResult<AiEvaluation>> {
  try {
    input.tracker?.mark('deepseekStartMs');
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
    input.tracker?.mark('deepseekDoneMs');
    const evaluation = normalizeEvaluation((data.evaluation ?? {}) as Record<string, unknown>);
    if (!evaluation) return { ok: false, error: 'Evaluación incompleta' };
    return { ok: true, data: evaluation };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Sin conexión' };
  }
}

/**
 * Híbrido: live provisional (UI) + pase final de calidad sobre el blob
 * + normalización controlada del léxico del juego.
 */
export async function pitchToObjection(input: {
  blob: Blob;
  liveTranscript?: string;
  customer: Customer;
  words: string[];
  productName: string;
  difficulty: Difficulty;
  objectionKindHint?: string;
  onStatus?: (msg: string) => void;
  onTranscript?: (text: string) => void;
  tracker?: PipelineTracker;
}): Promise<
  ApiResult<{ transcript: string; objection: string; kind: string; rawTranscript: string }>
> {
  let transcript = '';
  let rawTranscript = '';
  try {
    input.onStatus?.('📝 Procesando tu discurso…');
    rawTranscript = await transcribeBlob(input.blob, input.productName, (msg) => {
      if (msg.includes('Transcribiendo') || msg.includes('Audio')) {
        input.onStatus?.('🧠 Analizando tus argumentos…');
      } else {
        input.onStatus?.(msg);
      }
    }, {
      customer: input.customer,
      words: input.words,
      productName: input.productName,
      preferFinalQuality: true,
      tracker: input.tracker,
    });
    transcript = rawTranscript;
    // Si el pase final falla calidad pero el live era usable, no debería llegar aquí;
    // si el final está vacío, caemos al live.
    if (!transcript.trim() && input.liveTranscript?.trim()) {
      const fallback = normalizeGameTranscript(
        input.liveTranscript,
        input.words,
        input.productName,
      );
      transcript = fallback.normalized || input.liveTranscript;
      input.tracker?.setMeta({ usedFinalPass: false, normalizedHits: fallback.hits.length });
    }
    input.onTranscript?.(transcript);
  } catch (error) {
    if (input.liveTranscript?.trim()) {
      const fallback = normalizeGameTranscript(
        input.liveTranscript,
        input.words,
        input.productName,
      );
      transcript = fallback.normalized || input.liveTranscript;
      rawTranscript = input.liveTranscript;
      input.tracker?.setMeta({ usedFinalPass: false, normalizedHits: fallback.hits.length });
      input.onTranscript?.(transcript);
    } else {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Error al transcribir',
        transcript,
      };
    }
  }

  if (!transcript.trim()) {
    return { ok: false, error: 'Transcripción vacía', transcript };
  }

  input.onStatus?.('😈 El cliente está preparando una objeción…');
  const objection = await requestObjection({
    customer: input.customer,
    words: input.words,
    productName: input.productName,
    pitchTranscript: transcript,
    difficulty: input.difficulty,
    objectionKindHint: input.objectionKindHint,
    turn: 1,
    tracker: input.tracker,
  });
  if (!objection.ok) return { ok: false, error: objection.error, transcript };
  return {
    ok: true,
    data: {
      transcript,
      rawTranscript,
      objection: objection.data.objection,
      kind: objection.data.kind,
    },
  };
}
