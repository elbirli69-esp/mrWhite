import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildStrokeOrder,
  createPlayers,
  DEFAULT_CONFIG,
  guessesMatch,
  isFakeArtistConfig,
  pickWord,
  validateConfig,
  type FakeArtistConfig,
  type FakeArtistPlayer,
  type FakeArtistScreen,
  type Stroke,
} from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'fakeartist-config';
const NAMES_KEY = 'fakeartist-names';
const PASS_MS = 1000;

interface State {
  screen: FakeArtistScreen;
  config: FakeArtistConfig;
  playerNames: string[];
  players: FakeArtistPlayer[];
  secretWord: string;
  currentPlayerIndex: number;
  revealed: boolean;
  strokeOrder: number[];
  strokeIndex: number;
  strokes: Stroke[];
  currentPoints: Stroke['points'];
  drawing: boolean;
  accusedId: number | null;
  guessInput: string;
  endTitle: string;
  endSubtitle: string;
}

function initialState(): State {
  const loaded =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isFakeArtistConfig)
      : { ...DEFAULT_CONFIG };
  const config = { ...DEFAULT_CONFIG, ...loaded, adultMode: loaded.adultMode ?? false };
  const playerNames =
    typeof window !== 'undefined' ? loadNames(NAMES_KEY, config.playerCount) : resizeNames([], config.playerCount);
  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    secretWord: '',
    currentPlayerIndex: 0,
    revealed: false,
    strokeOrder: [],
    strokeIndex: 0,
    strokes: [],
    currentPoints: [],
    drawing: false,
    accusedId: null,
    guessInput: '',
    endTitle: '',
    endSubtitle: '',
  };
}

export function useFakeArtist() {
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
      secretWord: '',
      strokes: [],
      strokeOrder: [],
      strokeIndex: 0,
      currentPoints: [],
      drawing: false,
      accusedId: null,
      guessInput: '',
      endTitle: '',
      endSubtitle: '',
      currentPlayerIndex: 0,
      revealed: false,
    }));
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

  const updateConfig = useCallback((partial: Partial<FakeArtistConfig>) => {
    setState((prev) => {
      const config = { ...prev.config, ...partial };
      if (config.fakerCount >= config.playerCount) {
        config.fakerCount = Math.max(1, config.playerCount - 1);
      }
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
      if (!validateConfig(prev.config).valid) return prev;
      if (validateNames(prev.playerNames, prev.config.playerCount)) return prev;
      const previousFakerIds = prev.players.filter((p) => p.role === 'faker').map((p) => p.id);
      const players = createPlayers(prev.config, prev.playerNames, previousFakerIds);
      return {
        ...prev,
        screen: 'reveal',
        players,
        secretWord: pickWord(prev.config.adultMode),
        currentPlayerIndex: 0,
        revealed: false,
        strokes: [],
        strokeOrder: buildStrokeOrder(players, prev.config.strokesPerPlayer),
        strokeIndex: 0,
        currentPoints: [],
        drawing: false,
        accusedId: null,
        guessInput: '',
        endTitle: '',
        endSubtitle: '',
      };
    });
  }, []);

  const revealWord = useCallback(() => setState((prev) => ({ ...prev, revealed: true })), []);

  const passToNext = useCallback(() => {
    setState((prev) => {
      if (prev.currentPlayerIndex >= prev.players.length - 1) {
        return { ...prev, screen: 'ready', revealed: false };
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

  const beginDraw = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'draw', strokeIndex: 0, strokes: [], currentPoints: [] }));
  }, []);

  const setCurrentPoints = useCallback((points: Stroke['points']) => {
    setState((prev) => ({ ...prev, currentPoints: points }));
  }, []);

  const commitStroke = useCallback(() => {
    setState((prev) => {
      if (prev.currentPoints.length < 2) return prev;
      const playerId = prev.strokeOrder[prev.strokeIndex];
      if (!playerId) return prev;
      const strokes = [...prev.strokes, { playerId, points: prev.currentPoints }];
      const nextIndex = prev.strokeIndex + 1;
      if (nextIndex >= prev.strokeOrder.length) {
        return {
          ...prev,
          strokes,
          currentPoints: [],
          strokeIndex: nextIndex,
          screen: 'vote',
        };
      }
      return {
        ...prev,
        strokes,
        currentPoints: [],
        strokeIndex: nextIndex,
      };
    });
  }, []);

  const accuse = useCallback((playerId: number) => {
    setState((prev) => {
      const accused = prev.players.find((p) => p.id === playerId);
      if (!accused) return prev;
      if (accused.role === 'faker' && prev.config.fakeCanGuess) {
        return { ...prev, accusedId: playerId, screen: 'guess', guessInput: '' };
      }
      if (accused.role === 'faker') {
        return {
          ...prev,
          accusedId: playerId,
          screen: 'end',
          endTitle: '¡Pillasteis al falso!',
          endSubtitle: `La palabra era «${prev.secretWord}».`,
        };
      }
      return {
        ...prev,
        accusedId: playerId,
        screen: 'end',
        endTitle: 'Fallasteis',
        endSubtitle: `${accused.name} era artista. La palabra era «${prev.secretWord}».`,
      };
    });
  }, []);

  const submitGuess = useCallback(() => {
    setState((prev) => {
      const ok = guessesMatch(prev.guessInput, prev.secretWord);
      return {
        ...prev,
        screen: 'end',
        endTitle: ok ? 'El falso adivinó' : 'El falso no adivinó',
        endSubtitle: ok
          ? `Acertó «${prev.secretWord}» y se sale con la suya.`
          : `La palabra era «${prev.secretWord}». Ganan los artistas.`,
      };
    });
  }, []);

  const skipGuess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'end',
      endTitle: '¡Pillasteis al falso!',
      endSubtitle: `No adivinó. La palabra era «${prev.secretWord}».`,
    }));
  }, []);

  const setGuessInput = useCallback((guessInput: string) => {
    setState((prev) => ({ ...prev, guessInput }));
  }, []);

  const currentDrawerId = state.strokeOrder[state.strokeIndex] ?? null;
  const currentDrawer = useMemo(
    () => state.players.find((p) => p.id === currentDrawerId) ?? null,
    [state.players, currentDrawerId],
  );

  return {
    state,
    currentPlayer: state.players[state.currentPlayerIndex] ?? null,
    currentDrawer,
    configValidation: validateConfig(state.config),
    namesError: validateNames(state.playerNames, state.config.playerCount),
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    startDeal,
    revealWord,
    passToNext,
    beginDraw,
    setCurrentPoints,
    commitStroke,
    accuse,
    submitGuess,
    skipGuess,
    setGuessInput,
  };
}
