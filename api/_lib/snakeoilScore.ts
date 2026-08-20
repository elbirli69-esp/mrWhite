/** Evaluación y diálogo Snake Oil (DeepSeek hoy; interfaz estable para multi-jugador). */

export type Difficulty = 'easy' | 'normal' | 'hard'

export type DimensionScores = {
  persuasion: number
  creativity: number
  improvisation: number
  coherence: number
  humor: number
  adaptation: number
  defense: number
}

export type SnakeOilEvaluation = {
  score: number
  dimensions: DimensionScores
  customerBuyProbability: number
  strengths: string[]
  weaknesses: string[]
  bestMoment: string
  funnyComment: string
  customerVerdict: string
  label: string
  badges: string[]
  winningStyle: 'persuasion' | 'creativity' | 'humor' | 'improvisation' | 'defense' | 'balanced'
  /** Si el cliente pide una segunda objeción (solo hint; el cliente decide en generate). */
  wantsSecondObjection?: boolean
}

export type CustomerProfileInput = {
  name: string
  description: string
  personality: string
  need: string
  secretConcern: string
  patience: number
  skepticism: number
  humor: number
}

export type ConversationTurnInput = {
  role: string
  text: string
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function transcriptionCaveat(): string {
  return `IMPORTANTE sobre el texto:
- Es TRANSCRIPCIÓN automática (Whisper): puede haber errores de ASR.
- Evalúa la IDEA y el discurso, no ortografía ni palabras mal reconocidas.
- No castigues estilo informal o gracioso: aquí eso suma.
- Sí penaliza vacío, no vender, no adaptar al cliente, o no usar las palabras de forma inteligente.`
}

function difficultyInstructions(difficulty: Difficulty): string {
  if (difficulty === 'easy') {
    return `Dificultad FÁCIL: sé un cliente relativamente comprensivo. Objeciones sencillas y claras. Ayuda a que el jugador aprenda.`
  }
  if (difficulty === 'hard') {
    return `Dificultad DIFÍCIL: sé muy exigente. Detecta contradicciones, cambia de opinión, plantea objeciones inesperadas. Negociación tensa pero jugable.`
  }
  return `Dificultad NORMAL: sé escéptico pero justo. Preguntas razonables relacionadas con el producto y tu necesidad.`
}

export function buildObjectionSystemPrompt(difficulty: Difficulty): string {
  return `Eres el CLIENTE de un juego de ventas absurdas llamado Snake Oil.
NO eres un juez: eres el personaje. Responde EN PERSONAJE, como en una negociación viva.

${difficultyInstructions(difficulty)}

Reglas:
- Máximo 2 frases.
- Habla en primera persona como el cliente.
- Usa tu personalidad, necesidad y preocupación secreta.
- La objeción debe sentirse conversacional, no como examen.
- Puedes referirte a detalles concretos del pitch.
- Si objectionKindHint está presente, inclínala hacia ese tipo sin nombrarlo.

Responde SOLO JSON:
{"objection": string, "kind": string}`
}

export function buildObjectionUserPrompt(input: {
  customer: CustomerProfileInput
  words: string[]
  productName: string
  pitchTranscript: string
  difficulty: Difficulty
  objectionKindHint?: string
  turn: 1 | 2
  previousObjection?: string
  previousReply?: string
}): string {
  const second =
    input.turn === 2
      ? `\nEsta es la SEGUNDA objeción. El jugador ya respondió a: "${input.previousObjection ?? ''}"\nCon: """${(input.previousReply ?? '').slice(0, 1200)}"""\nSi la respuesta fue débil, aprieta. Si fue buena, cambia el ángulo (contradicción, precio, miedo nuevo).`
      : ''

  return `CLIENTE
Nombre: ${input.customer.name}
Descripción: ${input.customer.description}
Personalidad: ${input.customer.personality}
Necesidad: ${input.customer.need}
Preocupación secreta: ${input.customer.secretConcern}
Paciencia ${input.customer.patience}/100 · Escepticismo ${input.customer.skepticism}/100 · Humor ${input.customer.humor}/100

Producto: ${input.productName}
Palabras del vendedor: ${input.words.join(', ')}
Pista de tipo de objeción: ${input.objectionKindHint ?? 'libre'}
Turno: ${input.turn}
${second}

Pitch (transcripción):
"""
${input.pitchTranscript.slice(0, 2500)}
"""`
}

export function buildEvaluateSystemPrompt(): string {
  return `Eres el presentador-juez carismático de "Snake Oil", un JUEGO (no un examen de oratoria).
Tu feedback es CORTO, gracioso y específico de ESTA partida.

Evalúa el CONTEXTO completo: cliente, palabras, producto, pitch, objeciones, respuestas, evento si existe.

Dimensiones 0-100:
- persuasion: ¿convenció al cliente?
- creativity: ¿transformó palabras random en idea interesante?
- improvisation: ¿reaccionó a objeciones/eventos?
- coherence: ¿tiene sentido DENTRO de la ficción? (lo absurdo coherente puede puntuar alto)
- humor: ¿creó situaciones absurdas/divertidas? (no hace falta "contar un chiste")
- adaptation: ¿habló al personaje concreto?
- defense: ¿mantuvo el argumento al ser cuestionado?

customer_buy_probability 0-100: probabilidad INDEPENDIENTE de que ESTE cliente compre.
Puede divergir del score: humor altísimo + compra baja = "me reí pero no compro".

score 0-100: diversión + eficacia de juego. Premia ESTILOS distintos:
- persuasivo, creativo, gracioso, improvisador o gran defensor pueden ganar.
Un pitch absurdo gracioso poco coherente PUEDE sacar buena nota.
Un pitch lógico aburrido TAMBIÉN puede sacar buena nota si persuade.
Evita premiar siempre el mismo estilo. Elige winning_style acorde.

badges posibles (solo si aplican de verdad): nato_seller, improv_mind, absurd_works, actor, no_escape, nonsense, closer, poet, survivor

${transcriptionCaveat()}

Responde SOLO JSON:
{
  "score": number,
  "persuasion": number,
  "creativity": number,
  "improvisation": number,
  "coherence": number,
  "humor": number,
  "adaptation": number,
  "defense": number,
  "customer_buy_probability": number,
  "strengths": string[],
  "weaknesses": string[],
  "best_moment": string,
  "funny_comment": string,
  "customer_verdict": string,
  "label": string,
  "badges": string[],
  "winning_style": "persuasion"|"creativity"|"humor"|"improvisation"|"defense"|"balanced"
}`
}

export function buildEvaluateUserPrompt(input: {
  customer: CustomerProfileInput
  words: string[]
  productName: string
  conversation: ConversationTurnInput[]
  pitchSeconds: number
  replySeconds: number
  difficulty: Difficulty
  format: string
  eventTitle?: string
}): string {
  const convo = input.conversation
    .map((t) => `[${t.role}] ${t.text}`)
    .join('\n\n')
    .slice(0, 7000)

  return `FORMATO: ${input.format} · DIFICULTAD: ${input.difficulty}
CLIENTE: ${input.customer.name} ${input.customer.description}
PERSONALIDAD: ${input.customer.personality}
NECESIDAD: ${input.customer.need}
PREOCUPACIÓN SECRETA: ${input.customer.secretConcern}
(paciencia ${input.customer.patience}, escepticismo ${input.customer.skepticism}, humor ${input.customer.humor})
PALABRAS: ${input.words.join(', ')}
PRODUCTO: ${input.productName}
TIEMPOS: pitch ${input.pitchSeconds}s / respuestas ${input.replySeconds}s
EVENTO: ${input.eventTitle ?? '(ninguno)'}

CONVERSACIÓN COMPLETA:
${convo}`
}

function dimFrom(raw: Record<string, unknown>, snake: string, alt?: string): number {
  const v = raw[snake] ?? (alt ? raw[alt] : undefined)
  if (typeof v === 'number') return clamp100(v)
  return 50
}

const STYLE_SET = new Set([
  'persuasion',
  'creativity',
  'humor',
  'improvisation',
  'defense',
  'balanced',
])

export function parseEvaluation(raw: string): SnakeOilEvaluation | null {
  const match = raw.trim().match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const data = JSON.parse(match[0]) as Record<string, unknown>
    if (typeof data.score !== 'number') return null
    const strengths = Array.isArray(data.strengths)
      ? data.strengths.filter((s): s is string => typeof s === 'string').slice(0, 3)
      : []
    const weaknesses = Array.isArray(data.weaknesses)
      ? data.weaknesses.filter((s): s is string => typeof s === 'string').slice(0, 2)
      : []
    const badges = Array.isArray(data.badges)
      ? data.badges.filter((s): s is string => typeof s === 'string').slice(0, 6)
      : []
    const styleRaw = typeof data.winning_style === 'string' ? data.winning_style : 'balanced'
    const winningStyle = (STYLE_SET.has(styleRaw) ? styleRaw : 'balanced') as SnakeOilEvaluation['winningStyle']

    const dimensions: DimensionScores = {
      persuasion: dimFrom(data, 'persuasion'),
      creativity: dimFrom(data, 'creativity'),
      improvisation: dimFrom(data, 'improvisation'),
      coherence: dimFrom(data, 'coherence'),
      humor: dimFrom(data, 'humor'),
      adaptation: dimFrom(data, 'adaptation', 'customer_fit'),
      defense: dimFrom(data, 'defense', 'objection_handling'),
    }

    return {
      score: clamp100(data.score),
      dimensions,
      customerBuyProbability: dimFrom(data, 'customer_buy_probability'),
      strengths: strengths.length ? strengths : ['Has salido a vender.'],
      weaknesses: weaknesses.length ? weaknesses : ['Se puede cerrar más fuerte.'],
      bestMoment:
        typeof data.best_moment === 'string' && data.best_moment.trim()
          ? data.best_moment.trim().slice(0, 220)
          : 'Cuando decidiste vender igual.',
      funnyComment:
        typeof data.funny_comment === 'string' && data.funny_comment.trim()
          ? data.funny_comment.trim().slice(0, 220)
          : 'El jurado necesita un café.',
      customerVerdict:
        typeof data.customer_verdict === 'string' && data.customer_verdict.trim()
          ? data.customer_verdict.trim().slice(0, 180)
          : 'Mmm… dame una noche para pensarlo.',
      label:
        typeof data.label === 'string' && data.label.trim()
          ? data.label.trim().slice(0, 60)
          : 'Vendedor en proceso',
      badges,
      winningStyle,
    }
  } catch {
    return null
  }
}

