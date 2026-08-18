import { describe, expect, it } from 'vitest';
import {
  applyGuess,
  applyGuesses,
  BOARD_SIZE,
  buildGuessResult,
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

  it('permite varias adivinanzas correctas en el mismo turno', () => {
    const kinds = buildKindLayout('red');
    const cards = kinds.map((kind, id) => ({
      id,
      word: `P${id}`,
      kind,
      revealed: false,
    }));
    const teamCards = cards.filter((c) => c.kind === 'red').slice(0, 2);
    const result = applyGuesses({
      cards,
      cardIds: teamCards.map((c) => c.id),
      activeTeam: 'red',
      guessesLeft: 3,
    });
    expect(result.terminal).toBeNull();
    expect(result.guessesLeft).toBe(1);
    expect(result.revealedBatch).toHaveLength(2);
    expect(teamCards.every((c) => result.cards.find((x) => x.id === c.id)?.revealed)).toBe(true);
  });

  it('si aciertas exactamente el número de la pista, acaba el turno', () => {
    const kinds = buildKindLayout('blue');
    const cards = kinds.map((kind, id) => ({
      id,
      word: `B${id}`,
      kind,
      revealed: false,
    }));
    const teamCard = cards.find((c) => c.kind === 'blue')!;
    const result = applyGuesses({
      cards,
      cardIds: [teamCard.id],
      activeTeam: 'blue',
      guessesLeft: 1,
    });
    expect(result.terminal?.type).toBe('endTurn');
    expect(result.revealedBatch).toHaveLength(1);
    if (result.terminal?.type === 'endTurn') {
      expect(result.terminal.nextTeam).toBe('red');
    }
  });

  it('con pista de 3, el primer acierto no pasa el turno', () => {
    const kinds = buildKindLayout('red');
    const cards = kinds.map((kind, id) => ({
      id,
      word: `R${id}`,
      kind,
      revealed: false,
    }));
    const teamCard = cards.find((c) => c.kind === 'red')!;
    const result = applyGuesses({
      cards,
      cardIds: [teamCard.id],
      activeTeam: 'red',
      guessesLeft: 3,
    });
    expect(result.terminal).toBeNull();
    expect(result.guessesLeft).toBe(2);
  });

  it('clasifica el lote revelado para la pantalla de resultado', () => {
    const kinds = buildKindLayout('red');
    const cards = kinds.map((kind, id) => ({
      id,
      word: `X${id}`,
      kind,
      revealed: false,
    }));
    const own = cards.find((c) => c.kind === 'red')!;
    const rival = cards.find((c) => c.kind === 'blue')!;
    const result = applyGuesses({
      cards,
      cardIds: [own.id, rival.id],
      activeTeam: 'red',
      guessesLeft: 3,
    });
    const summary = buildGuessResult({
      activeTeam: 'red',
      revealedBatch: result.revealedBatch,
      guessesLeft: result.guessesLeft,
      terminal: result.terminal,
    });
    expect(summary.items.map((i) => i.kind)).toEqual(['red', 'blue']);
    expect(summary.next.type).toBe('endTurn');
  });

  it('el veneno termina la partida en el lote', () => {
    const kinds = buildKindLayout('red');
    const cards = kinds.map((kind, id) => ({
      id,
      word: `V${id}`,
      kind,
      revealed: false,
    }));
    const assassin = cards.find((c) => c.kind === 'assassin')!;
    const result = applyGuesses({
      cards,
      cardIds: [assassin.id],
      activeTeam: 'red',
      guessesLeft: 2,
    });
    expect(result.terminal?.type).toBe('assassin');
    expect(result.revealedBatch[0]?.kind).toBe('assassin');
  });
});
