import { useCallback, useEffect, useState } from 'react';
import {
  createPlayers,
  DEFAULT_CONFIG,
  guessesMatch,
  pickDeal,
  pickStarterId,
  validateCamaleonConfig,
  type CamaleonConfig,
  type CamaleonDeal,
  type CamaleonElimination,
  type CamaleonPlayer,
  type CamaleonScreen,
} from './logic';
import { isCamaleonConfig } from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'camaleon-config';
const NAMES_KEY = 'camaleon-names';
const PASS_MS = 1000;

function blankRound() {
  return {
    currentPlayerIndex: 0,
    revealed: false,
    clueIndex: 0,
    currentRound: 1,
    lastElimination: null as CamaleonElimination | null,
    accusedId: null as number | null,
    guessInput: '',
    endTitle: '',
    endSubtitle: '',
  };
}

interface State {
  screen: CamaleonScreen;
  config: CamaleonConfig;
  playerNames: string[];
  players: CamaleonPlayer[];
  deal: CamaleonDeal | null;
  currentPlayerIndex: number;
  revealed: boolean;
  startingPlayerId: number | null;
  clueIndex: number;
  currentRound: number;
  lastElimination: CamaleonElimination | null;
  accusedId: number | null;
  guessInput: string;
  endTitle: string;
  endSubtitle: string;
}

function initialState(): State {
  const config =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isCamaleonConfig)
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

export function useCamaleon() {
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
      deal: null,
      ...blankRound(),
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'config',
      players: [],
      deal: null,
      ...blankRound(),
    }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      if (!validateCamaleonConfig(prev.config).valid) return prev;
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

  const updateConfig = useCallback((partial: Partial<CamaleonConfig>) => {
    setState((prev) => {
      const config = { ...prev.config, ...partial };
      if (config.chameleonCount >= config.playerCount) {
        config.chameleonCount = Math.max(1, config.playerCount - 1);
      }
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
      if (!validateCamaleonConfig(prev.config).valid) return prev;
      if (validateNames(prev.playerNames, prev.config.playerCount)) return prev;

      const previousChameleonIds = prev.players
        .filter((p) => p.role === 'chameleon')
        .map((p) => p.id);
      const deal = pickDeal();
      const players = createPlayers(prev.config, prev.playerNames, previousChameleonIds);

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
      screen: prev.config.cluePhase ? 'clues' : 'play',
      clueIndex: 0,
      currentRound: 1,
      lastElimination: null,
    }));
  }, []);

  const setClue = useCallback((value: string) => {
    setState((prev) => {
      const players = prev.players.map((p, i) =>
        i === prev.clueIndex ? { ...p, clue: value } : p,
      );
      return { ...prev, players };
    });
  }, []);

  const nextClue = useCallback(() => {
    setState((prev) => {
      const current = prev.players[prev.clueIndex];
      if (!current?.clue.trim()) return prev;
      if (prev.clueIndex >= prev.players.length - 1) {
        return { ...prev, screen: 'play' };
      }
      return { ...prev, clueIndex: prev.clueIndex + 1 };
    });
  }, []);

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

      const chameleonsAlive = players.some(
        (p) => p.role === 'chameleon' && p.eliminatedRound === null,
      );

      if (player.role === 'chameleon' && prev.config.chameleonCanGuess) {
        return {
          ...prev,
          players,
          lastElimination,
          accusedId: player.id,
          screen: 'guess',
          currentRound: round + 1,
        };
      }

      if (!chameleonsAlive) {
        return {
          ...prev,
          players,
          lastElimination,
          currentRound: round + 1,
          screen: 'end',
          endTitle: '¡Camaleón descubierto!',
          endSubtitle: `La palabra era ${prev.deal?.secretWord ?? ''}.`,
        };
      }

      const normalsAlive = players.filter(
        (p) => p.role === 'normal' && p.eliminatedRound === null,
      ).length;
      if (normalsAlive === 0) {
        return {
          ...prev,
          players,
          lastElimination,
          currentRound: round + 1,
          screen: 'end',
          endTitle: 'Gana el Camaleón',
          endSubtitle: `Nadie adivinó. La palabra era ${prev.deal?.secretWord ?? ''}.`,
        };
      }

      return {
        ...prev,
        players,
        lastElimination,
        currentRound: round + 1,
      };
    });
  }, []);

  const submitGuess = useCallback(() => {
    setState((prev) => {
      const secret = prev.deal?.secretWord ?? '';
      const ok = guessesMatch(prev.guessInput, secret);
      return {
        ...prev,
        screen: 'end',
        endTitle: ok ? '¡El Camaleón acierta!' : 'El Camaleón falla',
        endSubtitle: ok
          ? `Adivinó «${secret}» y se salva.`
          : `La palabra era «${secret}». Ganan los demás.`,
      };
    });
  }, []);

  const skipGuess = useCallback(() => {
    setState((prev) => {
      const chameleonsAlive = prev.players.some(
        (p) => p.role === 'chameleon' && p.eliminatedRound === null,
      );
      if (!chameleonsAlive) {
        return {
          ...prev,
          screen: 'end',
          endTitle: '¡Camaleón descubierto!',
          endSubtitle: `La palabra era ${prev.deal?.secretWord ?? ''}.`,
        };
      }
      return { ...prev, screen: 'play', accusedId: null, guessInput: '' };
    });
  }, []);

  const setGuessInput = useCallback((guessInput: string) => {
    setState((prev) => ({ ...prev, guessInput }));
  }, []);

  const clearLastElimination = useCallback(() => {
    setState((prev) => ({ ...prev, lastElimination: null }));
  }, []);

  const configValidation = validateCamaleonConfig(state.config);
  const namesError = validateNames(state.playerNames, state.config.playerCount);
  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
  const cluePlayer = state.players[state.clueIndex] ?? null;

  return {
    state,
    currentPlayer,
    cluePlayer,
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
    setClue,
    nextClue,
    eliminatePlayer,
    submitGuess,
    skipGuess,
    setGuessInput,
    clearLastElimination,
  };
}

