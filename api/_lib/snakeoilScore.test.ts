import { describe, expect, it } from 'vitest';
import {
  buildEvaluateSystemPrompt,
  buildObjectionSystemPrompt,
  parseEvaluation,
  parseObjection,
} from './snakeoilScore';

describe('snakeoil score schema', () => {
  it('prompts piden JSON estructurado', () => {
    expect(buildEvaluateSystemPrompt()).toMatch(/customer_fit/);
    expect(buildEvaluateSystemPrompt()).toMatch(/funny_comment/);
    expect(buildObjectionSystemPrompt()).toMatch(/objection/);
  });

  it('parsea evaluación completa', () => {
    const parsed = parseEvaluation(
      JSON.stringify({
        score: 82,
        persuasion: 91,
        creativity: 87,
        improvisation: 84,
        coherence: 76,
        humor: 89,
        customer_fit: 93,
        objection_handling: 80,
        clarity: 70,
        originality: 88,
        fluency: 75,
        word_use: 90,
        strengths: ['Bien', 'Muy bien'],
        weaknesses: ['Mejorable'],
        best_moment: 'El cierre',
        funny_comment: 'Ridículamente convincente.',
        label: 'Excelente vendedor',
      }),
    );
    expect(parsed?.score).toBe(82);
    expect(parsed?.dimensions.customerFit).toBe(93);
    expect(parsed?.label).toMatch(/Excelente/);
  });

  it('parsea objeción', () => {
    expect(parseObjection('{"objection":"¿Y por qué 300€?"}')).toMatch(/300/);
  });
});
