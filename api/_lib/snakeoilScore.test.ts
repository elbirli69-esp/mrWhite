import { describe, expect, it } from 'vitest';
import {
  buildSnakeOilSystemPrompt,
  buildSnakeOilUserPrompt,
} from './snakeoilScore';

describe('snakeoil score prompts', () => {
  it('pide JSON con score y feedback', () => {
    const system = buildSnakeOilSystemPrompt();
    expect(system).toMatch(/Snake Oil/);
    expect(system).toMatch(/"score"/);
    expect(system).toMatch(/transcripción/i);
  });

  it('incluye cliente y producto', () => {
    const user = buildSnakeOilUserPrompt({
      transcript: 'Hola soy un pitch de prueba con varias palabras',
      customer: 'Un pirata',
      product: 'Rayo Calcetín',
      durationSec: 30,
    });
    expect(user).toContain('Un pirata');
    expect(user).toContain('Rayo Calcetín');
  });
});
