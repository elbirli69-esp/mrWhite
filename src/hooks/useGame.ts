import { useCallback, useEffect, useState } from 'react';
import type { AppScreen, GameConfig, GameState } from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';
import { createPlayers, pickRandomWordPair } from '../utils/game';
import {
  loadConfig,
  loadNames,
  resizeNames,
  saveConfig,
  saveNames,
  validateNames,
} from '../utils/storage';
import { validateConfig } from '../utils/validation';

const PASS_DURATION_MS = 1000;

function initialState(): GameState {
  const config = typeof window !== 'undefined' ? loadConfig() : { ...DEFAULT_CONFIG };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(config.playerCount) : resizeNames([], config.playerCount);

  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    words: null,
    currentPlayerIndex: 0,
    revealed: false,
    currentRound: 1,
    lastElimination: null,
  };
}

/**
 * Flujo: home → config → names → reveal ↔ pass → ready → play.
 */
export function useGame() {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    saveConfig(state.config);
  }, [state.config]);

  useEffect(() => {
    saveNames(state.playerNames);
  }, [state.playerNames]);

  const goHome = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'home',
      players: [],
      words: null,
      currentPlayerIndex: 0,
      revealed: false,
      currentRound: 1,
      lastElimination: null,
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'config',
      players: [],
      words: null,
      currentPlayerIndex: 0,
      revealed: false,
      currentRound: 1,
      lastElimination: null,
    }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      const validation = validateConfig(prev.config);
      if (!validation.valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
        players: [],
        words: null,
        currentPlayerIndex: 0,
        revealed: false,
        currentRound: 1,
        lastElimination: null,
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<GameConfig>) => {
    setState((prev) => {
      const config = { ...prev.config, ...partial };
      return {
        ...prev,
        config,
        playerNames: resizeNames(prev.playerNames, config.playerCount),
      };
    });
  }, []);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const playerNames = [...prev.playerNames];
      playerNames[index] = name;
      return { ...prev, playerNames };
    });
  }, []);

  const startDeal = useCallback(() => {
    setState((prev) => {
      const configValidation = validateConfig(prev.config);
      if (!configValidation.valid) return prev;

      const namesError = validateNames(prev.playerNames, prev.config.playerCount);
      if (namesError) return prev;

      const words = pickRandomWordPair();
      const players = createPlayers(prev.config, words, prev.playerNames);

      return {
        ...prev,
        screen: 'reveal',
        words,
        players,
        currentPlayerIndex: 0,
        revealed: false,
        currentRound: 1,
        lastElimination: null,
      };
    });
  }, []);

  const revealWord = useCallback(() => {
    setState((prev) => ({ ...prev, revealed: true }));
  }, []);

  const passToNext = useCallback(() => {
    setState((prev) => {
      const isLast = prev.currentPlayerIndex >= prev.players.length - 1;
      if (isLast) {
        return {
          ...prev,
          screen: 'ready',
          revealed: false,
        };
      }
      return {
        ...prev,
        screen: 'pass',
        revealed: false,
      };
    });
  }, []);

  useEffect(() => {
    if (state.screen !== 'pass') return undefined;

    const timer = window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        screen: 'reveal',
        currentPlayerIndex: prev.currentPlayerIndex + 1,
        revealed: false,
      }));
    }, PASS_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [state.screen]);

  const beginPlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'play',
      currentRound: 1,
      lastElimination: null,
    }));
  }, []);

  const eliminatePlayer = useCallback((playerId: number) => {
    setState((prev) => {
      if (prev.screen !== 'play') return prev;

      const player = prev.players.find((p) => p.id === playerId);
      if (!player || player.eliminatedRound !== null) return prev;

      const round = prev.currentRound;

      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, eliminatedRound: round } : p,
        ),
        lastElimination: {
          playerId: player.id,
          playerName: player.name,
          role: player.role,
          round,
        },
        currentRound: round + 1,
      };
    });
  }, []);

  const clearLastElimination = useCallback(() => {
    setState((prev) => ({ ...prev, lastElimination: null }));
  }, []);

  const setScreen = useCallback((screen: AppScreen) => {
    setState((prev) => ({ ...prev, screen }));
  }, []);

  const configValidation = validateConfig(state.config);
  const namesError = validateNames(state.playerNames, state.config.playerCount);
  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;

  return {
    state,
    currentPlayer,
    configValidation,
    namesError,
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    startDeal,
    revealWord,
    passToNext,
    beginPlay,
    eliminatePlayer,
    clearLastElimination,
    setScreen,
  };
}

export type UseGameReturn = ReturnType<typeof useGame>;
