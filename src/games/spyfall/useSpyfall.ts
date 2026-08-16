import { useCallback, useEffect, useState } from 'react';
import {
  allLocationNames,
  createPlayers,
  DEFAULT_CONFIG,
  isSpyfallConfig,
  pickDeal,
  pickStarterId,
  validateSpyfallConfig,
  type SpyfallConfig,
  type SpyfallDeal,
  type SpyfallPlayer,
  type SpyfallScreen,
} from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'spyfall-config';
const NAMES_KEY = 'spyfall-names';
const PASS_MS = 1000;

interface Elimination {
  playerId: number;
  playerName: string;
  role: 'civilian' | 'spy';
  round: number;
}

interface State {
  screen: SpyfallScreen;
  config: SpyfallConfig;
  playerNames: string[];
  players: SpyfallPlayer[];
  deal: SpyfallDeal | null;
  currentPlayerIndex: number;
  revealed: boolean;
  startingPlayerId: number | null;
  currentRound: number;
  lastElimination: Elimination | null;
  secondsLeft: number | null;
  endTitle: string;
  endSubtitle: string;
}

function blankRound() {
  return {
    currentPlayerIndex: 0,
    revealed: false,
    currentRound: 1,
    lastElimination: null as Elimination | null,
    secondsLeft: null as number | null,
    endTitle: '',
    endSubtitle: '',
  };
}

function initialState(): State {
  const config =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isSpyfallConfig)
      : { ...DEFAULT_CONFIG };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(NAMES_KEY, config.playerCount) : resizeNames([], config.playerCount);
  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    deal: null,
    startingPlayerId: null,
    ...blankRound(),
  };
}

export function useSpyfall() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(NAMES_KEY, state.playerNames);
  }, [state.playerNames]);

  const goHome = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'home', players: [], deal: null, ...blankRound() }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config', players: [], deal: null, ...blankRound() }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      if (!validateSpyfallConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
        players: [],
        deal: null,
        ...blankRound(),
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<SpyfallConfig>) => {
    setState((prev) => {
      const config = { ...prev.config, ...partial };
      if (config.spyCount >= config.playerCount) config.spyCount = Math.max(1, config.playerCount - 1);
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

  const startDeal = useCallback(() => {
    setState((prev) => {
      if (!validateSpyfallConfig(prev.config).valid) return prev;
      if (validateNames(prev.playerNames, prev.config.playerCount)) return prev;
      const previousSpyIds = prev.players.filter((p) => p.role === 'spy').map((p) => p.id);
      const deal = pickDeal();
      const players = createPlayers(prev.config, prev.playerNames, deal, previousSpyIds);
      return {
        ...prev,
        screen: 'reveal',
        deal,
        players,
        ...blankRound(),
        startingPlayerId: prev.startingPlayerId,
      };
    });
  }, []);

  const revealWord = useCallback(() => setState((prev) => ({ ...prev, revealed: true })), []);

  const passToNext = useCallback(() => {
    setState((prev) => {
      if (prev.currentPlayerIndex >= prev.players.length - 1) {
        return {
          ...prev,
          screen: 'ready',
          revealed: false,
          startingPlayerId: pickStarterId(prev.players, prev.startingPlayerId),
        };
      }
      return { ...prev, screen: 'pass', revealed: false };
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
    }, PASS_MS);
    return () => window.clearTimeout(timer);
  }, [state.screen]);

  const beginPlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'play',
      currentRound: 1,
      lastElimination: null,
      secondsLeft: prev.config.timerMinutes > 0 ? prev.config.timerMinutes * 60 : null,
    }));
  }, []);

  useEffect(() => {
    if (state.screen !== 'play' || state.secondsLeft === null) return undefined;
    if (state.secondsLeft <= 0) {
      setState((prev) => ({
        ...prev,
        screen: 'end',
        endTitle: 'Se acabó el tiempo',
        endSubtitle: `El lugar era ${prev.deal?.locationName ?? ''}. Los espías ganan si no los pillasteis.`,
      }));
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setState((prev) =>
        prev.secondsLeft === null ? prev : { ...prev, secondsLeft: Math.max(0, prev.secondsLeft - 1) },
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [state.screen, state.secondsLeft]);

  const eliminatePlayer = useCallback((playerId: number) => {
    setState((prev) => {
      const player = prev.players.find((p) => p.id === playerId);
      if (!player || player.eliminatedRound !== null) return prev;
      const round = prev.currentRound;
      const players = prev.players.map((p) =>
        p.id === playerId ? { ...p, eliminatedRound: round } : p,
      );
      const lastElimination = {
        playerId: player.id,
        playerName: player.name,
        role: player.role,
        round,
      };
      const spiesAlive = players.some((p) => p.role === 'spy' && p.eliminatedRound === null);
      if (!spiesAlive) {
        return {
          ...prev,
          players,
          lastElimination,
          currentRound: round + 1,
          screen: 'end',
          endTitle: '¡Espía descubierto!',
          endSubtitle: `El lugar era ${prev.deal?.locationName ?? ''}.`,
        };
      }
      const civiliansAlive = players.filter((p) => p.role === 'civilian' && p.eliminatedRound === null).length;
      if (civiliansAlive === 0) {
        return {
          ...prev,
          players,
          lastElimination,
          currentRound: round + 1,
          screen: 'end',
          endTitle: 'Ganan los espías',
          endSubtitle: `El lugar era ${prev.deal?.locationName ?? ''}.`,
        };
      }
      return { ...prev, players, lastElimination, currentRound: round + 1 };
    });
  }, []);

  const clearLastElimination = useCallback(() => {
    setState((prev) => ({ ...prev, lastElimination: null }));
  }, []);

  const spyWinsByGuess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'end',
      endTitle: 'El espía adivinó el lugar',
      endSubtitle: `Era ${prev.deal?.locationName ?? ''}. Ganan los espías.`,
    }));
  }, []);

  return {
    state,
    locationNames: allLocationNames(),
    currentPlayer: state.players[state.currentPlayerIndex] ?? null,
    configValidation: validateSpyfallConfig(state.config),
    namesError: validateNames(state.playerNames, state.config.playerCount),
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
    spyWinsByGuess,
  };
}
