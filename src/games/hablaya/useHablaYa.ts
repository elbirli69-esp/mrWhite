import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { evaluateRecording, scoreSpeech } from './api';
import { buildCategoryPool } from './categories';
import {
  combineScore,
  createPlayers,
  DEFAULT_CONFIG,
  isHablaYaConfig,
  ranking,
  validateConfig,
  type HablaYaConfig,
  type HablaYaPlayer,
  type HablaYaScreen,
  type TurnRecord,
} from './logic';
import { startRecorderSession, transcriptLooksUsable, transcriptTooShortMessage, type RecorderSession } from './record';
import { createLiveWhisperSession, type LiveWhisperController } from './liveWhisper';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'hablaya-config';
const NAMES_KEY = 'hablaya-names';
const PASS_MS = 900;

interface State {
  screen: HablaYaScreen;
  config: HablaYaConfig;
  playerNames: string[];
  players: HablaYaPlayer[];
  categoryPool: string[];
  usedCategories: string[];
  round: number;
  turnInRound: number;
  currentPlayerIndex: number;
  selectedCategory: string;
  audioUrl: string | null;
  transcript: string;
  /** True si Whisper falló y hace falta resumen manual. */
  needsTranscript: boolean;
  aiScore: number | null;
  aiFeedback: string | null;
  aiError: string | null;
  aiLoading: boolean;
  aiStatus: string | null;
  votes: Record<number, number>;
  lastFinalScore: number | null;
  history: TurnRecord[];
  recording: boolean;
  secondsLeft: number;
}

function initialState(): State {
  const loaded =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isHablaYaConfig)
      : { ...DEFAULT_CONFIG };
  const config: HablaYaConfig = {
    ...DEFAULT_CONFIG,
    ...loaded,
    adultMode: loaded.adultMode ?? false,
    customCategories: loaded.customCategories ?? [],
    useBuiltInCategories: loaded.useBuiltInCategories ?? true,
  };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(NAMES_KEY, config.playerCount) : resizeNames([], config.playerCount);

  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    categoryPool: [],
    usedCategories: [],
    round: 1,
    turnInRound: 0,
    currentPlayerIndex: 0,
    selectedCategory: '',
    audioUrl: null,
    transcript: '',
    needsTranscript: false,
    aiScore: null,
    aiFeedback: null,
    aiError: null,
    aiLoading: false,
    aiStatus: null,
    votes: {},
    lastFinalScore: null,
    history: [],
    recording: false,
    secondsLeft: config.secondsPerTurn,
  };
}

function revokeUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

