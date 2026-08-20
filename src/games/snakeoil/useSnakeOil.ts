import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLiveWhisperSession, type LiveWhisperController } from '../hablaya/liveWhisper';
import {
  startRecorderSession,
  transcriptLooksUsable,
  transcriptTooShortMessage,
  type RecorderSession,
} from '../hablaya/record';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';
import { evaluatePitchRecording, scorePitch } from './api';
import {
  createMatchDecks,
  createPlayers,
  dealHands,
  DEFAULT_CONFIG,
  isSnakeOilConfig,
  pickCustomer,
  productLabel,
  ranking,
  refillHand,
  sellerIds,
  validateConfig,
  winnerByAi,
  type PitchRecord,
  type SnakeOilConfig,
  type SnakeOilPlayer,
  type SnakeOilScreen,
} from './logic';

const CONFIG_KEY = 'snakeoil-config';
const NAMES_KEY = 'snakeoil-names';
const PASS_MS = 900;

interface State {
  screen: SnakeOilScreen;
  config: SnakeOilConfig;
  playerNames: string[];
  players: SnakeOilPlayer[];
  wordDeck: string[];
  customerDeck: string[];
  /** Índice del jugador que es cliente esta ronda. */
  customerIndex: number;
  /** Cuántos jugadores ya han sido cliente. */
  customersDone: number;
  customerRole: string;
  sellerOrder: number[];
  sellerStep: number;
  selected: string[];
  pitches: PitchRecord[];
  audioUrl: string | null;
  transcript: string;
  needsTranscript: boolean;
  aiScore: number | null;
  aiFeedback: string | null;
  aiError: string | null;
  aiLoading: boolean;
  aiStatus: string | null;
  recording: boolean;
  secondsLeft: number;
  winnerId: number | null;
}

function initialState(): State {
  const loaded =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isSnakeOilConfig)
      : { ...DEFAULT_CONFIG };
  const config: SnakeOilConfig = {
    ...DEFAULT_CONFIG,
    ...loaded,
    adultMode: loaded.adultMode ?? false,
  };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(NAMES_KEY, config.playerCount) : resizeNames([], config.playerCount);

  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    wordDeck: [],
    customerDeck: [],
    customerIndex: 0,
    customersDone: 0,
    customerRole: '',
    sellerOrder: [],
    sellerStep: 0,
    selected: [],
    pitches: [],
    audioUrl: null,
    transcript: '',
    needsTranscript: false,
    aiScore: null,
    aiFeedback: null,
    aiError: null,
    aiLoading: false,
    aiStatus: null,
    recording: false,
    secondsLeft: config.secondsPerPitch,
    winnerId: null,
  };
}

function revokeUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

function revokePitches(pitches: PitchRecord[]) {
  for (const p of pitches) revokeUrl(p.audioUrl);
}

