import { useCallback, useEffect, useState } from 'react';
import {
  buildWordDeck,
  createPlayers,
  DEFAULT_CONFIG,
  evaluateClues,
  guessesMatch,
  isJustOneConfig,
  pickGuesserIndex,
  validateJustOneConfig,
  type JustOneConfig,
  type JustOnePlayer,
  type JustOneScreen,
} from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'justone-config';
const NAMES_KEY = 'justone-names';
const PASS_MS = 1000;

interface State {
  screen: JustOneScreen;
  config: JustOneConfig;
  playerNames: string[];
  players: JustOnePlayer[];
  deck: string[];
  round: number;
  score: number;
  guesserIndex: number;
  clueGiverOrder: number[];
  clueStep: number;
  secretWord: string;
  clues: string[];
  guessInput: string;
  lastCorrect: boolean | null;
  revealed: boolean;
}

function initialState(): State {
  const config =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isJustOneConfig)
      : { ...DEFAULT_CONFIG };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(NAMES_KEY, config.playerCount) : resizeNames([], config.playerCount);
  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    deck: [],
    round: 1,
    score: 0,
    guesserIndex: 0,
    clueGiverOrder: [],
    clueStep: 0,
    secretWord: '',
    clues: [],
    guessInput: '',
    lastCorrect: null,
    revealed: false,
  };
}

export function useJustOne() {
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
      if (!validateJustOneConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<JustOneConfig>) => {
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
      if (!validateJustOneConfig(prev.config).valid) return prev;
      if (validateNames(prev.playerNames, prev.config.playerCount)) return prev;
      const players = createPlayers(prev.playerNames);
      const guesserIndex = pickGuesserIndex(1, players.length, null);
      return {
        ...prev,
        screen: 'roundIntro',
        players,
        deck: buildWordDeck(60),
        round: 1,
        score: 0,
        guesserIndex,
        clueGiverOrder: [],
        clueStep: 0,
        secretWord: '',
        clues: [],
        guessInput: '',
        lastCorrect: null,
        revealed: false,
      };
    });
  }, []);

  const beginRound = useCallback(() => {
    setState((prev) => {
      const word = prev.deck[(prev.round - 1) % prev.deck.length] ?? prev.deck[0] ?? 'Palabra';
      const clueGiverOrder = prev.players
        .map((_, i) => i)
        .filter((i) => i !== prev.guesserIndex);
      return {
        ...prev,
        screen: 'clueReveal',
        secretWord: word,
        clueGiverOrder,
        clueStep: 0,
        clues: Array.from({ length: clueGiverOrder.length }, () => ''),
        guessInput: '',
        lastCorrect: null,
        revealed: false,
      };
    });
  }, []);

  const revealWord = useCallback(() => setState((prev) => ({ ...prev, revealed: true })), []);

  const afterClueReveal = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'clueEntry', revealed: false }));
  }, []);

  const passBetweenClues = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'pass', revealed: false }));
  }, []);

  useEffect(() => {
    if (state.screen !== 'pass') return undefined;
    const timer = window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        screen: 'clueReveal',
        clueStep: prev.clueStep + 1,
        revealed: false,
      }));
    }, PASS_MS);
    return () => window.clearTimeout(timer);
  }, [state.screen]);

  const setClue = useCallback((value: string) => {
    setState((prev) => {
      const clues = [...prev.clues];
      clues[prev.clueStep] = value;
      return { ...prev, clues };
    });
  }, []);

  const submitClue = useCallback(() => {
    setState((prev) => {
      const current = prev.clues[prev.clueStep]?.trim();
      if (!current) return prev;
      if (prev.clueStep >= prev.clueGiverOrder.length - 1) {
        return { ...prev, screen: 'clueReview' };
      }
      return { ...prev, screen: 'pass' };
    });
  }, []);

  const goGuess = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'guess', guessInput: '' }));
  }, []);

  const setGuessInput = useCallback((guessInput: string) => {
    setState((prev) => ({ ...prev, guessInput }));
  }, []);

  const submitGuess = useCallback(() => {
    setState((prev) => {
      const ok = guessesMatch(prev.guessInput, prev.secretWord);
      return {
        ...prev,
        screen: 'roundResult',
        lastCorrect: ok,
        score: ok ? prev.score + 1 : prev.score,
      };
    });
  }, []);

  const skipGuess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'roundResult',
      lastCorrect: false,
    }));
  }, []);

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (prev.round >= prev.config.totalRounds) {
        return { ...prev, screen: 'matchEnd' };
      }
      const nextRoundNum = prev.round + 1;
      const guesserIndex = pickGuesserIndex(nextRoundNum, prev.players.length, prev.guesserIndex);
      return {
        ...prev,
        screen: 'roundIntro',
        round: nextRoundNum,
        guesserIndex,
        clueGiverOrder: [],
        clueStep: 0,
        secretWord: '',
        clues: [],
        guessInput: '',
        lastCorrect: null,
        revealed: false,
      };
    });
  }, []);

  const evaluatedClues = evaluateClues(state.clues, state.config.removeDuplicates);
  const currentClueGiver =
    state.players[state.clueGiverOrder[state.clueStep] ?? -1] ?? null;
  const guesser = state.players[state.guesserIndex] ?? null;

  return {
    state,
    evaluatedClues,
    currentClueGiver,
    guesser,
    configValidation: validateJustOneConfig(state.config),
    namesError: validateNames(state.playerNames, state.config.playerCount),
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    startMatch,
    beginRound,
    revealWord,
    afterClueReveal,
    passBetweenClues,
    setClue,
    submitClue,
    goGuess,
    setGuessInput,
    submitGuess,
    skipGuess,
    nextRound,
  };
}