export function useHablaYa() {
  const [state, setState] = useState<State>(initialState);
  const sessionRef = useRef<RecorderSession | null>(null);
  const liveWhisperRef = useRef<LiveWhisperController | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const audioBlobRef = useRef<Blob | null>(null);
  const turnMetaRef = useRef({
    category: '',
    topicMode: state.config.topicMode as 'serious' | 'invented',
    seconds: state.config.secondsPerTurn,
    evalMode: state.config.evalMode,
  });

  useEffect(() => {
    turnMetaRef.current = {
      category: state.selectedCategory,
      topicMode: state.config.topicMode,
      seconds: state.config.secondsPerTurn,
      evalMode: state.config.evalMode,
    };
  }, [state.selectedCategory, state.config.topicMode, state.config.secondsPerTurn, state.config.evalMode]);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(NAMES_KEY, state.playerNames);
  }, [state.playerNames]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      void sessionRef.current?.stop().catch(() => undefined);
      revokeUrl(state.audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configValidation = useMemo(() => validateConfig(state.config), [state.config]);
  const namesError = useMemo(
    () => validateNames(state.playerNames, state.config.playerCount),
    [state.playerNames, state.config.playerCount],
  );

  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
  const availableCategories = useMemo(
    () => state.categoryPool.filter((c) => !state.usedCategories.includes(c)),
    [state.categoryPool, state.usedCategories],
  );

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateConfig = useCallback((patch: Partial<HablaYaConfig>) => {
    setState((prev) => {
      const next = { ...prev.config, ...patch };
      let playerNames = prev.playerNames;
      if (typeof patch.playerCount === 'number') {
        playerNames = resizeNames(prev.playerNames, patch.playerCount);
      }
      return { ...prev, config: next, playerNames };
    });
  }, []);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const playerNames = [...prev.playerNames];
      playerNames[index] = name;
      return { ...prev, playerNames };
    });
  }, []);

  const goHome = useCallback(() => {
    clearTimer();
    void sessionRef.current?.stop().catch(() => undefined);
    sessionRef.current = null;
    setState((prev) => {
      revokeUrl(prev.audioUrl);
      return {
        ...initialState(),
        config: prev.config,
        playerNames: prev.playerNames,
        screen: 'home',
      };
    });
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config' }));
  }, []);

  const goNames = useCallback(() => {
    if (!validateConfig(state.config).valid) return;
    setState((prev) => ({ ...prev, screen: 'names' }));
  }, [state.config]);

  const beginMatch = useCallback(() => {
    if (namesError) return;
    const players = createPlayers(state.playerNames);
    const categoryPool = buildCategoryPool({
      useBuiltIn: state.config.useBuiltInCategories,
      adultMode: state.config.adultMode,
      custom: state.config.customCategories,
    });
    setState((prev) => {
      revokeUrl(prev.audioUrl);
      return {
        ...prev,
        screen: 'pass',
        players,
        categoryPool,
        usedCategories: [],
        round: 1,
        turnInRound: 0,
        currentPlayerIndex: 0,
        selectedCategory: '',
        audioUrl: null,
        transcript: '',
        needsTranscript: false,
        aiScore: null,
        aiFeedback: null,
        aiError: null,
        aiLoading: false,
        aiStatus: null,
        votes: {},
        lastFinalScore: null,
        history: [],
        recording: false,
        secondsLeft: prev.config.secondsPerTurn,
      };
    });
    window.setTimeout(() => {
      setState((prev) => (prev.screen === 'pass' ? { ...prev, screen: 'pick' } : prev));
    }, PASS_MS);
  }, [namesError, state.playerNames, state.config]);

  const selectCategory = useCallback((category: string) => {
    audioBlobRef.current = null;
    setState((prev) => ({
      ...prev,
      selectedCategory: category,
      screen: 'record',
      transcript: '',
      needsTranscript: false,
      audioUrl: null,
      aiScore: null,
      aiFeedback: null,
      aiError: null,
      aiLoading: false,
      aiStatus: null,
      votes: {},
      secondsLeft: prev.config.secondsPerTurn,
      recording: false,
    }));
  }, []);

  const runAiScoreFromText = useCallback(async (transcript: string) => {
    const meta = turnMetaRef.current;
    setState((prev) => ({
      ...prev,
      aiLoading: true,
      aiStatus: 'Puntuando con IA…',
      aiError: null,
      aiScore: null,
      aiFeedback: null,
      needsTranscript: false,
      transcript,
    }));

    const result = await scoreSpeech({
      transcript,
      category: meta.category,
      topicMode: meta.topicMode,
      durationSec: meta.seconds,
    });

    setState((prev) => {
      if (prev.screen !== 'review') return prev;
      if (!result.ok || result.score == null) {
        return {
          ...prev,
          aiLoading: false,
          aiStatus: null,
          aiError: result.error || 'La IA no pudo puntuar',
          aiScore: null,
          aiFeedback: null,
          needsTranscript: true,
        };
      }
      return {
        ...prev,
        aiLoading: false,
        aiStatus: null,
        aiScore: result.score,
        aiFeedback: result.feedback || null,
        aiError: null,
        needsTranscript: false,
      };
    });
  }, []);

  const runAiFromAudio = useCallback(async (blob: Blob) => {
    const meta = turnMetaRef.current;
    setState((prev) => ({
      ...prev,
      aiLoading: true,
      aiStatus: 'Transcribiendo con Whisper…',
      aiError: null,
      aiScore: null,
      aiFeedback: null,
      needsTranscript: false,
    }));

    const result = await evaluateRecording({
      blob,
      category: meta.category,
      topicMode: meta.topicMode,
      durationSec: meta.seconds,
      onStatus: (msg) => {
        setState((prev) => (prev.screen === 'review' ? { ...prev, aiStatus: msg } : prev));
      },
      onTranscript: (text) => {
        // Mostrar texto ya y pasar a DeepSeek sin esperar a la UI de votos.
        setState((prev) =>
          prev.screen === 'review'
            ? {
                ...prev,
                transcript: text,
                aiStatus: 'Puntuando con DeepSeek…',
                needsTranscript: false,
              }
            : prev,
        );
      },
    });

    setState((prev) => {
      if (prev.screen !== 'review') return prev;
      const transcript = result.transcript?.trim() || prev.transcript;
      if (!result.ok || result.score == null) {
        return {
          ...prev,
          transcript,
          aiLoading: false,
          aiStatus: null,
          aiError: result.error || 'No se pudo transcribir / puntuar',
          aiScore: null,
          aiFeedback: null,
          needsTranscript: !transcriptLooksUsable(transcript),
        };
      }
      return {
        ...prev,
        transcript,
        aiLoading: false,
        aiStatus: null,
        aiScore: result.score,
        aiFeedback: result.feedback || null,
        aiError: null,
        needsTranscript: false,
      };
    });
  }, []);

  const finishRecording = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearTimer();
    const session = sessionRef.current;
    sessionRef.current = null;
    const live = liveWhisperRef.current;
    liveWhisperRef.current = null;
    if (!session) {
      finishingRef.current = false;
      return;
    }

    setState((prev) => ({ ...prev, recording: false }));
    const meta = turnMetaRef.current;
    try {
      const [{ blob }, liveText] = await Promise.all([
        session.stop(),
        live ? live.flush() : Promise.resolve(''),
      ]);
      audioBlobRef.current = blob;
      const audioUrl = URL.createObjectURL(blob);
      const wantsAi = meta.evalMode !== 'votes';
      const readyText = liveText.trim() || live?.getText().trim() || '';

      setState((prev) => {
        revokeUrl(prev.audioUrl);
        return {
          ...prev,
          screen: 'review',
          audioUrl,
          transcript: readyText,
          needsTranscript: false,
          aiLoading: wantsAi,
          aiStatus: wantsAi
            ? readyText
              ? 'Puntuando con DeepSeek…'
              : 'Cerrando transcripción…'
            : null,
          aiScore: null,
          aiFeedback: null,
          aiError: null,
          votes: {},
        };
      });

      if (!wantsAi) return;

      if (transcriptLooksUsable(readyText)) {
        void runAiScoreFromText(readyText);
      } else {
        void runAiFromAudio(blob);
      }
    } catch {
      setState((prev) => ({
        ...prev,
        screen: 'review',
        recording: false,
        aiLoading: false,
        aiStatus: null,
        needsTranscript: meta.evalMode !== 'votes',
        aiError: 'No se pudo guardar el audio',
      }));
    } finally {
      finishingRef.current = false;
    }
  }, [runAiFromAudio, runAiScoreFromText]);

  const setTranscript = useCallback((transcript: string) => {
    setState((prev) => ({ ...prev, transcript }));
  }, []);

  const requestAiScore = useCallback(async () => {
    const blob = audioBlobRef.current;
    // Si hay audio y el texto está vacío/corto, reintentar Whisper
    if (blob && !transcriptLooksUsable(state.transcript)) {
      await runAiFromAudio(blob);
      return;
    }
    const text = state.transcript.trim();
    if (!transcriptLooksUsable(text)) {
      setState((prev) => ({
        ...prev,
        aiError: transcriptTooShortMessage(),
        aiScore: null,
        aiFeedback: null,
        aiLoading: false,
        aiStatus: null,
        needsTranscript: true,
      }));
      return;
    }
    await runAiScoreFromText(text);
  }, [runAiFromAudio, runAiScoreFromText, state.transcript]);

  const skipAi = useCallback(() => {
    setState((prev) => ({
      ...prev,
      needsTranscript: false,
      aiLoading: false,
      aiStatus: null,
      aiScore: null,
      aiFeedback: null,
      aiError: 'IA omitida: usad los votos de la mesa.',
    }));
  }, []);

  const startRecording = useCallback(async () => {
    clearTimer();
    audioBlobRef.current = null;
    liveWhisperRef.current = null;
    try {
      const category = turnMetaRef.current.category;
      const live = createLiveWhisperSession({
        category,
        onUpdate: (text) => {
          setState((prev) =>
            prev.recording || prev.screen === 'record'
              ? { ...prev, transcript: text }
              : prev,
          );
        },
      });
      liveWhisperRef.current = live;
      const session = await startRecorderSession({
        onPcm: (samples) => live.pushPcm(samples),
      });
      sessionRef.current = session;
      setState((prev) => ({
        ...prev,
        recording: true,
        secondsLeft: prev.config.secondsPerTurn,
        transcript: '',
        aiError: null,
      }));

      timerRef.current = window.setInterval(() => {
        setState((prev) => {
          if (!prev.recording) return prev;
          const next = prev.secondsLeft - 1;
          if (next <= 0) {
            window.setTimeout(() => {
              void finishRecording();
            }, 0);
            return { ...prev, secondsLeft: 0 };
          }
          return { ...prev, secondsLeft: next };
        });
      }, 1000);
    } catch {
      liveWhisperRef.current = null;
      setState((prev) => ({
        ...prev,
        recording: false,
        aiError: 'Necesitamos permiso de micrófono',
      }));
    }
  }, [finishRecording]);

  const setVote = useCallback((voterId: number, score: number) => {
    setState((prev) => ({
      ...prev,
      votes: { ...prev.votes, [voterId]: score },
    }));
  }, []);

  const canConfirmReview = useMemo(() => {
    const { evalMode } = state.config;
    const voters = state.players.filter((p) => p.id !== currentPlayer?.id);
    const allVoted = voters.every((v) => state.votes[v.id] != null);

    // En modo solo-IA hay que esperar la nota. En "both" se puede votar en paralelo;
    // confirmar exige votos + (nota IA o fallo/omitida).
    if (evalMode === 'ai') {
      if (state.aiLoading) return false;
      if (state.needsTranscript) return false;
      return state.aiScore != null;
    }
    if (evalMode === 'votes') return allVoted;

    if (!allVoted) return false;
    if (state.aiLoading) return false;
    if (state.needsTranscript) return false;
    return true;
  }, [state, currentPlayer]);

  const confirmReview = useCallback(() => {
    const finalScore = combineScore({
      evalMode: state.config.evalMode,
      aiWeight: state.config.aiWeight,
      aiScore: state.aiScore,
      votes: state.votes,
    });
    if (finalScore == null || !currentPlayer) return;

    setState((prev) => {
      const players = prev.players.map((p) =>
        p.id === currentPlayer.id ? { ...p, score: clampAdd(p.score, finalScore) } : p,
      );
      const history: TurnRecord[] = [
        ...prev.history,
        {
          round: prev.round,
          playerId: currentPlayer.id,
          category: prev.selectedCategory,
          aiScore: prev.aiScore,
          aiFeedback: prev.aiFeedback,
          votes: prev.votes,
          finalScore,
          transcript: prev.transcript,
        },
      ];
      return {
        ...prev,
        players,
        history,
        usedCategories: [...prev.usedCategories, prev.selectedCategory],
        lastFinalScore: finalScore,
        screen: 'turnResult',
      };
    });
  }, [state, currentPlayer]);

  const nextTurn = useCallback(() => {
    audioBlobRef.current = null;
    setState((prev) => {
      revokeUrl(prev.audioUrl);
      const nextIndex = prev.currentPlayerIndex + 1;
      const endOfRound = nextIndex >= prev.players.length;
      const nextRound = endOfRound ? prev.round + 1 : prev.round;
      const finished = endOfRound && nextRound > prev.config.rounds;

      if (finished) {
        return {
          ...prev,
          screen: 'matchEnd',
          audioUrl: null,
          selectedCategory: '',
          transcript: '',
          needsTranscript: false,
          votes: {},
          aiScore: null,
          aiFeedback: null,
          aiError: null,
          aiStatus: null,
        };
      }

      return {
        ...prev,
        screen: 'pass',
        currentPlayerIndex: endOfRound ? 0 : nextIndex,
        round: nextRound,
        turnInRound: endOfRound ? 0 : prev.turnInRound + 1,
        audioUrl: null,
        selectedCategory: '',
        transcript: '',
        needsTranscript: false,
        votes: {},
        aiScore: null,
        aiFeedback: null,
        aiError: null,
        aiLoading: false,
        aiStatus: null,
        lastFinalScore: null,
        recording: false,
        secondsLeft: prev.config.secondsPerTurn,
      };
    });

    window.setTimeout(() => {
      setState((prev) => (prev.screen === 'pass' ? { ...prev, screen: 'pick' } : prev));
    }, PASS_MS);
  }, []);

  const ranked = useMemo(() => ranking(state.players), [state.players]);

  return {
    state,
    configValidation,
    namesError,
    currentPlayer,
    availableCategories,
    ranked,
    canConfirmReview,
    updateConfig,
    updatePlayerName,
    goHome,
    goConfig,
    goNames,
    beginMatch,
    selectCategory,
    startRecording,
    finishRecording,
    setTranscript,
    requestAiScore,
    skipAi,
    setVote,
    confirmReview,
    nextTurn,
  };
}

function clampAdd(score: number, add: number): number {
  return Math.round((score + add) * 10) / 10;
}
