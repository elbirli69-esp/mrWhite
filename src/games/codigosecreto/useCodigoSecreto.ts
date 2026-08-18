import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyGuess,
  createDeal,
  createPlayers,
  DEFAULT_CONFIG,
  isCodigoSecretoConfig,
  oppositeTeam,
  remainingForTeam,
  teamLabel,
  validateClue,
  validateCodigoSecretoConfig,
  type ActiveClue,
  type BoardCard,
  type CodigoSecretoConfig,
  type CodigoSecretoDeal,
  type CodigoSecretoPlayer,
  type CodigoSecretoScreen,
  type TeamColor,
} from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'codigosecreto-config';
const NAMES_KEY = 'codigosecreto-names';

interface State {
  screen: CodigoSecretoScreen;
  config: CodigoSecretoConfig;
  playerNames: string[];
  players: CodigoSecretoPlayer[];
  deal: CodigoSecretoDeal | null;
  currentPlayerIndex: number;
  revealed: boolean;
  activeTeam: TeamColor;
  clue: ActiveClue | null;
  clueDraft: string;
  clueCount: number;
  guessesLeft: number;
  lastGuessWord: string | null;
  lastGuessKind: BoardCard['kind'] | null;
  endTitle: string;
  endSubtitle: string;
  winner: TeamColor | null;
  namesError: string | null;
  clueError: string | null;
}

function blankMatchFields() {
  return {
    currentPlayerIndex: 0,
    revealed: false,
    activeTeam: 'red' as TeamColor,
    clue: null as ActiveClue | null,
    clueDraft: '',
    clueCount: 1,
    guessesLeft: 0,
    lastGuessWord: null as string | null,
    lastGuessKind: null as BoardCard['kind'] | null,
    endTitle: '',
    endSubtitle: '',
    winner: null as TeamColor | null,
    namesError: null as string | null,
    clueError: null as string | null,
  };
}

function initialState(): State {
  const loaded =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isCodigoSecretoConfig)
      : { ...DEFAULT_CONFIG };
  const config = { ...DEFAULT_CONFIG, ...loaded, adultMode: loaded.adultMode ?? false };
  const playerNames =
    typeof window !== 'undefined'
      ? loadNames(NAMES_KEY, config.playerCount)
      : resizeNames([], config.playerCount);

  return {
    screen: 'home',
    config,
    playerNames,
    players: [],
    deal: null,
    ...blankMatchFields(),
  };
}

