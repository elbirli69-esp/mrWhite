import { describe, expect, it } from 'vitest';
import {
  createPlayers,
  dealHands,
  productLabel,
  refillHand,
  sellerIds,
  validateConfig,
  winnerByAi,
  DEFAULT_CONFIG,
  HAND_SIZE,
  createMatchDecks,
} from './logic';

describe('snake oil logic', () => {
  it('valida config por defecto', () => {
    expect(validateConfig(DEFAULT_CONFIG).valid).toBe(true);
    expect(validateConfig({ ...DEFAULT_CONFIG, playerCount: 2 }).valid).toBe(false);
  });

  it('forma el nombre del producto', () => {
    expect(productLabel('Rayo', 'Calcetín')).toBe('Rayo Calcetín');
  });

  it('reparte manos de 6 y rellena tras jugar', () => {
    const decks = createMatchDecks(false);
    const players = createPlayers(['Ana', 'Bea', 'Cris']);
    const dealt = dealHands(players, decks.wordDeck);
    expect(dealt.players.every((p) => p.hand.length === HAND_SIZE)).toBe(true);

    const used: [string, string] = [dealt.players[0]!.hand[0]!, dealt.players[0]!.hand[1]!];
    const refilled = refillHand(dealt.players[0]!.hand, used, dealt.deck);
    expect(refilled.hand).toHaveLength(HAND_SIZE);
    expect(refilled.hand).not.toContain(used[0]);
  });

  it('lista vendedores sin el cliente', () => {
    const players = createPlayers(['A', 'B', 'C', 'D']);
    expect(sellerIds(players, 2)).toEqual([1, 3, 4]);
  });

  it('elige ganador por nota IA', () => {
    const id = winnerByAi([
      {
        playerId: 1,
        wordA: 'A',
        wordB: 'B',
        product: 'A B',
        transcript: '',
        aiScore: 6,
        aiFeedback: null,
        audioUrl: null,
      },
      {
        playerId: 3,
        wordA: 'C',
        wordB: 'D',
        product: 'C D',
        transcript: '',
        aiScore: 8.5,
        aiFeedback: null,
        audioUrl: null,
      },
    ]);
    expect(id).toBe(3);
  });
});