export function parseObjection(raw: string): { objection: string; kind: string } | null {
  const match = raw.trim().match(/\{[\s\S]*\}/)
  if (!match) {
    const line = raw.trim().split('\n')[0]?.trim()
    return line && line.length > 8 ? { objection: line.slice(0, 280), kind: 'freeform' } : null
  }
  try {
    const data = JSON.parse(match[0]) as { objection?: unknown; kind?: unknown }
    if (typeof data.objection === 'string' && data.objection.trim()) {
      return {
        objection: data.objection.trim().slice(0, 280),
        kind: typeof data.kind === 'string' ? data.kind : 'freeform',
      }
    }
  } catch {
    /* fallthrough */
  }
  return null
}

function mockEvaluation(input: {
  pitchTranscript: string
  replyTexts: string[]
  words: string[]
  productName: string
}): SnakeOilEvaluation {
  const pitchWords = input.pitchTranscript.trim().split(/\s+/).filter(Boolean).length
  const replyWords = input.replyTexts.join(' ').trim().split(/\s+/).filter(Boolean).length
  let score = 35
  if (pitchWords >= 12) score = 55
  if (pitchWords >= 30) score = 68
  if (pitchWords >= 50) score = 78
  if (replyWords >= 8) score += 6
  const lower = input.pitchTranscript.toLocaleLowerCase('es')
  const used = input.words.filter((w) => lower.includes(w.toLocaleLowerCase('es').slice(0, 4))).length
  score += used * 4
  score = clamp100(score)
  const base = Math.max(30, score - 8)
  const buy = clamp100(base - 12 + (replyWords >= 10 ? 15 : 0))
  return {
    score,
    dimensions: {
      persuasion: clamp100(base + 5),
      creativity: clamp100(base + used * 3),
      improvisation: clamp100(base + (replyWords > 5 ? 8 : 0)),
      coherence: clamp100(base - 8),
      humor: clamp100(base + 6),
      adaptation: clamp100(base),
      defense: clamp100(replyWords >= 8 ? base + 10 : base - 10),
    },
    customerBuyProbability: buy,
    strengths: ['Has salido a vender sin miedo.', 'Hay chispa de juego.'],
    weaknesses: [replyWords < 5 ? 'La defensa se quedó corta.' : 'Cierra con una frase más memorable.'],
    bestMoment: `Cuando nombraste «${input.productName}» como si existiera.`,
    funnyComment: 'Demo local: ridículamente convincente… dentro de lo que cabe.',
    customerVerdict: buy >= 60 ? 'Lo odio. Lo necesito. ¿Cuánto cuesta?' : 'Me has entretenido… poco más.',
    label: score >= 75 ? 'Excelente vendedor' : score >= 55 ? 'Vendedor con potencial' : 'Cliente confuso',
    badges: score >= 80 ? ['nato_seller'] : [],
    winningStyle: 'balanced',
  }
}

