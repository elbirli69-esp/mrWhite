import { describe, expect, it } from 'vitest';
import {
  ADULT_CUSTOMERS,
  CUSTOMERS,
  EVENTS,
  OBJECTION_TYPES,
  WORDS,
  customerPool,
  wordPool,
} from './content';
import {
  applyComboToScore,
  combineRoundScore,
  dealRound,
  detectBadges,
  emptyStats,
  formatPresets,
  nextCombo,
  normalizeConfig,
  pickInterestingWords,
  scoreLabel,
  updateStats,
  validateConfig,
} from './engine';
import { DEFAULT_CONFIG } from './types';

describe('snake oil engine v3', () => {
  it('valida config solitario', () => {
    expect(validateConfig(DEFAULT_CONFIG).valid).toBe(true);
    expect(validateConfig(normalizeConfig({ wordCount: 4 } as never)).valid).toBe(false);
  });

  it('tiene contenido amplio', () => {
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(50);
    expect(WORDS.length).toBeGreaterThanOrEqual(100);
    expect(EVENTS.length).toBeGreaterThanOrEqual(30);
    expect(OBJECTION_TYPES.length).toBeGreaterThanOrEqual(20);
    expect(customerPool(true).length).toBe(CUSTOMERS.length + ADULT_CUSTOMERS.length);
    expect(wordPool(false).length).toBe(WORDS.length);
  });

  it('clientes tienen personalidad completa', () => {
    for (const c of CUSTOMERS.slice(0, 5)) {
      expect(c.personality.length).toBeGreaterThan(5);
      expect(c.secretConcern.length).toBeGreaterThan(3);
      expect(c.tags.length).toBeGreaterThan(0);
    }
  });

  it('presets rápido / completo', () => {
    expect(formatPresets('quick').pitchSeconds).toBe(30);
    expect(formatPresets('full').pitchSeconds).toBe(60);
  });

  it('reparte cliente + palabras interesantes', () => {
    const deal = dealRound({ ...DEFAULT_CONFIG, wordCount: 3, format: 'full' });
    expect(deal.customer.need.length).toBeGreaterThan(10);
    expect(deal.words).toHaveLength(3);
    const words = pickInterestingWords(deal.customer, 3, false);
    expect(words).toHaveLength(3);
  });

  it('combo y badges', () => {
    const evalLike = {
      score: 88,
      dimensions: {
        persuasion: 92,
        creativity: 90,
        improvisation: 90,
        coherence: 40,
        humor: 88,
        adaptation: 91,
        defense: 90,
      },
      customerBuyProbability: 80,
      strengths: [],
      weaknesses: [],
      bestMoment: '',
      funnyComment: '',
      customerVerdict: '',
      label: 'x',
      badges: [] as const,
      winningStyle: 'humor' as const,
    };
    expect(nextCombo(1, evalLike)).toBeGreaterThanOrEqual(2);
    expect(applyComboToScore(80, 3)).toBeGreaterThan(80);
    const badges = detectBadges(evalLike, 3, true);
    expect(badges).toContain('nato_seller');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('combina IA y votos (70/30)', () => {
    expect(combineRoundScore(100, 0, 70)).toBe(70);
    expect(combineRoundScore(80, null)).toBe(80);
  });

  it('stats persistentes', () => {
    expect(scoreLabel(82)).toMatch(/Excelente/i);
    const stats = updateStats(
      emptyStats(),
      {
        score: 82,
        dimensions: {
          persuasion: 90,
          creativity: 88,
          improvisation: 70,
          coherence: 60,
          humor: 80,
          adaptation: 90,
          defense: 75,
        },
        customerBuyProbability: 77,
        strengths: [],
        weaknesses: [],
        bestMoment: '',
        funnyComment: '',
        customerVerdict: '',
        label: 'x',
        badges: ['actor'],
        winningStyle: 'persuasion',
      },
      2,
      'vampire-beach',
    );
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.bestScore).toBe(82);
    expect(stats.bestBuyProbability).toBe(77);
    expect(stats.badges).toContain('actor');
    expect(stats.customersBeaten).toContain('vampire-beach');
  });
});
