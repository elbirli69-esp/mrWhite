import { useCallback, useEffect, useState } from 'react';
import {
  buildWordDeck,
  createPlayers,
  DEFAULT_CONFIG,
  isHeadsUpConfig,
  nextPlayerIndex,
  pickRandomStart,
  validateHeadsUpConfig,
  type HeadsUpConfig,
  type HeadsUpPlayer,
  type HeadsUpScreen,
} from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'headsup-config';
const NAMES_KEY = 'headsup-names';

interface State {
  screen: HeadsUpScreen;
  config: HeadsUpConfig;
  playerNames: string[];
  players: HeadsUpPlayer[];
  activeIndex: number;
  deck: string[];
  deckIndex: number;
  secondsLeft: number;
  roundCorrect: number;
  roundSkipped: number;
  turnsPlayed: number;
  winnerIds: number[];
}

function initialState(): State {
  const config =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isHeadsUpConfig)
      : { ...DEFAULT_CONFIG };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(NAMES_KEY, config.playerCount) : resizeNames([], config.playerCount);
  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    activeIndex: 0,
    deck: [],
    deckIndex: 0,
    secondsLeft: config.roundSeconds,
    roundCorrect: 0,
    roundSkipped: 0,
    turnsPlayed: 0,
    winnerIds: [],
  };
}

export function useHeadsUp() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(NAMES_KEY, state.playerNames);
  }, [state.playerNames]);

  const goHome = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'home',
      players: [],
      deck: [],
      deckIndex: 0,
      roundCorrect: 0,
      roundSkipped: 0,
      turnsPlayed: 0,
      winnerIds: [],
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config' }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      if (!validateHeadsUpConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<HeadsUpConfig>) => {
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

  const goLobby = useCallback(() => {
    setState((prev) => {
      if (!validateHeadsUpConfig(prev.config).valid) return prev;
      if (validateNames(prev.playerNames, prev.config.playerCount)) return prev;
      const players = createPlayers(prev.playerNames);
      return {
        ...prev,
        screen: 'lobby',
        players,
        activeIndex: pickRandomStart(players.length),
        deck: [],
        deckIndex: 0,
        roundCorrect: 0,
        roundSkipped: 0,
        turnsPlayed: 0,
        winnerIds: [],
        secondsLeft: prev.config.roundSeconds,
      };
    });
  }, []);

  const startRound = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'play',
      deck: buildWordDeck(100),
      deckIndex: 0,
      secondsLeft: prev.config.roundSeconds,
      roundCorrect: 0,
      roundSkipped: 0,
    }));
  }, []);

  useEffect(() => {
    if (state.screen !== 'play') return undefined;
    if (state.secondsLeft <= 0) {
      setState((prev) => {
        const players = prev.players.map((p, i) =>
          i === prev.activeIndex ? { ...p, score: p.score + prev.roundCorrect } : p,
        );
        const turnsPlayed = prev.turnsPlayed + 1;
        const reachedScore =
          prev.config.winScore > 0 &&
          players.some((p) => p.score >= prev.config.winScore);
        const reachedRounds =
          prev.config.winScore === 0 && turnsPlayed >= prev.config.roundsPerMatch;

        if (reachedScore || reachedRounds) {
          const max = Math.max(...players.map((p) => p.score));
          return {
            ...prev,
            players,
            turnsPlayed,
            screen: 'matchEnd',
            winnerIds: players.filter((p) => p.score === max).map((p) => p.id),
          };
        }

        return {
          ...prev,
          players,
          turnsPlayed,
          screen: 'roundEnd',
        };
      });
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setState((prev) => ({ ...prev, secondsLeft: prev.secondsLeft - 1 }));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [state.screen, state.secondsLeft]);

  const markCorrect = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'play') return prev;
      const nextIndex = prev.deckIndex + 1;
      const deck = nextIndex >= prev.deck.length ? buildWordDeck(100) : prev.deck;
      const deckIndex = nextIndex >= prev.deck.length ? 0 : nextIndex;
      return {
        ...prev,
        roundCorrect: prev.roundCorrect + 1,
        deck,
        deckIndex,
      };
    });
  }, []);

  const markSkip = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'play' || !prev.config.allowSkip) return prev;
      const nextIndex = prev.deckIndex + 1;
      const deck = nextIndex >= prev.deck.length ? buildWordDeck(100) : prev.deck;
      const deckIndex = nextIndex >= prev.deck.length ? 0 : nextIndex;
      return {
        ...prev,
        roundSkipped: prev.roundSkipped + 1,
        deck,
        deckIndex,
      };
    });
  }, []);

  const nextTurn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'lobby',
      activeIndex: nextPlayerIndex(prev.activeIndex, prev.players.length),
      roundCorrect: 0,
      roundSkipped: 0,
      secondsLeft: prev.config.roundSeconds,
    }));
  }, []);

  const rematch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'lobby',
      players: prev.players.map((p) => ({ ...p, score: 0 })),
      activeIndex: pickRandomStart(prev.players.length),
      turnsPlayed: 0,
      winnerIds: [],
      roundCorrect: 0,
      roundSkipped: 0,
      secondsLeft: prev.config.roundSeconds,
    }));
  }, []);

  return {
    state,
    currentWord: state.deck[state.deckIndex] ?? null,
    activePlayer: state.players[state.activeIndex] ?? null,
    configValidation: validateHeadsUpConfig(state.config),
    namesError: validateNames(state.playerNames, state.config.playerCount),
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    goLobby,
    startRound,
    markCorrect,
    markSkip,
    nextTurn,
    rematch,
  };
}