export function useSnakeOil() {
  const [state, setState] = useState<State>(initialState);
  const sessionRef = useRef<RecorderSession | null>(null);
  const liveWhisperRef = useRef<LiveWhisperController | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const audioBlobRef = useRef<Blob | null>(null);
  const turnMetaRef = useRef({
    customer: '',
    product: '',
    seconds: state.config.secondsPerPitch,
    wantsAi: true,
  });

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
      revokePitches(state.pitches);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configValidation = useMemo(() => validateConfig(state.config), [state.config]);
  const namesError = useMemo(
    () => validateNames(state.playerNames, state.config.playerCount),
    [state.playerNames, state.config.playerCount],
  );

  const customer = state.players[state.customerIndex] ?? null;
  const currentSellerId = state.sellerOrder[state.sellerStep] ?? null;
  const currentSeller = state.players.find((p) => p.id === currentSellerId) ?? null;
  const ranked = useMemo(() => ranking(state.players), [state.players]);
  const wantsAi = state.config.judgeMode !== 'customer';

  useEffect(() => {
    const product =
      state.selected.length === 2 ? productLabel(state.selected[0]!, state.selected[1]!) : '';
    turnMetaRef.current = {
      customer: state.customerRole,
      product,
      seconds: state.config.secondsPerPitch,
      wantsAi: state.config.judgeMode !== 'customer',
    };
  }, [state.customerRole, state.selected, state.config.secondsPerPitch, state.config.judgeMode]);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateConfig = useCallback((patch: Partial<SnakeOilConfig>) => {
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
      revokePitches(prev.pitches);
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

  const startRoundAt = useCallback((customerIndex: number, players: SnakeOilPlayer[], wordDeck: string[], customerDeck: string[], customersDone: number) => {
    const customerPlayer = players[customerIndex];
    if (!customerPlayer) return;
    const picked = pickCustomer(customerDeck);
    const order = sellerIds(players, customerPlayer.id);
    setState((prev) => {
      revokeUrl(prev.audioUrl);
      revokePitches(prev.pitches);
      return {
        ...prev,
        screen: 'pass',
        players,
        wordDeck,
        customerDeck: picked.deck,
        customerIndex,
        customersDone,
        customerRole: picked.customer,
        sellerOrder: order,
        sellerStep: 0,
        selected: [],
        pitches: [],
        audioUrl: null,
        transcript: '',
        needsTranscript: false,
        aiScore: null,
        aiFeedback: null,
        aiError: null,
        aiLoading: false,
        aiStatus: null,
        recording: false,
        secondsLeft: prev.config.secondsPerPitch,
        winnerId: null,
      };
    });
    window.setTimeout(() => {
      setState((prev) => (prev.screen === 'pass' ? { ...prev, screen: 'customerReveal' } : prev));
    }, PASS_MS);
  }, []);

  const beginMatch = useCallback(() => {
    if (namesError) return;
    const players = createPlayers(state.playerNames);
    const decks = createMatchDecks(state.config.adultMode);
    const dealt = dealHands(players, decks.wordDeck);
    startRoundAt(0, dealt.players, dealt.deck, decks.customerDeck, 0);
  }, [namesError, state.playerNames, state.config.adultMode, startRoundAt]);

  const continueAfterCustomerReveal = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'pass' }));
    window.setTimeout(() => {
      setState((prev) => (prev.screen === 'pass' ? { ...prev, screen: 'build', selected: [] } : prev));
    }, PASS_MS);
  }, []);

  const toggleWord = useCallback((word: string) => {
    setState((prev) => {
      if (prev.screen !== 'build') return prev;
      if (prev.selected.includes(word)) {
        return { ...prev, selected: prev.selected.filter((w) => w !== word) };
      }
      if (prev.selected.length >= 2) return prev;
      return { ...prev, selected: [...prev.selected, word] };
    });
  }, []);

  const confirmProduct = useCallback(() => {
    setState((prev) => {
      if (prev.selected.length !== 2) return prev;
      return {
        ...prev,
        screen: 'pitch',
        transcript: '',
        needsTranscript: false,
        audioUrl: null,
        aiScore: null,
        aiFeedback: null,
        aiError: null,
        aiLoading: false,
        aiStatus: null,
        recording: false,
        secondsLeft: prev.config.secondsPerPitch,
      };
    });
    audioBlobRef.current = null;
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

    const result = await scorePitch({
      transcript,
      customer: meta.customer,
      product: meta.product,
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

    const result = await evaluatePitchRecording({
      blob,
      customer: meta.customer,
      product: meta.product,
      durationSec: meta.seconds,
      onStatus: (msg) => {
        setState((prev) => (prev.screen === 'review' ? { ...prev, aiStatus: msg } : prev));
      },
      onTranscript: (text) => {
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
      const readyText = liveText.trim() || live?.getText().trim() || '';

      setState((prev) => {
        revokeUrl(prev.audioUrl);
        return {
          ...prev,
          screen: 'review',
          audioUrl,
          transcript: readyText,
          needsTranscript: false,
          aiLoading: meta.wantsAi,
          aiStatus: meta.wantsAi
            ? readyText
              ? 'Puntuando con DeepSeek…'
              : 'Cerrando transcripción…'
            : null,
          aiScore: null,
          aiFeedback: null,
          aiError: null,
        };
      });

      if (!meta.wantsAi) return;

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
        needsTranscript: meta.wantsAi,
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
      aiError: 'IA omitida.',
    }));
  }, []);

  const startRecording = useCallback(async () => {
    clearTimer();
    audioBlobRef.current = null;
    liveWhisperRef.current = null;
    try {
      const product = turnMetaRef.current.product;
      const live = createLiveWhisperSession({
        category: product,
        onUpdate: (text) => {
          setState((prev) =>
            prev.recording || prev.screen === 'pitch' ? { ...prev, transcript: text } : prev,
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
        secondsLeft: prev.config.secondsPerPitch,
        transcript: '',
        aiError: null,
      }));
      timerRef.current = window.setInterval(() => {
        setState((prev) => {
          if (!prev.recording) return prev;
          if (prev.secondsLeft <= 1) {
            window.setTimeout(() => void finishRecording(), 0);
            return { ...prev, secondsLeft: 0 };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    } catch {
      setState((prev) => ({
        ...prev,
        recording: false,
        aiError: 'No se pudo acceder al micrófono.',
      }));
    }
  }, [finishRecording]);

  const confirmPitchReview = useCallback(() => {
    setState((prev) => {
      const sellerId = prev.sellerOrder[prev.sellerStep];
      if (prev.selected.length !== 2 || sellerId == null) return prev;
      const [wordA, wordB] = prev.selected as [string, string];
      const pitch: PitchRecord = {
        playerId: sellerId,
        wordA,
        wordB,
        product: productLabel(wordA, wordB),
        transcript: prev.transcript,
        aiScore: prev.aiScore,
        aiFeedback: prev.aiFeedback,
        audioUrl: prev.audioUrl,
      };
      const pitches = [...prev.pitches, pitch];
      const seller = prev.players.find((p) => p.id === sellerId);
      let players = prev.players;
      let wordDeck = prev.wordDeck;
      if (seller) {
        const refilled = refillHand(seller.hand, [wordA, wordB], prev.wordDeck);
        players = prev.players.map((p) =>
          p.id === sellerId ? { ...p, hand: refilled.hand } : p,
        );
        wordDeck = refilled.deck;
      }

      const nextStep = prev.sellerStep + 1;
      if (nextStep < prev.sellerOrder.length) {
        return {
          ...prev,
          players,
          wordDeck,
          pitches,
          sellerStep: nextStep,
          selected: [],
          audioUrl: null,
          transcript: '',
          needsTranscript: false,
          aiScore: null,
          aiFeedback: null,
          aiError: null,
          aiLoading: false,
          aiStatus: null,
          screen: 'pass',
        };
      }

      // Todos han pitcheado
      if (prev.config.judgeMode === 'ai') {
        const autoWinner = winnerByAi(pitches);
        if (autoWinner == null) {
          return {
            ...prev,
            players,
            wordDeck,
            pitches,
            audioUrl: null,
            screen: 'pickWinner',
          };
        }
        return {
          ...prev,
          players: players.map((p) =>
            p.id === autoWinner ? { ...p, score: p.score + 1 } : p,
          ),
          wordDeck,
          pitches,
          audioUrl: null,
          winnerId: autoWinner,
          screen: 'roundResult',
        };
      }

      return {
        ...prev,
        players,
        wordDeck,
        pitches,
        audioUrl: null,
        screen: 'pickWinner',
      };
    });

    // Pass phone to next seller
    window.setTimeout(() => {
      setState((prev) => {
        if (prev.screen !== 'pass') return prev;
        return { ...prev, screen: 'build' };
      });
    }, PASS_MS);
  }, []);

  const pickWinner = useCallback((playerId: number) => {
    setState((prev) => ({
      ...prev,
      winnerId: playerId,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, score: p.score + 1 } : p,
      ),
      screen: 'roundResult',
    }));
  }, []);

  const nextRound = useCallback(() => {
    setState((prev) => {
      const nextDone = prev.customersDone + 1;
      if (nextDone >= prev.players.length) {
        return { ...prev, customersDone: nextDone, screen: 'matchEnd' };
      }
      const nextIndex = (prev.customerIndex + 1) % prev.players.length;
      const players = prev.players;
      const wordDeck = prev.wordDeck;
      const customerDeck = prev.customerDeck;
      window.setTimeout(() => {
        startRoundAt(nextIndex, players, wordDeck, customerDeck, nextDone);
      }, 0);
      return { ...prev, customersDone: nextDone };
    });
  }, [startRoundAt]);

  const canConfirmReview = useMemo(() => {
    if (state.aiLoading) return false;
    if (!wantsAi) return true;
    if (state.aiScore != null) return true;
    // Permitir continuar si se omitió la IA
    if (state.aiError && !state.needsTranscript) return true;
    return false;
  }, [state.aiLoading, state.aiScore, state.aiError, state.needsTranscript, wantsAi]);

  return {
    state,
    configValidation,
    namesError,
    customer,
    currentSeller,
    ranked,
    wantsAi,
    canConfirmReview,
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    beginMatch,
    continueAfterCustomerReveal,
    toggleWord,
    confirmProduct,
    startRecording,
    finishRecording,
    setTranscript,
    requestAiScore,
    skipAi,
    confirmPitchReview,
    pickWinner,
    nextRound,
  };
}
