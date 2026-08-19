import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ROUND_ORDER,
  buildPackSlips,
  createPlayers,
  DEFAULT_CONFIG,
  isPapelitosConfig,
  makeTableSlips,
  refillBowl,
  validatePapelitosConfig,
  validatePlayerSlips,
  type PapelitosConfig,
  type PapelitosPlayer,
  type PapelitosScreen,
  type RoundKind,
  type Slip,
} from './logic';
import { loadJson, loadNames, resizeNames, saveJson, validateNames } from '../shared/persist';

const CONFIG_KEY = 'papelitos-config';
const NAMES_KEY = 'papelitos-names';

interface State {
  screen: PapelitosScreen;
  config: PapelitosConfig;
  playerNames: string[];
  players: PapelitosPlayer[];
  namesError: string | null;
  writeIndex: number;
  writeDrafts: Record<number, string[]>;
  writeError: string | null;
  allSlips: Slip[];
  bowl: Slip[];
  currentSlip: Slip | null;
  roundIndex: number;
  activeTeam: 0 | 1;
  /** Índice del jugador que da la pista dentro de su equipo (rotación). */
  clueGiverCursor: [number, number];
  secondsLeft: number;
  turnCorrect: number;
  turnSkipped: number;
  scores: [number, number];
  roundCaught: number;
}

function blankPlay() {
  return {
    writeIndex: 0,
    writeDrafts: {} as Record<number, string[]>,
    writeError: null as string | null,
    allSlips: [] as Slip[],
    bowl: [] as Slip[],
    currentSlip: null as Slip | null,
    roundIndex: 0,
    activeTeam: 0 as 0 | 1,
    clueGiverCursor: [0, 0] as [number, number],
    secondsLeft: DEFAULT_CONFIG.turnSeconds,
    turnCorrect: 0,
    turnSkipped: 0,
    scores: [0, 0] as [number, number],
    roundCaught: 0,
    namesError: null as string | null,
  };
}

function initialState(): State {
  const loaded =
    typeof window !== 'undefined'
      ? loadJson(CONFIG_KEY, { ...DEFAULT_CONFIG }, isPapelitosConfig)
      : { ...DEFAULT_CONFIG };
  const config: PapelitosConfig = {
    ...DEFAULT_CONFIG,
    ...loaded,
    adultMode: loaded.adultMode ?? false,
    categoryIds: loaded.categoryIds?.length ? loaded.categoryIds : DEFAULT_CONFIG.categoryIds,
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
    ...blankPlay(),
    secondsLeft: config.turnSeconds,
  };
}

function teamPlayers(players: PapelitosPlayer[], team: 0 | 1): PapelitosPlayer[] {
  return players.filter((p) => p.team === team);
}

function pickClueGiver(players: PapelitosPlayer[], team: 0 | 1, cursor: [number, number]): PapelitosPlayer | null {
  const roster = teamPlayers(players, team);
  if (roster.length === 0) return null;
  const idx = cursor[team] % roster.length;
  return roster[idx] ?? roster[0] ?? null;
}