function mockObjection(input: { productName: string; customerName: string; turn: number }): {
  objection: string
  kind: string
} {
  if (input.turn === 2) {
    return {
      objection: `Espera… ¿y si «${input.productName}» causa exactamente el problema que dices resolver?`,
      kind: 'contradiction',
    }
  }
  return {
    objection: `Mmm… soy ${input.customerName}. ¿De verdad «${input.productName}» me soluciona la vida o me estás vendiendo humo elegante?`,
    kind: 'doubt',
  }
}

async function callDeepSeek(messages: Array<{ role: string; content: string }>, temperature: number): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.VERCEL) throw new Error('Falta DEEPSEEK_API_KEY')
    throw new Error('NO_API_KEY')
  }
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature,
      max_tokens: 900,
      messages,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[snakeoil deepseek]', response.status, detail.slice(0, 300))
    throw new Error('No se pudo contactar con el evaluador')
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Respuesta vacía del modelo')
  return content
}

function assertUsableTranscript(transcript: string, label: string) {
  const words = transcript.split(/\s+/).filter((w) => /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/.test(w))
  if (words.length < 3 && !(words.length >= 2 && transcript.length >= 20)) {
    throw new Error(`${label} demasiado corto. Escribe un resumen (mín. 3 palabras).`)
  }
}

