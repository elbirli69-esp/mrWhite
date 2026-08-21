import { useCallback, useEffect, useState } from 'react';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';
import {
  buildSecretDeck,
  createPlayers,
  DEFAULT_CONFIG,
  guessesMatch,
  isCafeOTeConfig,
  isCustomPairValid,
  pickRoundPairs,
  pickSecret,
  pickThinkerIndex,
  scoreRound,
  validateCafeOTeConfig,
  type BinaryPair,
  type CafeOTeConfig,
  type CafeOTePlayer,
  type CafeOTeScreen,
  type HistoryEntry,
  type PairAnswer,
  type PlayMode,
} from './logic';

const CONFIG_KEY = 'cafeote-config';
const NAMES_KEY = 'cafeote-names';

interface State {
  screen: CafeOTeScreen;
  config: CafeOTeConfig;
  playerNames: string[];
  players: CafeOTePlayer[];
  deck: string[];
  round: number;
  score: number;
  thinkerIndex: number;
  secretWord: string;
  roundPairs: BinaryPair[];
  history: HistoryEntry[];
  wildcardUsed: boolean;
  revealed: boolean;
  playMode: PlayMode;
  guessInput: string;
  customLeft: string;
  customRight: string;
  lastWon: boolean | null;
  lastPoints: number;
  lastQuestions: number;
  /** Mensaje breve tras un intento fallido (sigue la ronda). */
  missMessage: string | null;
}

function initialState(): State {
  const loaded =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isCafeOTeConfig)
      : { ...DEFAULT_CONFIG };
  const config = {
    ...DEFAULT_CONFIG,
    ...loaded,
    adultMode: loaded.adultMode ?? false,
    allowWildcard: loaded.allowWildcard ?? true,
    pack: loaded.pack ?? DEFAULT_CONFIG.pack,
  };
  const playerNames =
    typeof window !== 'undefined'
      ? loadNames(NAMES_KEY, config.playerCount)
      : resizeNames([], config.playerCount);
  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    deck: [],
    round: 1,
    score: 0,
    thinkerIndex: 0,
    secretWord: '',
    roundPairs: [],
    history: [],
    wildcardUsed: false,
    revealed: false,
    playMode: 'ask',
    guessInput: '',
    customLeft: '',
    customRight: '',
    lastWon: null,
    lastPoints: 0,
    lastQuestions: 0,
    missMessage: null,
  };
}

function appendAnswer(
  prev: State,
  left: string,
  right: string,
  answer: PairAnswer,
): State {
  if (prev.screen !== 'play' || prev.playMode !== 'ask') return prev;
  if (prev.history.length >= prev.config.maxQuestions) return prev;
  if ((answer === 'both' || answer === 'neither') && (!prev.config.allowWildcard || prev.wildcardUsed)) {
    return prev;
  }

  const history = [...prev.history, { left, right, answer }];
  const wildcardUsed = prev.wildcardUsed || answer === 'both' || answer === 'neither';

  if (history.length >= prev.config.maxQuestions) {
    return {
      ...prev,
      history,
      wildcardUsed,
      screen: 'roundResult',
      lastWon: false,
      lastPoints: 0,
      lastQuestions: history.length,
      customLeft: '',
      customRight: '',
    };
  }

  return {
    ...prev,
    history,
    wildcardUsed,
    customLeft: '',
    customRight: '',
  };
}