export function useCodigoSecreto() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(NAMES_KEY, state.playerNames);
  }, [state.playerNames]);

  const configValidation = useMemo(
    () => validateCodigoSecretoConfig(state.config),
    [state.config],
  );

  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
  const nextRevealPlayer =
    state.screen === 'pass'
      ? (state.players[state.currentPlayerIndex + 1] ?? null)
      : null;
  const activeSpymaster =
    state.players.find((p) => p.team === state.activeTeam && p.isSpymaster) ?? null;

  const goHome = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'home',
      players: [],
      deal: null,
      ...blankMatchFields(),
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'config',
      players: [],
      deal: null,
      ...blankMatchFields(),
    }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      if (!validateCodigoSecretoConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
        players: [],
        deal: null,
        ...blankMatchFields(),
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<CodigoSecretoConfig>) => {
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
      return { ...prev, playerNames, namesError: null };
    });
  }, []);

  const startDeal = useCallback(() => {
    setState((prev) => {
      if (!validateCodigoSecretoConfig(prev.config).valid) return prev;
      const namesError = validateNames(prev.playerNames, prev.config.playerCount);
      if (namesError) return { ...prev, namesError };
      const players = createPlayers(prev.playerNames);
      const deal = createDeal(prev.config.adultMode);
      return {
        ...prev,
        screen: 'reveal',
        players,
        deal,
        ...blankMatchFields(),
        activeTeam: deal.startingTeam,
      };
    });
  }, []);

  const revealRole = useCallback(() => {
    setState((prev) => ({ ...prev, revealed: true }));
  }, []);

  const passToNext = useCallback(() => {
    setState((prev) => {
      if (prev.currentPlayerIndex >= prev.players.length - 1) {
        return { ...prev, screen: 'ready', revealed: false };
      }
      return { ...prev, screen: 'pass', revealed: false };
    });
  }, []);

  /** Avanza solo cuando la persona correcta confirma que tiene el móvil. */
  const confirmHandoff = useCallback(() => {
    setState((prev) => {
      if (prev.screen === 'pass') {
        return {
          ...prev,
          screen: 'reveal',
          currentPlayerIndex: prev.currentPlayerIndex + 1,
          revealed: false,
        };
      }
      if (prev.screen === 'passClue') {
        return {
          ...prev,
          screen: 'clue',
          clueDraft: '',
          clueCount: 1,
          clueError: null,
        };
      }
      if (prev.screen === 'passGuess') {
        return { ...prev, screen: 'guess' };
      }
      return prev;
    });
  }, []);

  const beginPlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'passClue',
      clue: null,
      guessesLeft: 0,
      lastGuessWord: null,
      lastGuessKind: null,
    }));
  }, []);

  const setClueDraft = useCallback((value: string) => {
    setState((prev) => ({ ...prev, clueDraft: value, clueError: null }));
  }, []);

  const setClueCount = useCallback((count: number) => {
    setState((prev) => ({ ...prev, clueCount: count, clueError: null }));
  }, []);

  const submitClue = useCallback(() => {
    setState((prev) => {
      if (!prev.deal) return prev;
      const error = validateClue(prev.clueDraft, prev.clueCount, prev.deal.cards);
      if (error) return { ...prev, clueError: error };
      return {
        ...prev,
        screen: 'passGuess',
        clue: { word: prev.clueDraft.trim(), count: prev.clueCount },
        guessesLeft: prev.clueCount,
        clueError: null,
        lastGuessWord: null,
        lastGuessKind: null,
      };
    });
  }, []);

  const guessCard = useCallback((cardId: number) => {
    setState((prev) => {
      if (!prev.deal || prev.screen !== 'guess') return prev;
      const result = applyGuess({
        cards: prev.deal.cards,
        cardId,
        activeTeam: prev.activeTeam,
        guessesLeft: prev.guessesLeft,
      });
      if (!result) return prev;

      const { cards, outcome } = result;
      const deal = { ...prev.deal, cards };

      if (outcome.type === 'assassin' || outcome.type === 'win') {
        return {
          ...prev,
          deal,
          screen: 'end',
          winner: outcome.winner,
          lastGuessWord: outcome.card.word,
          lastGuessKind: outcome.card.kind,
          endTitle:
            outcome.type === 'assassin'
              ? `¡Asesino! Ganan los ${teamLabel(outcome.winner)}`
              : `Ganan los ${teamLabel(outcome.winner)}`,
          endSubtitle:
            outcome.type === 'assassin'
              ? `Tocasteis «${outcome.card.word}».`
              : `Quedaban ${remainingForTeam(cards, oppositeTeam(outcome.winner))} del otro equipo.`,
          guessesLeft: 0,
        };
      }

      if (outcome.type === 'endTurn') {
        return {
          ...prev,
          deal,
          screen: 'passClue',
          activeTeam: outcome.nextTeam,
          clue: null,
          guessesLeft: 0,
          lastGuessWord: outcome.card.word,
          lastGuessKind: outcome.card.kind,
        };
      }

      return {
        ...prev,
        deal,
        guessesLeft: outcome.guessesLeft,
        lastGuessWord: outcome.card.word,
        lastGuessKind: outcome.card.kind,
      };
    });
  }, []);

  const endTurnEarly = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'guess') return prev;
      return {
        ...prev,
        screen: 'passClue',
        activeTeam: oppositeTeam(prev.activeTeam),
        clue: null,
        guessesLeft: 0,
        lastGuessWord: null,
        lastGuessKind: null,
      };
    });
  }, []);

  const newGame = useCallback(() => {
    setState((prev) => {
      if (prev.players.length === 0) return prev;
      const deal = createDeal(prev.config.adultMode);
      return {
        ...prev,
        screen: 'ready',
        deal,
        ...blankMatchFields(),
        activeTeam: deal.startingTeam,
        players: prev.players,
      };
    });
  }, []);

  return {
    state,
    currentPlayer,
    nextRevealPlayer,
    activeSpymaster,
    configValidation,
    goHome,
    goConfig,
    goNames,
    updateConfig,
    updatePlayerName,
    startDeal,
    revealRole,
    passToNext,
    confirmHandoff,
    beginPlay,
    setClueDraft,
    setClueCount,
    submitClue,
    guessCard,
    endTurnEarly,
    newGame,
  };
}