export async function generateSnakeOilObjection(input: {
  customer: CustomerProfileInput
  words: string[]
  productName: string
  pitchTranscript: string
  difficulty: Difficulty
  objectionKindHint?: string
  turn?: 1 | 2
  previousObjection?: string
  previousReply?: string
}): Promise<{ objection: string; kind: string }> {
  const pitch = input.pitchTranscript.trim()
  if (!pitch) throw new Error('Transcripción del pitch vacía')
  assertUsableTranscript(pitch, 'Pitch')
  const turn = input.turn ?? 1
  const difficulty = input.difficulty ?? 'normal'

  try {
    const content = await callDeepSeek(
      [
        { role: 'system', content: buildObjectionSystemPrompt(difficulty) },
        {
          role: 'user',
          content: buildObjectionUserPrompt({ ...input, difficulty, turn }),
        },
      ],
      turn === 2 ? 0.95 : 0.9,
    )
    const parsed = parseObjection(content)
    if (!parsed) throw new Error('No se pudo interpretar la objeción')
    return parsed
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_API_KEY') {
      return mockObjection({
        productName: input.productName,
        customerName: input.customer.name,
        turn,
      })
    }
    throw error
  }
}

export async function evaluateSnakeOilRound(input: {
  customer: CustomerProfileInput
  words: string[]
  productName: string
  conversation: ConversationTurnInput[]
  pitchSeconds: number
  replySeconds: number
  difficulty: Difficulty
  format: string
  eventTitle?: string
  /** Compat MVP antiguo */
  pitchTranscript?: string
  objection?: string
  replyTranscript?: string
}): Promise<SnakeOilEvaluation> {
  let conversation = input.conversation
  if (!conversation?.length) {
    conversation = [
      { role: 'player_pitch', text: input.pitchTranscript ?? '' },
      ...(input.objection ? [{ role: 'customer', text: input.objection }] : []),
      ...(input.replyTranscript ? [{ role: 'player_reply', text: input.replyTranscript }] : []),
    ]
  }

  const pitch = conversation.find((t) => t.role === 'player_pitch')?.text?.trim() ?? ''
  if (!input.productName.trim()) throw new Error('Falta el producto')
  if (!pitch) throw new Error('Transcripción del pitch vacía')
  assertUsableTranscript(pitch, 'Pitch')

  try {
    const content = await callDeepSeek(
      [
        { role: 'system', content: buildEvaluateSystemPrompt() },
        {
          role: 'user',
          content: buildEvaluateUserPrompt({
            customer: input.customer,
            words: input.words,
            productName: input.productName,
            conversation,
            pitchSeconds: input.pitchSeconds,
            replySeconds: input.replySeconds,
            difficulty: input.difficulty ?? 'normal',
            format: input.format ?? 'full',
            eventTitle: input.eventTitle,
          }),
        },
      ],
      0.75,
    )
    const parsed = parseEvaluation(content)
    if (!parsed) throw new Error('No se pudo interpretar la evaluación')
    return parsed
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_API_KEY') {
      const replies = conversation
        .filter((t) => t.role === 'player_reply' || t.role === 'player_event_reply')
        .map((t) => t.text)
      return mockEvaluation({
        pitchTranscript: pitch,
        replyTexts: replies,
        words: input.words,
        productName: input.productName,
      })
    }
    throw error
  }
}