export function useCafeOTe() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(NAMES_KEY, state.playerNames);
  }, [state.playerNames]);

  const goHome = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'home', players: [], deck: [] }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config' }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      if (!validateCafeOTeConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<CafeOTeConfig>) => {
    setState((prev) => {
      const config = { ...prev.config, ...partial };
      return { ...prev, config, playerNames: resizeNames(prev.playerNames, config.playerCount) };
    });
  }, []);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const playerNames = [...prev.playerNames];
      playerNames[index] = name;
      return { ...prev, playerNames };
    });
  }, []);

  const startMatch = useCallback(() => {
    setState((prev) => {
      if (!validateCafeOTeConfig(prev.config).valid) return prev;
      if (validateNames(prev.playerNames, prev.config.playerCount)) return prev;
      const players = createPlayers(prev.playerNames);
      return {
        ...prev,
        screen: 'roundIntro',
        players,
        deck: buildSecretDeck(prev.config.pack, prev.config.adultMode, 50),
        round: 1,
        score: 0,
        thinkerIndex: pickThinkerIndex(1, players.length),
        secretWord: '',
        roundPairs: [],
        history: [],
        wildcardUsed: false,
        revealed: false,
        playMode: 'ask',
        guessInput: '',
        customLeft: '',
        customRight: '',
        lastWon: null,
        lastPoints: 0,
        lastQuestions: 0,
        missMessage: null,
      };
    });
  }, []);

  const goPassToThinker = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'passToThinker', revealed: false }));
  }, []);

  const confirmThinker = useCallback(() => {
    setState((prev) => {
      const secretWord = pickSecret(prev.deck, prev.round);
      return {
        ...prev,
        screen: 'thinkerReveal',
        secretWord,
        roundPairs: pickRoundPairs(prev.config.adultMode),
        history: [],
        wildcardUsed: false,
        revealed: false,
        playMode: 'ask',
        guessInput: '',
        customLeft: '',
        customRight: '',
        missMessage: null,
      };
    });
  }, []);

  const revealSecret = useCallback(() => {
    setState((prev) => ({ ...prev, revealed: true }));
  }, []);

  const startTablePlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'play',
      revealed: false,
      playMode: 'ask',
    }));
  }, []);

  const setPlayMode = useCallback((playMode: PlayMode) => {
    setState((prev) => ({ ...prev, playMode, guessInput: '', missMessage: null }));
  }, []);

  const setGuessInput = useCallback((guessInput: string) => {
    setState((prev) => ({ ...prev, guessInput, missMessage: null }));
  }, []);

  const setCustomLeft = useCallback((customLeft: string) => {
    setState((prev) => ({ ...prev, customLeft }));
  }, []);

  const setCustomRight = useCallback((customRight: string) => {
    setState((prev) => ({ ...prev, customRight }));
  }, []);

  const answerPreset = useCallback((pair: BinaryPair, answer: PairAnswer) => {
    setState((prev) => appendAnswer(prev, pair.left, pair.right, answer));
  }, []);

  const submitCustomAnswer = useCallback((answer: PairAnswer) => {
    setState((prev) => {
      if (!isCustomPairValid(prev.customLeft, prev.customRight)) return prev;
      return appendAnswer(prev, prev.customLeft.trim(), prev.customRight.trim(), answer);
    });
  }, []);

  const submitGuess = useCallback(() => {
    setState((prev) => {
      if (!prev.guessInput.trim()) return prev;
      const won = guessesMatch(prev.guessInput, prev.secretWord);
      const questionsUsed = prev.history.length;
      if (!won) {
        return {
          ...prev,
          guessInput: '',
          missMessage: 'No… seguid preguntando o probad otra.',
        };
      }
      const points = scoreRound(true, questionsUsed, prev.config.maxQuestions);
      return {
        ...prev,
        screen: 'roundResult',
        lastWon: true,
        lastPoints: points,
        lastQuestions: questionsUsed,
        score: prev.score + points,
        missMessage: null,
      };
    });
  }, []);

  const giveUp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'roundResult',
      lastWon: false,
      lastPoints: 0,
      lastQuestions: prev.history.length,
      missMessage: null,
    }));
  }, []);

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (prev.round >= prev.config.totalRounds) {
        return { ...prev, screen: 'matchEnd' };
      }
      const nextRoundNum = prev.round + 1;
      return {
        ...prev,
        screen: 'roundIntro',
        round: nextRoundNum,
        thinkerIndex: pickThinkerIndex(nextRoundNum, prev.players.length),
        secretWord: '',
        roundPairs: [],
        history: [],
        wildcardUsed: false,
        revealed: false,
        playMode: 'ask',
        guessInput: '',
        customLeft: '',
        customRight: '',
        lastWon: null,
        lastPoints: 0,
        lastQuestions: 0,
        missMessage: null,
      };
    });
  }, []);

  const thinker = state.players[state.thinkerIndex] ?? null;
  const questionsLeft = Math.max(0, state.config.maxQuestions - state.history.length);
  const canWildcard = state.config.allowWildcard && !state.wildcardUsed;

  return {
    state,
    thinker,
    questionsLeft,
    canWildcard,
    configValidation: validateCafeOTeConfig(state.config),
    namesError: validateNames(state.playerNames, state.config.playerCount),
    customPairValid: isCustomPairValid(state.customLeft, state.customRight),
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    startMatch,
    goPassToThinker,
    confirmThinker,
    revealSecret,
    startTablePlay,
    setPlayMode,
    setGuessInput,
    setCustomLeft,
    setCustomRight,
    answerPreset,
    submitCustomAnswer,
    submitGuess,
    giveUp,
    nextRound,
  };
}
