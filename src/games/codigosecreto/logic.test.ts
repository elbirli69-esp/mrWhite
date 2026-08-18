import { describe, expect, it } from 'vitest';
import {
  applyGuess,
  BOARD_SIZE,
  buildKindLayout,
  createDeal,
  createPlayers,
  MAX_CLUE_COUNT,
  MIN_CLUE_COUNT,
  remainingForTeam,
  validateClue,
  validateCodigoSecretoConfig,
} from './logic';

describe('codigo secreto logic', () => {
  it('valida el número de jugadores', () => {
    expect(validateCodigoSecretoConfig({ playerCount: 6, adultMode: false }).valid).toBe(true);
    expect(validateCodigoSecretoConfig({ playerCount: 3, adultMode: false }).valid).toBe(false);
    expect(validateCodigoSecretoConfig({ playerCount: 13, adultMode: false }).valid).toBe(false);
  });

  it('crea un tablero 5×5 con el reparto clásico', () => {
    const deal = createDeal(false, 'red');
    expect(deal.cards).toHaveLength(BOARD_SIZE);
    expect(deal.startingTeam).toBe('red');
    expect(deal.cards.filter((c) => c.kind === 'red')).toHaveLength(9);
    expect(deal.cards.filter((c) => c.kind === 'blue')).toHaveLength(8);
    expect(deal.cards.filter((c) => c.kind === 'neutral')).toHaveLength(7);
    expect(deal.cards.filter((c) => c.kind === 'assassin')).toHaveLength(1);
    expect(new Set(deal.cards.map((c) => c.word)).size).toBe(BOARD_SIZE);
  });

  it('reparte equipos y un jefe de espías por bando', () => {
    const players = createPlayers(['Ana', 'Bea', 'Cris', 'Dani', 'Eva', 'Fran']);
    expect(players).toHaveLength(6);
    expect(players.filter((p) => p.team === 'red').length).toBe(3);
    expect(players.filter((p) => p.team === 'blue').length).toBe(3);
    expect(players.filter((p) => p.isSpymaster && p.team === 'red')).toHaveLength(1);
    expect(players.filter((p) => p.isSpymaster && p.team === 'blue')).toHaveLength(1);
  });

  it('valida pistas de 1 a 5 y bloquea palabras del tablero', () => {
    const cards = createDeal(false, 'blue').cards;
    const onBoard = cards.find((c) => !/\s/.test(c.word))!.word;
    expect(validateClue('fruta', 3, cards)).toBeNull();
    expect(validateClue('', 2, cards)).toMatch(/pista/i);
    expect(validateClue('dos palabras', 2, cards)).toMatch(/sola palabra/i);
    expect(validateClue('fruta', 0, cards)).toMatch(/entre/i);
    expect(validateClue('fruta', MAX_CLUE_COUNT + 1, cards)).toMatch(/entre/i);
    expect(validateClue(onBoard, MIN_CLUE_COUNT, cards)).toMatch(/tablero/i);
  });

  it('aplica aciertos, fallo y asesino', () => {
    const kinds = buildKindLayout('red');
    const cards = kinds.map((kind, id) => ({
      id,
      word: `P${id}`,
      kind,
      revealed: false,
    }));
    const teamCard = cards.find((c) => c.kind === 'red')!;
    const miss = cards.find((c) => c.kind === 'neutral')!;
    const assassin = cards.find((c) => c.kind === 'assassin')!;

    const hit = applyGuess({
      cards,
      cardId: teamCard.id,
      activeTeam: 'red',
      guessesLeft: 2,
    });
    expect(hit?.outcome.type).toBe('continue');
    if (hit?.outcome.type === 'continue') {
      expect(hit.outcome.guessesLeft).toBe(1);
      expect(remainingForTeam(hit.cards, 'red')).toBe(8);
    }

    const turnEnd = applyGuess({
      cards,
      cardId: miss.id,
      activeTeam: 'red',
      guessesLeft: 2,
    });
    expect(turnEnd?.outcome.type).toBe('endTurn');
    if (turnEnd?.outcome.type === 'endTurn') {
      expect(turnEnd.outcome.nextTeam).toBe('blue');
    }

    const death = applyGuess({
      cards,
      cardId: assassin.id,
      activeTeam: 'red',
      guessesLeft: 1,
    });
    expect(death?.outcome.type).toBe('assassin');
    if (death?.outcome.type === 'assassin') {
      expect(death.outcome.winner).toBe('blue');
    }
  });

  it('permite ganar al completar las palabras del equipo', () => {
    const cards = Array.from({ length: BOARD_SIZE }, (_, id) => ({
      id,
      word: `W${id}`,
      kind: (id === 0 ? 'red' : id === 1 ? 'blue' : 'neutral') as const,
      revealed: id !== 0,
    }));
    // Force classic counts for remaining helper: only one red left unrevealed.
    const result = applyGuess({
      cards: cards.map((c, id) =>
        id === 0
          ? { ...c, kind: 'red', revealed: false }
          : { ...c, kind: id < 9 ? 'red' : 'blue', revealed: true },
      ),
      cardId: 0,
      activeTeam: 'red',
      guessesLeft: 1,
    });
    expect(result?.outcome.type).toBe('win');
    if (result?.outcome.type === 'win') {
      expect(result.outcome.winner).toBe('red');
    }
  });
});
