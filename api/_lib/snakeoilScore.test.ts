import { describe, expect, it } from 'vitest'
import {
  buildEvaluateSystemPrompt,
  buildEvaluateUserPrompt,
  buildObjectionSystemPrompt,
  parseEvaluation,
  parseObjection,
} from './snakeoilScore'

describe('snakeoil score schema v3', () => {
  it('prompts piden JSON de juego (no examen)', () => {
    expect(buildEvaluateSystemPrompt()).toMatch(/customer_buy_probability/)
    expect(buildEvaluateSystemPrompt()).toMatch(/winning_style/)
    expect(buildEvaluateSystemPrompt()).toMatch(/JUEGO/)
    expect(buildEvaluateSystemPrompt()).toMatch(/NO inventes argumentos/)
    expect(buildObjectionSystemPrompt('hard')).toMatch(/DIFÍCIL/)
    expect(buildObjectionSystemPrompt('easy')).toMatch(/FÁCIL/)
  })

  it('user prompt separa CONTEXT / PITCH / OBJECTION / RESPONSE', () => {
    const text = buildEvaluateUserPrompt({
      customer: {
        name: 'Vampiro',
        description: 'd',
        personality: 'p',
        need: 'n',
        secretConcern: 's',
        patience: 50,
        skepticism: 50,
        humor: 50,
      },
      words: ['calcetín'],
      productName: 'DinoSock',
      conversation: [
        { role: 'player_pitch', text: 'vendo calcetín' },
        { role: 'customer', text: '¿precio?' },
        { role: 'player_reply', text: 'barato' },
      ],
      pitchSeconds: 30,
      replySeconds: 15,
      difficulty: 'normal',
      format: 'quick',
    })
    expect(text).toMatch(/=== CONTEXT ===/)
    expect(text).toMatch(/=== PITCH \(jugador\) ===/)
    expect(text).toMatch(/OBJECTION \(IA/)
    expect(text).toMatch(/=== RESPONSE \(jugador\) ===/)
    expect(text).toMatch(/NO es del jugador/)
  })

  it('parsea evaluación con buy probability y defensa', () => {
    const parsed = parseEvaluation(
      JSON.stringify({
        score: 87,
        persuasion: 91,
        creativity: 96,
        improvisation: 84,
        coherence: 63,
        humor: 90,
        adaptation: 92,
        defense: 88,
        customer_buy_probability: 38,
        strengths: ['Bien', 'Muy bien'],
        weaknesses: ['Mejorable'],
        best_moment: 'El calcetín antena',
        funny_comment: 'Contra todo pronóstico.',
        customer_verdict: 'Lo odio. Lo necesito.',
        label: 'Excelente vendedor',
        badges: ['absurd_works', 'actor'],
        winning_style: 'humor',
      }),
    )
    expect(parsed?.score).toBe(87)
    expect(parsed?.customerBuyProbability).toBe(38)
    expect(parsed?.dimensions.adaptation).toBe(92)
    expect(parsed?.dimensions.defense).toBe(88)
    expect(parsed?.customerVerdict).toMatch(/odio/i)
    expect(parsed?.winningStyle).toBe('humor')
    expect(parsed?.badges).toContain('absurd_works')
  })

  it('parsea objeción en personaje', () => {
    expect(parseObjection('{"objection":"¿Este paraguas me protege del sol?","kind":"logic"}')?.objection).toMatch(
      /paraguas/,
    )
  })

  it('acepta customer_fit legado como adaptation', () => {
    const parsed = parseEvaluation(
      JSON.stringify({
        score: 70,
        persuasion: 70,
        creativity: 70,
        improvisation: 70,
        coherence: 70,
        humor: 70,
        customer_fit: 81,
        objection_handling: 77,
        customer_buy_probability: 50,
        strengths: ['a'],
        weaknesses: ['b'],
        best_moment: 'x',
        funny_comment: 'y',
        customer_verdict: 'z',
        label: 'ok',
        badges: [],
        winning_style: 'balanced',
      }),
    )
    expect(parsed?.dimensions.adaptation).toBe(81)
    expect(parsed?.dimensions.defense).toBe(77)
  })
})
