import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLiveWhisperSession, type LiveWhisperController } from '../hablaya/liveWhisper';
import {
  startRecorderSession,
  transcriptLooksUsable,
  transcriptTooShortMessage,
  type RecorderSession,
} from '../hablaya/record';
import { loadJson, saveJson } from '../shared/persist';
import { pitchToObjection, requestEvaluation, transcribeBlob } from './api';
import {
  dealRound,
  emptyStats,
  isSnakeOilConfig,
  normalizeConfig,
  suggestProductName,
  updateStats,
  validateConfig,
  type MatchStats,
} from './engine';
import type { AiEvaluation, RoundDeal, Screen, SnakeOilConfig } from './types';
import { DEFAULT_CONFIG } from './types';

const CONFIG_KEY = 'snakeoil-config-v2';
const STATS_KEY = 'snakeoil-stats-v2';

interface State {
  screen: Screen;
  config: SnakeOilConfig;
  stats: MatchStats;
  deal: RoundDeal | null;
  productName: string;
  pitchTranscript: string;
  replyTranscript: string;
  objection: string;
  evaluation: AiEvaluation | null;
  statusMessage: string | null;
  error: string | null;
  recording: boolean;
  secondsLeft: number;
  phase: 'pitch' | 'reply';
}

function loadStats(): MatchStats {
  return loadJson(STATS_KEY, emptyStats(), (v): v is MatchStats => {
    if (!v || typeof v !== 'object') return false;
    const s = v as Record<string, unknown>;
    return typeof s.rounds === 'number' && typeof s.bestScore === 'number';
  });
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
    stats: typeof window !== 'undefined' ? loadStats() : emptyStats(),
    deal: null,
    productName: '',
    pitchTranscript: '',
    replyTranscript: '',
    objection: '',
    evaluation: null,
    statusMessage: null,
    error: null,
    recording: false,
    secondsLeft: config.pitchSeconds,
    phase: 'pitch',
  };
}

