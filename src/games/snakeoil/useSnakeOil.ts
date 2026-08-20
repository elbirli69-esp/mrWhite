import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLiveWhisperSession, type LiveWhisperController } from '../hablaya/liveWhisper';
import {
  startRecorderSession,
  transcriptLooksUsable,
  transcriptTooShortMessage,
  type RecorderSession,
} from '../hablaya/record';
import { loadJson, saveJson } from '../shared/persist';
import { pitchToObjection, requestEvaluation, requestObjection, transcribeBlob } from './api';
import { normalizeGameTranscript } from './asrNormalize';
import {
  applyComboToScore,
  badgesFromIds,
  dealRound,
  detectBadges,
  emptyStats,
  formatPresets,
  isPersistentStats,
  isSnakeOilConfig,
  newRoundId,
  nextCombo,
  normalizeConfig,
  pickObjectionKind,
  soloPlayer,
  suggestProductName,
  updateStats,
  validateConfig,
} from './engine';
import {
  createPipelineTracker,
  isAsrDebugEnabled,
  type PipelineReport,
  type PipelineTracker,
} from './pipelineMetrics';
import type {
  AiEvaluation,
  Badge,
  BadgeId,
  ConversationTurn,
  Objection,
  PersistentStats,
  Round,
  Screen,
  SnakeOilConfig,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { buildSnakeOilWhisperPrompt } from './whisperContext';

const CONFIG_KEY = 'snakeoil-config-v3';
const STATS_KEY = 'snakeoil-stats-v3';
const COMBO_KEY = 'snakeoil-combo-v3';

type RecPhase = 'pitch' | 'reply' | 'event_reply';

interface State {
  screen: Screen;
  config: SnakeOilConfig;
  stats: PersistentStats;
  combo: number;
  round: Round | null;
  liveBadges: Badge[];
  statusMessage: string | null;
  error: string | null;
  recording: boolean;
  secondsLeft: number;
  phase: RecPhase;
  showAnalysis: boolean;
  /** Objeción actual mostrada en pantalla customer. */
  currentObjection: string;
  objectionTurn: 1 | 2;
  /** Fallo de ASR: ofrecer repetir pitch. */
  needsRetry: boolean;
  pipelineReport: PipelineReport | null;
  asrDebug: boolean;
}

function loadCombo(): number {
  try {
    const n = Number(localStorage.getItem(COMBO_KEY) ?? '0');
    return Number.isFinite(n) ? Math.max(0, Math.min(8, n)) : 0;
  } catch {
    return 0;
  }
}

function saveCombo(n: number) {
  try {
    localStorage.setItem(COMBO_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function initialState(): State {
  const raw =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isSnakeOilConfig)
      : { ...DEFAULT_CONFIG };
  const config = normalizeConfig(raw);
  return {
    screen: 'home',
    config,
    stats: typeof window !== 'undefined' ? loadJson(STATS_KEY, emptyStats(), isPersistentStats) : emptyStats(),
    combo: typeof window !== 'undefined' ? loadCombo() : 0,
    round: null,
    liveBadges: [],
    statusMessage: null,
    error: null,
    recording: false,
    secondsLeft: config.pitchSeconds,
    phase: 'pitch',
    showAnalysis: false,
    currentObjection: '',
    objectionTurn: 1,
    needsRetry: false,
    pipelineReport: null,
    asrDebug: typeof window !== 'undefined' ? isAsrDebugEnabled() : false,
  };
}

function customerFromRound(round: Round) {
  return round.deal.customer;
}

export function useSnakeOil() {
  const [state, setState] = useState<State>(initialState);
  const sessionRef = useRef<RecorderSession | null>(null);
  const liveRef = useRef<LiveWhisperController | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const roundRef = useRef<Round | null>(null);
  const configRef = useRef(state.config);
  const comboRef = useRef(state.combo);
  const trackerRef = useRef<PipelineTracker | null>(null);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
    configRef.current = state.config;
  }, [state.config]);

  useEffect(() => {
    saveJson(STATS_KEY, state.stats);
  }, [state.stats]);

  useEffect(() => {
    comboRef.current = state.combo;
    saveCombo(state.combo);
  }, [state.combo]);

  useEffect(() => {
    roundRef.current = state.round;
  }, [state.round]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      void sessionRef.current?.stop().catch(() => undefined);
    };
  }, []);

  const configValidation = useMemo(() => validateConfig(state.config), [state.config]);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const pushLiveBadge = useCallback((ids: BadgeId[]) => {
    if (!ids.length) return;
    setState((prev) => {
      const existing = new Set(prev.liveBadges.map((b) => b.id));
      const next = badgesFromIds(ids.filter((id) => !existing.has(id)));
      if (!next.length) return prev;
      return { ...prev, liveBadges: [...prev.liveBadges, ...next] };
    });
  }, []);

  const finalizeEvaluation = useCallback(
    async (round: Round, conversation: ConversationTurn[], tracker?: PipelineTracker | null) => {
      const config = configRef.current;
      setState((prev) => ({
        ...prev,
        screen: 'evaluating',
        statusMessage: '⚖️ Evaluando tu respuesta…',
        round: { ...round, conversation },
        needsRetry: false,
      }));

      const evaluation = await requestEvaluation({
        customer: round.deal.customer,
        words: round.deal.words,
        productName: round.product.name,
        conversation,
        pitchSeconds: config.pitchSeconds,
        replySeconds: config.replySeconds,
        difficulty: config.difficulty,
        format: config.format,
        eventTitle: round.deal.event?.title,
        tracker: tracker ?? undefined,
      });

      tracker?.mark('uiResultMs');
      const report = tracker?.report() ?? null;
      if (report && typeof console !== 'undefined') {
        console.info('[snakeoil pipeline]\n' + report.summary);
      }

      if (!evaluation.ok) {
        setState((prev) => ({
          ...prev,
          screen: 'result',
          error: evaluation.error || transcriptTooShortMessage(),
          statusMessage: null,
          pipelineReport: report,
          round: { ...round, conversation, evaluation: null },
        }));
        return;
      }

      const hadHardTwist = Boolean(round.deal.event) || round.objections.length > 1;
      const mergedBadges = [
        ...new Set([
          ...evaluation.data.badges,
          ...detectBadges(evaluation.data, comboRef.current + 1, hadHardTwist),
        ]),
      ] as BadgeId[];
      const comboAfter = nextCombo(comboRef.current, evaluation.data);
      const scored: AiEvaluation = {
        ...evaluation.data,
        score: applyComboToScore(evaluation.data.score, Math.max(comboRef.current, comboAfter)),
        badges: mergedBadges,
      };

      pushLiveBadge(mergedBadges);

      setState((prev) => ({
        ...prev,
        screen: 'result',
        combo: comboAfter,
        stats: updateStats(prev.stats, scored, comboAfter, round.deal.customer.id),
        statusMessage: null,
        error: null,
        showAnalysis: false,
        pipelineReport: report,
        needsRetry: false,
        round: {
          ...round,
          conversation,
          evaluation: scored,
          comboBefore: prev.combo,
          comboAfter,
        },
        liveBadges: badgesFromIds(mergedBadges),
      }));
    },
    [pushLiveBadge],
  );

  const goHome = useCallback(() => {
    clearTimer();
    void sessionRef.current?.stop().catch(() => undefined);
    sessionRef.current = null;
    setState((prev) => ({
      ...initialState(),
      config: prev.config,
      stats: prev.stats,
      combo: prev.combo,
      screen: 'home',
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config', error: null }));
  }, []);

  const updateConfig = useCallback((patch: Partial<SnakeOilConfig>) => {
    setState((prev) => {
      const next = normalizeConfig({ ...prev.config, ...patch });
      if (patch.format) {
        const preset = formatPresets(patch.format);
        next.pitchSeconds = preset.pitchSeconds;
        next.replySeconds = preset.replySeconds;
        next.enableObjection = preset.enableObjection;
      }
      return { ...prev, config: next };
    });
  }, []);

  const startRound = useCallback(() => {
    if (!validateConfig(state.config).valid) return;
    const player = soloPlayer();
    const deal = dealRound(state.config, state.round?.deal.customer.id ?? null);
    const productName = suggestProductName(deal.words);
    const round: Round = {
      id: newRoundId(),
      playerId: player.id,
      deal,
      product: { name: productName, words: deal.words },
      pitch: null,
      objections: [],
      replies: [],
      eventReply: '',
      conversation: [],
      evaluation: null,
      comboBefore: state.combo,
      comboAfter: state.combo,
    };
    setState((prev) => ({
      ...prev,
      screen: 'deal',
      round,
      liveBadges: [],
      currentObjection: '',
      objectionTurn: 1,
      statusMessage: null,
      error: null,
      recording: false,
      secondsLeft: prev.config.pitchSeconds,
      phase: 'pitch',
      showAnalysis: false,
    }));
  }, [state.config, state.round?.deal.customer.id, state.combo]);

  const setProductName = useCallback((name: string) => {
    setState((prev) => {
      if (!prev.round) return prev;
      return {
        ...prev,
        round: { ...prev.round, product: { ...prev.round.product, name } },
      };
    });
  }, []);

  const goProduct = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'product' }));
  }, []);

  const goPitch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'pitch',
      phase: 'pitch',
      secondsLeft: prev.config.pitchSeconds,
      error: null,
      needsRetry: false,
      statusMessage: null,
    }));
  }, []);

  const retryPitch = useCallback(() => {
    setState((prev) => {
      if (!prev.round) return prev;
      return {
        ...prev,
        screen: 'pitch',
        phase: 'pitch',
        secondsLeft: prev.config.pitchSeconds,
        error: null,
        needsRetry: false,
        statusMessage: null,
        recording: false,
        round: {
          ...prev.round,
          pitch: null,
          objections: [],
          replies: [],
          eventReply: '',
          conversation: [],
          evaluation: null,
        },
        currentObjection: '',
        objectionTurn: 1,
      };
    });
  }, []);

  const toggleAnalysis = useCallback(() => {
    setState((prev) => ({ ...prev, showAnalysis: !prev.showAnalysis }));
  }, []);

  const beginReply = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'reply',
      phase: 'reply',
      secondsLeft: prev.config.replySeconds,
      error: null,
    }));
  }, []);

  const beginEventReply = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'event_reply',
      phase: 'event_reply',
      secondsLeft: prev.round?.deal.event?.reactionSeconds ?? prev.config.replySeconds,
      error: null,
    }));
  }, []);

  const maybeContinueAfterReply = useCallback(
    async (round: Round, replyText: string, conversation: ConversationTurn[]) => {
      const config = configRef.current;
      const replyCount = round.replies.length;
      // Tras la primera respuesta: ¿segunda objeción?
      if (replyCount === 1 && config.format === 'full' && round.deal.forceSecondObjection) {
        setState((prev) => ({
          ...prev,
          screen: 'evaluating',
          statusMessage: 'El cliente no está convencido…',
          round: { ...round, conversation },
        }));
        const second = await requestObjection({
          customer: customerFromRound(round),
          words: round.deal.words,
          productName: round.product.name,
          pitchTranscript: round.pitch?.transcript ?? '',
          difficulty: config.difficulty,
          objectionKindHint: pickObjectionKind(config.difficulty),
          turn: 2,
          previousObjection: round.objections[0]?.text,
          previousReply: replyText,
        });
        const text =
          second.ok
            ? second.data.objection
            : 'Espera… ¿y si tu producto provoca justo lo que dices solucionar?';
        const kind = (second.ok ? second.data.kind : 'contradiction') as Objection['kind'];
        const objection: Objection = { text, kind, turn: 2 };
        const nextConvo: ConversationTurn[] = [...conversation, { role: 'customer', text }];
        const nextRound: Round = {
          ...round,
          objections: [...round.objections, objection],
          conversation: nextConvo,
        };
        if (config.difficulty === 'hard') pushLiveBadge(['no_escape']);
        setState((prev) => ({
          ...prev,
          screen: 'customer',
          round: nextRound,
          currentObjection: text,
          objectionTurn: 2,
          statusMessage: null,
          error: second.ok ? null : second.error,
          secondsLeft: config.replySeconds,
          phase: 'reply',
        }));
        return;
      }

      // Evento inesperado (tras 1ª respuesta sin 2ª objeción, o tras la 2ª)
      if (config.format === 'full' && round.deal.event && !round.eventReply) {
        const event = round.deal.event;
        const nextConvo: ConversationTurn[] = [
          ...conversation,
          { role: 'event', text: `${event.title}\n${event.body}` },
        ];
        setState((prev) => ({
          ...prev,
          screen: 'event',
          round: { ...round, conversation: nextConvo },
          statusMessage: null,
          secondsLeft: event.reactionSeconds,
          phase: 'event_reply',
        }));
        return;
      }

      await finalizeEvaluation(round, conversation, trackerRef.current);
    },
    [finalizeEvaluation, pushLiveBadge],
  );

  const finishPitchAndContinue = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearTimer();
    const session = sessionRef.current;
    sessionRef.current = null;
    const live = liveRef.current;
    liveRef.current = null;
    const round = roundRef.current;
    const tracker = trackerRef.current;
    if (!session || !round) {
      finishingRef.current = false;
      return;
    }

    tracker?.mark('speakEndMs');
    setState((prev) => ({
      ...prev,
      recording: false,
      screen: 'evaluating',
      statusMessage: '📝 Procesando tu discurso…',
      needsRetry: false,
    }));

    try {
      const [{ blob }, liveText] = await Promise.all([
        session.stop(),
        live ? live.flush() : Promise.resolve(''),
      ]);
      tracker?.mark('liveFlushDoneMs');
      const liveTiming = live?.getTiming();
      if (liveTiming) {
        tracker?.setMeta({ liveWindows: liveTiming.windowsProcessed });
        if (liveTiming.firstChunkQueuedAtMs != null && tracker) {
          tracker.marks.firstChunkMs =
            (tracker.marks.speakStartMs ?? performance.now()) + liveTiming.firstChunkQueuedAtMs;
        }
        if (liveTiming.firstResultAtMs != null && tracker) {
          tracker.marks.firstWhisperResultMs =
            (tracker.marks.speakStartMs ?? performance.now()) + liveTiming.firstResultAtMs;
        }
      }

      const readyText = liveText.trim() || live?.getText().trim() || '';
      const config = configRef.current;

      if (!config.enableObjection) {
        setState((prev) => ({
          ...prev,
          statusMessage: '🧠 Analizando tus argumentos…',
        }));
        let transcript = readyText;
        if (!transcriptLooksUsable(transcript)) {
          transcript = await transcribeBlob(blob, round.product.name, (msg) => {
            setState((prev) => ({ ...prev, statusMessage: msg }));
          }, {
            customer: round.deal.customer,
            words: round.deal.words,
            productName: round.product.name,
            preferFinalQuality: true,
            tracker: tracker ?? undefined,
          });
        } else {
          const norm = normalizeGameTranscript(
            transcript,
            round.deal.words,
            round.product.name,
          );
          transcript = norm.normalized || transcript;
          tracker?.setMeta({ usedFinalPass: false, normalizedHits: norm.hits.length });
        }
        if (!transcriptLooksUsable(transcript)) {
          setState((prev) => ({
            ...prev,
            screen: 'pitch',
            error: '⚠️ No hemos entendido bien tu pitch. ¿Quieres repetirlo?',
            needsRetry: true,
            statusMessage: null,
            pipelineReport: tracker?.report() ?? null,
          }));
          return;
        }
        const conversation: ConversationTurn[] = [{ role: 'player_pitch', text: transcript }];
        const nextRound: Round = {
          ...round,
          pitch: { transcript, durationSec: config.pitchSeconds },
          conversation,
        };
        await finalizeEvaluation(nextRound, conversation, tracker);
        return;
      }

      const result = await pitchToObjection({
        blob,
        liveTranscript: readyText,
        customer: round.deal.customer,
        words: round.deal.words,
        productName: round.product.name,
        difficulty: config.difficulty,
        objectionKindHint: pickObjectionKind(config.difficulty),
        onStatus: (msg) => setState((prev) => ({ ...prev, statusMessage: msg })),
        tracker: tracker ?? undefined,
      });

      if (!result.ok && !transcriptLooksUsable(result.transcript || readyText)) {
        setState((prev) => ({
          ...prev,
          screen: 'pitch',
          error: '⚠️ No hemos entendido bien tu pitch. ¿Quieres repetirlo?',
          needsRetry: true,
          statusMessage: null,
          pipelineReport: tracker?.report() ?? null,
        }));
        return;
      }

      const transcript = result.ok
        ? result.data.transcript
        : normalizeGameTranscript(
            result.transcript || readyText,
            round.deal.words,
            round.product.name,
          ).normalized ||
          result.transcript ||
          readyText;
      const objectionText = result.ok
        ? result.data.objection
        : '¿De verdad crees que alguien pagaría por eso? Convénceme.';
      const kind = (result.ok ? result.data.kind : 'doubt') as Objection['kind'];
      const objection: Objection = { text: objectionText, kind, turn: 1 };
      const conversation: ConversationTurn[] = [
        { role: 'player_pitch', text: transcript },
        { role: 'customer', text: objectionText },
      ];
      const nextRound: Round = {
        ...round,
        pitch: { transcript, durationSec: config.pitchSeconds },
        objections: [objection],
        conversation,
      };

      tracker?.mark('uiResultMs');
      setState((prev) => ({
        ...prev,
        screen: 'customer',
        round: nextRound,
        currentObjection: objectionText,
        objectionTurn: 1,
        error: result.ok ? null : result.error,
        statusMessage: null,
        secondsLeft: config.replySeconds,
        phase: 'reply',
        pipelineReport: tracker?.report() ?? null,
        needsRetry: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        screen: 'pitch',
        error: '⚠️ No hemos entendido bien tu pitch. ¿Quieres repetirlo?',
        needsRetry: true,
        statusMessage: null,
        pipelineReport: tracker?.report() ?? null,
      }));
    } finally {
      finishingRef.current = false;
    }
  }, [finalizeEvaluation]);

  const finishReplyAndContinue = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearTimer();
    const session = sessionRef.current;
    sessionRef.current = null;
    const live = liveRef.current;
    liveRef.current = null;
    const round = roundRef.current;
    if (!session || !round) {
      finishingRef.current = false;
      return;
    }

    setState((prev) => ({
      ...prev,
      recording: false,
      screen: 'evaluating',
      statusMessage: '📝 Procesando tu discurso…',
    }));

    try {
      const [{ blob }, liveText] = await Promise.all([
        session.stop(),
        live ? live.flush() : Promise.resolve(''),
      ]);
      trackerRef.current?.mark('speakEndMs');
      trackerRef.current?.mark('liveFlushDoneMs');
      let reply = liveText.trim() || live?.getText().trim() || '';
      if (!transcriptLooksUsable(reply)) {
        setState((prev) => ({ ...prev, statusMessage: '🧠 Analizando tus argumentos…' }));
        reply = await transcribeBlob(blob, round.product.name, (msg) => {
          setState((prev) => ({ ...prev, statusMessage: msg }));
        }, {
          customer: round.deal.customer,
          words: round.deal.words,
          productName: round.product.name,
          preferFinalQuality: false,
          tracker: trackerRef.current ?? undefined,
        });
      } else {
        const norm = normalizeGameTranscript(reply, round.deal.words, round.product.name);
        reply = norm.normalized || reply;
      }

      if (!transcriptLooksUsable(reply)) {
        reply = '(respuesta poco audible)';
      }

      const conversation: ConversationTurn[] = [
        ...round.conversation,
        { role: 'player_reply', text: reply },
      ];
      const nextRound: Round = {
        ...round,
        replies: [...round.replies, reply],
        conversation,
      };

      // Badge mid-game heurístico
      if (reply.split(/\s+/).length >= 18) pushLiveBadge(['improv_mind']);

      await maybeContinueAfterReply(nextRound, reply, conversation);
    } catch {
      setState((prev) => ({
        ...prev,
        screen: 'result',
        error: 'No se pudo procesar la respuesta',
        statusMessage: null,
      }));
    } finally {
      finishingRef.current = false;
    }
  }, [maybeContinueAfterReply, pushLiveBadge]);

  const finishEventReplyAndEvaluate = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearTimer();
    const session = sessionRef.current;
    sessionRef.current = null;
    const live = liveRef.current;
    liveRef.current = null;
    const round = roundRef.current;
    if (!session || !round) {
      finishingRef.current = false;
      return;
    }

    setState((prev) => ({
      ...prev,
      recording: false,
      screen: 'evaluating',
      statusMessage: '⚖️ Evaluando tu respuesta…',
    }));

    try {
      const [{ blob }, liveText] = await Promise.all([
        session.stop(),
        live ? live.flush() : Promise.resolve(''),
      ]);
      trackerRef.current?.mark('speakEndMs');
      let reply = liveText.trim() || live?.getText().trim() || '';
      if (!transcriptLooksUsable(reply)) {
        reply = await transcribeBlob(blob, round.product.name, (msg) => {
          setState((prev) => ({ ...prev, statusMessage: msg }));
        }, {
          customer: round.deal.customer,
          words: round.deal.words,
          productName: round.product.name,
          preferFinalQuality: false,
          tracker: trackerRef.current ?? undefined,
        });
      } else {
        const norm = normalizeGameTranscript(reply, round.deal.words, round.product.name);
        reply = norm.normalized || reply;
      }
      if (!transcriptLooksUsable(reply)) reply = '(reacción poco audible)';
      const conversation: ConversationTurn[] = [
        ...round.conversation,
        { role: 'player_event_reply', text: reply },
      ];
      const nextRound: Round = { ...round, eventReply: reply, conversation };
      pushLiveBadge(['survivor']);
      await finalizeEvaluation(nextRound, conversation, trackerRef.current);
    } catch {
      setState((prev) => ({
        ...prev,
        screen: 'result',
        error: 'No se pudo evaluar el evento',
        statusMessage: null,
      }));
    } finally {
      finishingRef.current = false;
    }
  }, [finalizeEvaluation, pushLiveBadge]);

  const startRecording = useCallback(async () => {
    clearTimer();
    liveRef.current = null;
    const phase = state.phase;
    const seconds =
      phase === 'pitch'
        ? state.config.pitchSeconds
        : phase === 'event_reply'
          ? state.round?.deal.event?.reactionSeconds ?? state.config.replySeconds
          : state.config.replySeconds;

    try {
      const round = state.round;
      const prompt = round
        ? buildSnakeOilWhisperPrompt({
            customer: round.deal.customer,
            productName: round.product.name,
            words: round.deal.words,
          })
        : undefined;
      const tracker = createPipelineTracker();
      tracker.mark('speakStartMs');
      trackerRef.current = tracker;

      const live = createLiveWhisperSession({
        category: state.round?.product.name ?? 'producto',
        prompt,
        onUpdate: (text) => {
          setState((prev) => {
            if (!prev.recording || !prev.round) return prev;
            if (phase === 'pitch') {
              return {
                ...prev,
                round: {
                  ...prev.round,
                  pitch: { transcript: text, durationSec: prev.config.pitchSeconds },
                },
              };
            }
            return prev;
          });
        },
        onFirstResult: (ms) => {
          tracker.mark('firstWhisperResultMs', (tracker.marks.speakStartMs ?? performance.now()) + ms);
        },
      });
      liveRef.current = live;
      const session = await startRecorderSession({
        onPcm: (samples) => live.pushPcm(samples),
      });
      sessionRef.current = session;
      setState((prev) => ({
        ...prev,
        recording: true,
        secondsLeft: seconds,
        error: null,
        needsRetry: false,
        statusMessage: '🎙️ Escuchando…',
      }));

      timerRef.current = window.setInterval(() => {
        setState((prev) => {
          if (!prev.recording) return prev;
          if (prev.secondsLeft <= 1) {
            window.setTimeout(() => {
              if (phase === 'pitch') void finishPitchAndContinue();
              else if (phase === 'event_reply') void finishEventReplyAndEvaluate();
              else void finishReplyAndContinue();
            }, 0);
            return { ...prev, secondsLeft: 0 };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    } catch {
      setState((prev) => ({
        ...prev,
        recording: false,
        error: 'No se pudo acceder al micrófono.',
      }));
    }
  }, [
    state.phase,
    state.config.pitchSeconds,
    state.config.replySeconds,
    state.round,
    finishPitchAndContinue,
    finishReplyAndContinue,
    finishEventReplyAndEvaluate,
  ]);

  const stopRecording = useCallback(() => {
    if (state.phase === 'pitch') void finishPitchAndContinue();
    else if (state.phase === 'event_reply') void finishEventReplyAndEvaluate();
    else void finishReplyAndContinue();
  }, [state.phase, finishPitchAndContinue, finishReplyAndContinue, finishEventReplyAndEvaluate]);

  const liveTranscript =
    state.phase === 'pitch' ? state.round?.pitch?.transcript ?? '' : '';

  return {
    state,
    configValidation,
    liveTranscript,
    goHome,
    goConfig,
    updateConfig,
    startRound,
    setProductName,
    goProduct,
    goPitch,
    retryPitch,
    beginReply,
    beginEventReply,
    startRecording,
    stopRecording,
    toggleAnalysis,
  };
}