/** Compat tests / API antigua */
export function buildEvaluateSystemPromptLegacy(): string {
  return buildEvaluateSystemPrompt()
}

export function buildObjectionSystemPromptLegacy(): string {
  return buildObjectionSystemPrompt('normal')
}

/** @deprecated */
export function buildSnakeOilSystemPrompt(): string {
  return buildEvaluateSystemPrompt()
}

/** @deprecated */
export function buildSnakeOilUserPrompt(input: {
  transcript: string
  customer: string
  product: string
  durationSec: number
}): string {
  return buildEvaluateUserPrompt({
    customer: {
      name: input.customer,
      description: input.customer,
      personality: 'Escéptico',
      need: input.customer,
      secretConcern: '',
      patience: 50,
      skepticism: 50,
      humor: 50,
    },
    words: [],
    productName: input.product,
    conversation: [{ role: 'player_pitch', text: input.transcript }],
    pitchSeconds: input.durationSec,
    replySeconds: 20,
    difficulty: 'normal',
    format: 'full',
  })
}

/** @deprecated */
export async function evaluateSnakeOilPitch(input: {
  transcript: string
  customer: string
  product: string
  durationSec: number
}): Promise<{ score: number; feedback: string }> {
  const full = await evaluateSnakeOilRound({
    customer: {
      name: input.customer,
      description: input.customer,
      personality: 'Escéptico',
      need: input.customer,
      secretConcern: '',
      patience: 50,
      skepticism: 50,
      humor: 50,
    },
    words: [],
    productName: input.product,
    conversation: [{ role: 'player_pitch', text: input.transcript }],
    pitchSeconds: input.durationSec,
    replySeconds: 0,
    difficulty: 'normal',
    format: 'quick',
  })
  return { score: Math.round(full.score / 10), feedback: full.funnyComment }
}
