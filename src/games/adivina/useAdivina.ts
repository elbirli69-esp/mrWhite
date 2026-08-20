import { useCallback, useEffect, useMemo, useState } from 'react';
import { fireConfetti } from '../../utils/confetti';
import { loadJson, saveJson } from '../shared/persist';
import {
  DEFAULT_CONFIG,
  emptyStats,
  evaluateGuess,
  hardModeViolation,
  isAdivinaConfig,
  isAdivinaStats,
  isValidGuess,
  keyboardStatuses,
  normalizeWord,
  pickSolution,
  recordResult,
  validateAdivinaConfig,
  WORD_LENGTH,
  type AdivinaConfig,
  type AdivinaScreen,
  type AdivinaStats,
  type GuessRow,
} from './logic';

const CONFIG_KEY = 'adivina-config';
const STATS_KEY = 'adivina-stats';

interface State {
  screen: AdivinaScreen;
  config: AdivinaConfig;
  stats: AdivinaStats;
  solution: string;
  rows: GuessRow[];
  current: string;
  statusMessage: string | null;
  won: boolean | null;
  shakeToken: number;
}

function loadConfig(): AdivinaConfig {
  const loaded = loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isAdivinaConfig);
  return {
    ...DEFAULT_CONFIG,
    ...loaded,
    adultMode: loaded.adultMode ?? false,
  };
}

function loadStats(maxAttempts: number): AdivinaStats {
  const loaded = loadJson(STATS_KEY, emptyStats(maxAttempts), isAdivinaStats);
  if (loaded.distribution.length !== maxAttempts) {
    return {
      ...loaded,
      distribution: Array.from({ length: maxAttempts }, (_, i) => loaded.distribution[i] ?? 0),
    };
  }
  return loaded;
}

function initialState(): State {
  if (typeof window === 'undefined') {
    return {
      screen: 'home',
      config: { ...DEFAULT_CONFIG },
      stats: emptyStats(),
      solution: '',
      rows: [],
      current: '',
      statusMessage: null,
      won: null,
      shakeToken: 0,
    };
  }
  const config = loadConfig();
  return {
    screen: 'home',
    config,
    stats: loadStats(config.maxAttempts),
    solution: '',
    rows: [],
    current: '',
    statusMessage: null,
    won: null,
    shakeToken: 0,
  };
}

export function useAdivina() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(STATS_KEY, state.stats);
  }, [state.stats]);

  const configValidation = useMemo(() => validateAdivinaConfig(state.config), [state.config]);

  const keyStatuses = useMemo(() => keyboardStatuses(state.rows), [state.rows]);

  const goHome = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'home',
      solution: '',
      rows: [],
      current: '',
      statusMessage: null,
      won: null,
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'config', statusMessage: null }));
  }, []);

  const updateConfig = useCallback((partial: Partial<AdivinaConfig>) => {
    setState((prev) => {
      const config = { ...prev.config, ...partial };
      const stats =
        config.maxAttempts !== prev.config.maxAttempts
          ? loadStats(config.maxAttempts)
          : prev.stats;
      return { ...prev, config, stats };
    });
  }, []);

  const startGame = useCallback(() => {
    setState((prev) => {
      if (!validateAdivinaConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'play',
        solution: pickSolution(prev.config.adultMode, prev.solution || null),
        rows: [],
        current: '',
        statusMessage: null,
        won: null,
      };
    });
  }, []);

  const typeLetter = useCallback((letter: string) => {
    const ch = normalizeWord(letter);
    if (ch.length !== 1) return;
    setState((prev) => {
      if (prev.screen !== 'play' || prev.won !== null) return prev;
      if (prev.current.length >= WORD_LENGTH) return prev;
      return { ...prev, current: prev.current + ch, statusMessage: null };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'play' || prev.won !== null) return prev;
      if (!prev.current) return prev;
      return { ...prev, current: prev.current.slice(0, -1), statusMessage: null };
    });
  }, []);

  const submitGuess = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'play' || prev.won !== null) return prev;
      const guess = normalizeWord(prev.current);
      if (guess.length < WORD_LENGTH) {
        return {
          ...prev,
          statusMessage: 'Escribe 5 letras.',
          shakeToken: prev.shakeToken + 1,
        };
      }
      if (!isValidGuess(guess, prev.config.adultMode)) {
        return {
          ...prev,
          statusMessage: 'No está en el diccionario.',
          shakeToken: prev.shakeToken + 1,
        };
      }
      if (prev.config.hardMode) {
        const violation = hardModeViolation(guess, prev.rows);
        if (violation) {
          return {
            ...prev,
            statusMessage: violation,
            shakeToken: prev.shakeToken + 1,
          };
        }
      }

      const letters = evaluateGuess(guess, prev.solution);
      const rows = [...prev.rows, { word: guess, letters }];
      const won = guess === prev.solution;
      const lost = !won && rows.length >= prev.config.maxAttempts;

      if (won || lost) {
        return {
          ...prev,
          rows,
          current: '',
          won,
          screen: 'result' as const,
          statusMessage: won ? '¡Correcto!' : `Era ${prev.solution}.`,
          stats: recordResult(prev.stats, won, rows.length, prev.config.maxAttempts),
        };
      }

      return {
        ...prev,
        rows,
        current: '',
        statusMessage: null,
      };
    });
  }, []);

  useEffect(() => {
    if (state.screen === 'result' && state.won === true) {
      const id = window.setTimeout(() => fireConfetti(), 280);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [state.screen, state.won, state.rows.length]);

  const playAgain = useCallback(() => {
    startGame();
  }, [startGame]);

  return {
    state,
    configValidation,
    keyStatuses,
    goHome,
    goConfig,
    updateConfig,
    startGame,
    typeLetter,
    backspace,
    submitGuess,
    playAgain,
  };
}