export function useSnakeOil() {
  const [state, setState] = useState<State>(initialState);
  const sessionRef = useRef<RecorderSession | null>(null);
  const liveRef = useRef<LiveWhisperController | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const blobRef = useRef<Blob | null>(null);
  const metaRef = useRef({
    productName: '',
    customerTitle: '',
    customerNeed: '',
    words: [] as string[],
    pitchSeconds: 45,
    replySeconds: 20,
    enableObjection: true,
    pitchTranscript: '',
    objection: '',
  });

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(STATS_KEY, state.stats);
  }, [state.stats]);

  useEffect(() => {
    metaRef.current = {
      productName: state.productName,
      customerTitle: state.deal?.customer.title ?? '',
      customerNeed: state.deal?.customer.need ?? '',
      words: state.deal?.words ?? [],
      pitchSeconds: state.config.pitchSeconds,
      replySeconds: state.config.objectionSeconds,
      enableObjection: state.config.enableObjection,
      pitchTranscript: state.pitchTranscript,
      objection: state.objection,
    };
  }, [state.productName, state.deal, state.config, state.pitchTranscript, state.objection]);

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

  const goHome = useCallback(() => {
    clearTimer();
    void sessionRef.current?.stop().catch(() => undefined);
    sessionRef.current = null;
    setState((prev) => ({
      ...initialState(),
      config: prev.config,
      stats: prev.stats,
      screen: 'home',
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config', error: null }));
  }, []);

  const updateConfig = useCallback((patch: Partial<SnakeOilConfig>) => {
    setState((prev) => ({ ...prev, config: normalizeConfig({ ...prev.config, ...patch }) }));
  }, []);

  const startRound = useCallback(() => {
    if (!validateConfig(state.config).valid) return;
    const deal = dealRound(state.config, state.deal?.customer.id ?? null);
    setState((prev) => ({
      ...prev,
      screen: 'deal',
      deal,
      productName: suggestProductName(deal.words),
      pitchTranscript: '',
      replyTranscript: '',
      objection: '',
      evaluation: null,
      statusMessage: null,
      error: null,
      recording: false,
      secondsLeft: prev.config.pitchSeconds,
      phase: 'pitch',
    }));
  }, [state.config, state.deal?.customer.id]);

  const setProductName = useCallback((productName: string) => {
    setState((prev) => ({ ...prev, productName }));
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
      pitchTranscript: '',
      error: null,
    }));
  }, []);

  const finishPitchAndContinue = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearTimer();
    const session = sessionRef.current;
    sessionRef.current = null;
    const live = liveRef.current;
    liveRef.current = null;
    if (!session) {
      finishingRef.current = false;
      return;
    }

    setState((prev) => ({ ...prev, recording: false, statusMessage: 'Tu pitch está siendo analizado…' }));

    try {
      const [{ blob }, liveText] = await Promise.all([
        session.stop(),
        live ? live.flush() : Promise.resolve(''),
      ]);
      blobRef.current = blob;
      const readyText = liveText.trim() || live?.getText().trim() || '';
      const meta = metaRef.current;

      if (!meta.enableObjection) {
        // Sin objeción: transcribir + evaluar directo
        setState((prev) => ({
          ...prev,
          screen: 'evaluating',
          pitchTranscript: readyText,
          statusMessage: 'Evaluando el pitch…',
        }));

        let transcript = readyText;
        if (!transcriptLooksUsable(transcript)) {
          transcript = await transcribeBlob(blob, meta.productName, (msg) => {
            setState((prev) => ({ ...prev, statusMessage: msg }));
          });
        }

        const evaluation = await requestEvaluation({
          customerTitle: meta.customerTitle,
          customerNeed: meta.customerNeed,
          words: meta.words,
          productName: meta.productName,
          pitchTranscript: transcript,
          objection: '',
          replyTranscript: '',
          pitchSeconds: meta.pitchSeconds,
          replySeconds: 0,
        });

        if (!evaluation.ok) {
          setState((prev) => ({
            ...prev,
            screen: 'result',
            pitchTranscript: transcript,
            error: evaluation.error,
            evaluation: null,
            statusMessage: null,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          screen: 'result',
          pitchTranscript: transcript,
          evaluation: evaluation.data,
          stats: updateStats(prev.stats, evaluation.data),
          statusMessage: null,
          error: null,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        screen: 'evaluating',
        pitchTranscript: readyText,
        statusMessage: readyText ? 'Inventando objeción…' : 'Transcribiendo el pitch…',
      }));

      const result = await pitchToObjection({
        blob,
        customerTitle: meta.customerTitle,
        customerNeed: meta.customerNeed,
        words: meta.words,
        productName: meta.productName,
        onStatus: (msg) => setState((prev) => ({ ...prev, statusMessage: msg })),
        onTranscript: (text) => setState((prev) => ({ ...prev, pitchTranscript: text })),
      });

      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          screen: 'objection',
          pitchTranscript: result.transcript || prev.pitchTranscript,
          objection:
            '¿De verdad crees que alguien pagaría por eso? Convénceme en veinte segundos.',
          error: result.error,
          statusMessage: null,
          secondsLeft: meta.replySeconds,
          phase: 'reply',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        screen: 'objection',
        pitchTranscript: result.data.transcript,
        objection: result.data.objection,
        error: null,
        statusMessage: null,
        secondsLeft: meta.replySeconds,
        phase: 'reply',
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        screen: 'pitch',
        error: 'No se pudo procesar el audio',
        statusMessage: null,
      }));
    } finally {
      finishingRef.current = false;
    }
  }, []);

  const beginReply = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'reply',
      phase: 'reply',
      secondsLeft: prev.config.objectionSeconds,
      replyTranscript: '',
      error: null,
    }));
  }, []);

  const finishReplyAndEvaluate = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearTimer();
    const session = sessionRef.current;
    sessionRef.current = null;
    const live = liveRef.current;
    liveRef.current = null;
    if (!session) {
      finishingRef.current = false;
      return;
    }

    setState((prev) => ({
      ...prev,
      recording: false,
      screen: 'evaluating',
      statusMessage: 'El jurado delibera…',
    }));

    try {
      const [{ blob }, liveText] = await Promise.all([
        session.stop(),
        live ? live.flush() : Promise.resolve(''),
      ]);
      let reply = liveText.trim() || live?.getText().trim() || '';
      if (!transcriptLooksUsable(reply)) {
        reply = await transcribeBlob(blob, metaRef.current.productName, (msg) => {
          setState((prev) => ({ ...prev, statusMessage: msg }));
        });
      }

      const meta = metaRef.current;
      setState((prev) => ({ ...prev, replyTranscript: reply, statusMessage: 'Puntuando con IA…' }));

      const evaluation = await requestEvaluation({
        customerTitle: meta.customerTitle,
        customerNeed: meta.customerNeed,
        words: meta.words,
        productName: meta.productName,
        pitchTranscript: meta.pitchTranscript,
        objection: meta.objection,
        replyTranscript: reply,
        pitchSeconds: meta.pitchSeconds,
        replySeconds: meta.replySeconds,
      });

      setState((prev) => {
        if (!evaluation.ok) {
          return {
            ...prev,
            screen: 'result',
            replyTranscript: reply,
            error: evaluation.error || transcriptTooShortMessage(),
            evaluation: null,
            statusMessage: null,
          };
        }
        return {
          ...prev,
          screen: 'result',
          replyTranscript: reply,
          evaluation: evaluation.data,
          stats: updateStats(prev.stats, evaluation.data),
          error: null,
          statusMessage: null,
        };
      });
    } catch {
      setState((prev) => ({
        ...prev,
        screen: 'result',
        error: 'No se pudo evaluar',
        statusMessage: null,
      }));
    } finally {
      finishingRef.current = false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    clearTimer();
    blobRef.current = null;
    liveRef.current = null;
    const phase = state.phase;
    const seconds =
      phase === 'pitch' ? state.config.pitchSeconds : state.config.objectionSeconds;

    try {
      const live = createLiveWhisperSession({
        category: metaRef.current.productName,
        onUpdate: (text) => {
          setState((prev) => {
            if (!prev.recording) return prev;
            return phase === 'pitch'
              ? { ...prev, pitchTranscript: text }
              : { ...prev, replyTranscript: text };
          });
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
      }));

      timerRef.current = window.setInterval(() => {
        setState((prev) => {
          if (!prev.recording) return prev;
          if (prev.secondsLeft <= 1) {
            window.setTimeout(() => {
              if (phase === 'pitch') void finishPitchAndContinue();
              else void finishReplyAndEvaluate();
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
    state.config.objectionSeconds,
    finishPitchAndContinue,
    finishReplyAndEvaluate,
  ]);

  const stopRecording = useCallback(() => {
    if (state.phase === 'pitch') void finishPitchAndContinue();
    else void finishReplyAndEvaluate();
  }, [state.phase, finishPitchAndContinue, finishReplyAndEvaluate]);

  return {
    state,
    configValidation,
    goHome,
    goConfig,
    updateConfig,
    startRound,
    setProductName,
    goProduct,
    goPitch,
    beginReply,
    startRecording,
    stopRecording,
  };
}
