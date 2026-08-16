import { useCallback, useEffect, useState } from 'react';
import {
  createPlayers,
  DEFAULT_CONFIG,
  emptyWords,
  isUnanimoConfig,
  pickTheme,
  scoreRound,
  shuffleOrder,
  validateConfig,
  type UnanimoConfig,
  type UnanimoPlayer,
  type UnanimoScreen,
  type WordStat,
} from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'unanimo-config';
const NAMES_KEY = 'unanimo-names';
const PASS_MS = 1000;

interface State {
  screen: UnanimoScreen;
  config: UnanimoConfig;
  playerNames: string[];
  players: UnanimoPlayer[];
  round: number;
  theme: string;
  usedThemes: string[];
  entryOrder: number[];
  entryStep: number;
  drafts: Record<number, string[]>;
  lastStats: WordStat[];
  lastRoundPoints: Record<number, number>;
}

function initialState(): State {
  const loaded =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isUnanimoConfig)
      : { ...DEFAULT_CONFIG };
  const config = { ...DEFAULT_CONFIG, ...loaded, adultMode: loaded.adultMode ?? false };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(NAMES_KEY, config.playerCount) : resizeNames([], config.playerCount);
  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    round: 1,
    theme: '',
    usedThemes: [],
    entryOrder: [],
    entryStep: 0,
    drafts: {},
    lastStats: [],
    lastRoundPoints: {},
  };
}

export function useUnanimo() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(NAMES_KEY, state.playerNames);
  }, [state.playerNames]);

  const goHome = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'home', players: [] }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config' }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      if (!validateConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<UnanimoConfig>) => {
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
      if (!validateConfig(prev.config).valid) return prev;
      if (validateNames(prev.playerNames, prev.config.playerCount)) return prev;
      const players = createPlayers(prev.playerNames);
      const theme = pickTheme(prev.config.adultMode);
      return {
        ...prev,
        screen: 'roundIntro',
        players,
        round: 1,
        theme,
        usedThemes: [theme],
        entryOrder: [],
        entryStep: 0,
        drafts: {},
        lastStats: [],
        lastRoundPoints: {},
      };
    });
  }, []);

  const beginEntry = useCallback(() => {
    setState((prev) => {
      const entryOrder = shuffleOrder(prev.players.map((p) => p.id));
      const drafts: Record<number, string[]> = {};
      for (const id of entryOrder) drafts[id] = emptyWords(prev.config.wordsPerPlayer);
      return {
        ...prev,
        screen: 'entry',
        entryOrder,
        entryStep: 0,
        drafts,
      };
    });
  }, []);

  const setDraftWord = useCallback((index: number, value: string) => {
    setState((prev) => {
      const playerId = prev.entryOrder[prev.entryStep];
      if (!playerId) return prev;
      const words = [...(prev.drafts[playerId] ?? emptyWords(prev.config.wordsPerPlayer))];
      words[index] = value;
      return { ...prev, drafts: { ...prev.drafts, [playerId]: words } };
    });
  }, []);

  const submitEntry = useCallback(() => {
    setState((prev) => {
      const playerId = prev.entryOrder[prev.entryStep];
      if (!playerId) return prev;
      const words = prev.drafts[playerId] ?? [];
      if (words.some((w) => !w.trim())) return prev;
      if (prev.entryStep >= prev.entryOrder.length - 1) {
        const submissions = prev.entryOrder.map((id) => ({
          playerId: id,
          words: prev.drafts[id] ?? [],
        }));
        const { stats, pointsByPlayer } = scoreRound(submissions, prev.players.length);
        const players = prev.players.map((p) => ({
          ...p,
          score: p.score + (pointsByPlayer[p.id] ?? 0),
        }));
        return {
          ...prev,
          players,
          lastStats: stats,
          lastRoundPoints: pointsByPlayer,
          screen: 'results',
        };
      }
      return { ...prev, screen: 'pass' };
    });
  }, []);

  useEffect(() => {
    if (state.screen !== 'pass') return undefined;
    const timer = window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        screen: 'entry',
        entryStep: prev.entryStep + 1,
      }));
    }, PASS_MS);
    return () => window.clearTimeout(timer);
  }, [state.screen]);

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (prev.round >= prev.config.totalRounds) {
        return { ...prev, screen: 'matchEnd' };
      }
      const theme = pickTheme(prev.config.adultMode, prev.usedThemes);
      return {
        ...prev,
        screen: 'roundIntro',
        round: prev.round + 1,
        theme,
        usedThemes: [...prev.usedThemes, theme],
        entryOrder: [],
        entryStep: 0,
        drafts: {},
        lastStats: [],
        lastRoundPoints: {},
      };
    });
  }, []);

  const currentEntryPlayer =
    state.players.find((p) => p.id === state.entryOrder[state.entryStep]) ?? null;
  const currentDraft =
    (currentEntryPlayer && state.drafts[currentEntryPlayer.id]) ||
    emptyWords(state.config.wordsPerPlayer);

  return {
    state,
    currentEntryPlayer,
    currentDraft,
    configValidation: validateConfig(state.config),
    namesError: validateNames(state.playerNames, state.config.playerCount),
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    startMatch,
    beginEntry,
    setDraftWord,
    submitEntry,
    nextRound,
  };
}
