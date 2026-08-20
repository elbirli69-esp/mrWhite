import { describe, expect, it } from 'vitest';
import {
  combineRoundScore,
  dealRound,
  emptyStats,
  normalizeConfig,
  scoreLabel,
  suggestProductName,
  updateStats,
  validateConfig,
} from './engine';
import { DEFAULT_CONFIG } from './types';

describe('snake oil engine', () => {
  it('valida config MVP solo', () => {
    expect(validateConfig(DEFAULT_CONFIG).valid).toBe(true);
    expect(validateConfig(normalizeConfig({ wordCount: 4 } as never)).valid).toBe(false);
  });

  it('reparte cliente + 2/3 palabras', () => {
    const deal = dealRound({ ...DEFAULT_CONFIG, wordCount: 3 });
    expect(deal.customer.need.length).toBeGreaterThan(10);
    expect(deal.words).toHaveLength(3);
  });

  it('sugiere nombre de producto', () => {
    expect(suggestProductName(['A', 'B'])).toContain('A');
  });

  it('combina IA y votos (70/30)', () => {
    expect(combineRoundScore(100, 0, 70)).toBe(70);
    expect(combineRoundScore(80, null)).toBe(80);
  });

  it('etiquetas y stats', () => {
    expect(scoreLabel(82)).toMatch(/Excelente/i);
    const stats = updateStats(emptyStats(), {
      score: 82,
      dimensions: {
        persuasion: 90,
        creativity: 88,
        improvisation: 70,
        coherence: 60,
        humor: 80,
        customerFit: 90,
        objectionHandling: 75,
        clarity: 70,
        originality: 80,
        fluency: 70,
        wordUse: 85,
      },
      strengths: [],
      weaknesses: [],
      bestMoment: '',
      funnyComment: '',
      label: 'x',
    });
    expect(stats.rounds).toBe(1);
    expect(stats.bestScore).toBe(82);
  });
});