export function usePapelitos() {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    saveJson(CONFIG_KEY, state.config);
  }, [state.config]);

  useEffect(() => {
    saveJson(NAMES_KEY, state.playerNames);
  }, [state.playerNames]);

  const configValidation = useMemo(
    () => validatePapelitosConfig(state.config),
    [state.config],
  );

  const roundKind: RoundKind = ROUND_ORDER[state.roundIndex] ?? 'describe';
  const writingPlayer = state.players[state.writeIndex] ?? null;
  const clueGiver = pickClueGiver(state.players, state.activeTeam, state.clueGiverCursor);

  const goHome = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'home',
      players: [],
      ...blankPlay(),
      secondsLeft: prev.config.turnSeconds,
    }));
  }, []);

  const goConfig = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'config',
      players: [],
      ...blankPlay(),
      secondsLeft: prev.config.turnSeconds,
    }));
  }, []);

  const goNames = useCallback(() => {
    setState((prev) => {
      if (!validatePapelitosConfig(prev.config).valid) return prev;
      return {
        ...prev,
        screen: 'names',
        playerNames: resizeNames(prev.playerNames, prev.config.playerCount),
        players: [],
        ...blankPlay(),
        secondsLeft: prev.config.turnSeconds,
      };
    });
  }, []);

  const updateConfig = useCallback((partial: Partial<PapelitosConfig>) => {
    setState((prev) => {
      const config = { ...prev.config, ...partial };
      if (partial.adultMode === false) {
        config.categoryIds = config.categoryIds.filter((id) => id !== 'adult');
      }
      return {
        ...prev,
        config,
        playerNames: resizeNames(prev.playerNames, config.playerCount),
      };
    });
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setState((prev) => {
      const has = prev.config.categoryIds.includes(categoryId);
      const categoryIds = has
        ? prev.config.categoryIds.filter((id) => id !== categoryId)
        : [...prev.config.categoryIds, categoryId];
      return { ...prev, config: { ...prev.config, categoryIds } };
    });
  }, []);

  const updatePlayerName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const playerNames = [...prev.playerNames];
      playerNames[index] = name;
      return { ...prev, playerNames, namesError: null };
    });
  }, []);

  const startAfterNames = useCallback(() => {
    setState((prev) => {
      if (!validatePapelitosConfig(prev.config).valid) return prev;
      const namesError = validateNames(prev.playerNames, prev.config.playerCount);
      if (namesError) return { ...prev, namesError };
      const players = createPlayers(prev.playerNames);

      if (prev.config.paperSource === 'pack') {
        const allSlips = buildPackSlips(
          prev.config.categoryIds,
          prev.config.packCount,
          prev.config.adultMode,
        );
        return {
          ...prev,
          players,
          ...blankPlay(),
          namesError: null,
          allSlips,
          bowl: refillBowl(allSlips),
          screen: 'ready',
          secondsLeft: prev.config.turnSeconds,
          activeTeam: 0,
        };
      }

      const writeDrafts: Record<number, string[]> = {};
      for (const p of players) {
        writeDrafts[p.id] = Array.from({ length: prev.config.papersPerPlayer }, () => '');
      }
      return {
        ...prev,
        players,
        ...blankPlay(),
        namesError: null,
        writeDrafts,
        screen: 'write',
        secondsLeft: prev.config.turnSeconds,
      };
    });
  }, []);

  const setWriteDraft = useCallback((index: number, value: string) => {
    setState((prev) => {
      const player = prev.players[prev.writeIndex];
      if (!player) return prev;
      const drafts = [...(prev.writeDrafts[player.id] ?? [])];
      drafts[index] = value;
      return {
        ...prev,
        writeDrafts: { ...prev.writeDrafts, [player.id]: drafts },
        writeError: null,
      };
    });
  }, []);

  const submitWrite = useCallback(() => {
    setState((prev) => {
      const player = prev.players[prev.writeIndex];
      if (!player) return prev;
      const texts = prev.writeDrafts[player.id] ?? [];
      const check = validatePlayerSlips(texts, prev.config.papersPerPlayer);
      if (!check.valid) return { ...prev, writeError: check.error };

      if (prev.writeIndex >= prev.players.length - 1) {
        const entries = prev.players.map((p) => ({
          playerId: p.id,
          texts: prev.writeDrafts[p.id] ?? [],
        }));
        const allSlips = makeTableSlips(entries);
        return {
          ...prev,
          writeError: null,
          allSlips,
          bowl: refillBowl(allSlips),
          screen: 'ready',
        };
      }
      return { ...prev, writeError: null, screen: 'passWrite' };
    });
  }, []);

  const confirmPassWrite = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'passWrite') return prev;
      return {
        ...prev,
        screen: 'write',
        writeIndex: prev.writeIndex + 1,
        writeError: null,
      };
    });
  }, []);

  const confirmPassTurn = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'passTurn') return prev;
      const currentSlip = prev.bowl[0] ?? null;
      return {
        ...prev,
        screen: 'play',
        currentSlip,
        secondsLeft: prev.config.turnSeconds,
        turnCorrect: 0,
        turnSkipped: 0,
      };
    });
  }, []);

  // Timer during play
  useEffect(() => {
    if (state.screen !== 'play') return undefined;
    if (state.secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setState((prev) => {
        if (prev.screen !== 'play') return prev;
        const next = prev.secondsLeft - 1;
        if (next > 0) return { ...prev, secondsLeft: next };
        return { ...prev, secondsLeft: 0, screen: 'turnEnd' };
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [state.screen, state.secondsLeft]);

  const beginRound = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'roundIntro',
      roundCaught: 0,
    }));
  }, []);

  const startTurn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'passTurn',
    }));
  }, []);

  const markCorrect = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'play' || !prev.currentSlip) return prev;
      const remaining = prev.bowl.slice(1);
      const scores: [number, number] = [...prev.scores];
      scores[prev.activeTeam] += 1;
      const turnCorrect = prev.turnCorrect + 1;
      const roundCaught = prev.roundCaught + 1;

      if (remaining.length === 0) {
        return {
          ...prev,
          bowl: [],
          currentSlip: null,
          scores,
          turnCorrect,
          roundCaught,
          screen: 'turnEnd',
          secondsLeft: 0,
        };
      }
      return {
        ...prev,
        bowl: remaining,
        currentSlip: remaining[0] ?? null,
        scores,
        turnCorrect,
        roundCaught,
      };
    });
  }, []);

  const markSkip = useCallback(() => {
    setState((prev) => {
      if (prev.screen !== 'play' || !prev.currentSlip || prev.bowl.length <= 1) {
        return prev.screen === 'play'
          ? { ...prev, turnSkipped: prev.turnSkipped + 1 }
          : prev;
      }
      const [first, ...rest] = prev.bowl;
      if (!first) return prev;
      const bowl = [...rest, first];
      return {
        ...prev,
        bowl,
        currentSlip: bowl[0] ?? null,
        turnSkipped: prev.turnSkipped + 1,
      };
    });
  }, []);

  const finishTurn = useCallback(() => {
    setState((prev) => {
      // Advance clue giver for the team that just played, then switch team.
      const cursor: [number, number] = [...prev.clueGiverCursor];
      cursor[prev.activeTeam] = cursor[prev.activeTeam] + 1;
      const nextTeam: 0 | 1 = prev.activeTeam === 0 ? 1 : 0;

      // Bowl empty → next round or match end.
      if (prev.bowl.length === 0) {
        if (prev.roundIndex >= ROUND_ORDER.length - 1) {
          return {
            ...prev,
            screen: 'matchEnd',
            clueGiverCursor: cursor,
            currentSlip: null,
          };
        }
        const bowl = refillBowl(prev.allSlips);
        return {
          ...prev,
          screen: 'roundIntro',
          roundIndex: prev.roundIndex + 1,
          bowl,
          currentSlip: null,
          activeTeam: nextTeam,
          clueGiverCursor: cursor,
          roundCaught: 0,
          turnCorrect: 0,
          turnSkipped: 0,
          secondsLeft: prev.config.turnSeconds,
        };
      }

      return {
        ...prev,
        screen: 'passTurn',
        activeTeam: nextTeam,
        clueGiverCursor: cursor,
        currentSlip: null,
      };
    });
  }, []);

  const newGame = useCallback(() => {
    setState((prev) => {
      if (prev.players.length === 0) return prev;
      if (prev.config.paperSource === 'pack') {
        const allSlips = buildPackSlips(
          prev.config.categoryIds,
          prev.config.packCount,
          prev.config.adultMode,
        );
        return {
          ...prev,
          screen: 'ready',
          ...blankPlay(),
          allSlips,
          bowl: refillBowl(allSlips),
          secondsLeft: prev.config.turnSeconds,
          players: prev.players,
        };
      }
      const writeDrafts: Record<number, string[]> = {};
      for (const p of prev.players) {
        writeDrafts[p.id] = Array.from({ length: prev.config.papersPerPlayer }, () => '');
      }
      return {
        ...prev,
        screen: 'write',
        ...blankPlay(),
        writeDrafts,
        secondsLeft: prev.config.turnSeconds,
        players: prev.players,
      };
    });
  }, []);

  return {
    state,
    configValidation,
    roundKind,
    writingPlayer,
    clueGiver,
    goHome,
    goConfig,
    goNames,
    updateConfig,
    toggleCategory,
    updatePlayerName,
    startAfterNames,
    setWriteDraft,
    submitWrite,
    confirmPassWrite,
    confirmPassTurn,
    beginRound,
    startTurn,
    markCorrect,
    markSkip,
    finishTurn,
    newGame,
  };
}
