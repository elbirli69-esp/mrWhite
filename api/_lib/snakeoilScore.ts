/** Evaluación estructurada Snake Oil (proveedor DeepSeek hoy; interfaz estable). */

export type DimensionScores = {
  persuasion: number
  creativity: number
  improvisation: number
  coherence: number
  humor: number
  customerFit: number
  objectionHandling: number
  clarity: number
  originality: number
  fluency: number
  wordUse: number
}

export type SnakeOilEvaluation = {
  score: number
  dimensions: DimensionScores
  strengths: string[]
  weaknesses: string[]
  bestMoment: string
  funnyComment: string
  label: string
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

export function buildEvaluateSystemPrompt(): string {
  return `Eres el presentador-juez carismático de un concurso llamado "Snake Oil".
Valoras pitches absurdos de productos inventados. Tono de concurso de TV: divertido, nunca insultante.

Criterios (0-100 cada uno): persuasión, creatividad, improvisación, coherencia, humor,
adaptación al cliente (customerFit), manejo de objeción (objectionHandling), claridad,
originalidad, fluidez, uso inteligente de las palabras (wordUse).

score global 0-100 = juicio global de eficacia del discurso en el juego (no media ciega).
label: frase corta tipo "Excelente vendedor" / "Cliente confuso".
strengths: 2 o 3 frases concretas de lo que hizo bien.
weaknesses: 1 o 2 mejoras (amables, con personalidad).
bestMoment: el momento más ingenioso (1 frase).
funnyComment: comentario de presentador (1 frase).

${transcriptionCaveat()}

Responde SOLO JSON válido:
{
  "score": number,
  "persuasion": number,
  "creativity": number,
  "improvisation": number,
  "coherence": number,
  "humor": number,
  "customer_fit": number,
  "objection_handling": number,
  "clarity": number,
  "originality": number,
  "fluency": number,
  "word_use": number,
  "strengths": string[],
  "weaknesses": string[],
  "best_moment": string,
  "funny_comment": string,
  "label": string
}`
}

export function buildEvaluateUserPrompt(input: {
  customerTitle: string
  customerNeed: string
  words: string[]
  productName: string
  pitchTranscript: string
  objection: string
  replyTranscript: string
  pitchSeconds: number
  replySeconds: number
}): string {
  return `CLIENTE: ${input.customerTitle}
NECESIDAD: ${input.customerNeed}
PALABRAS ASIGNADAS: ${input.words.join(', ')}
PRODUCTO: ${input.productName}
DURACIÓN PITCH: ${input.pitchSeconds}s
DURACIÓN RESPUESTA: ${input.replySeconds}s

PITCH (transcripción):
"""
${input.pitchTranscript.slice(0, 3500)}
"""

OBJECIÓN:
"""
${input.objection.slice(0, 500)}
"""

RESPUESTA A LA OBJECIÓN (transcripción):
"""
${(input.replyTranscript || '(sin respuesta)').slice(0, 2000)}
"""`
}

export function buildObjectionSystemPrompt(): string {
  return `Eres el cliente difícil de un concurso de ventas absurdas (Snake Oil).
Generas UNA objeción corta, específica y jugosa relacionada con el producto y tu situación.
Máximo 2 frases. Tono ingenioso, no cruel.
Responde SOLO JSON: {"objection": string}`
}

export function buildObjectionUserPrompt(input: {
  customerTitle: string
  customerNeed: string
  words: string[]
  productName: string
  pitchTranscript: string
}): string {
  return `Eres: ${input.customerTitle}
Tu situación: ${input.customerNeed}
Te han intentado vender: ${input.productName}
Palabras del vendedor: ${input.words.join(', ')}
Pitch (transcripción):
"""
${input.pitchTranscript.slice(0, 2500)}
"""
Inventa una objeción concreta.`
}

function dimFrom(raw: Record<string, unknown>, snake: string, camelFallback?: number): number {
  const v = raw[snake]
  if (typeof v === 'number') return clamp100(v)
  return clamp100(camelFallback ?? 50)
}

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
    const dimensions: DimensionScores = {
      persuasion: dimFrom(data, 'persuasion'),
      creativity: dimFrom(data, 'creativity'),
      improvisation: dimFrom(data, 'improvisation'),
      coherence: dimFrom(data, 'coherence'),
      humor: dimFrom(data, 'humor'),
      customerFit: dimFrom(data, 'customer_fit'),
      objectionHandling: dimFrom(data, 'objection_handling'),
      clarity: dimFrom(data, 'clarity'),
      originality: dimFrom(data, 'originality'),
      fluency: dimFrom(data, 'fluency'),
      wordUse: dimFrom(data, 'word_use'),
    }
    return {
      score: clamp100(data.score),
      dimensions,
      strengths: strengths.length ? strengths : ['Has salido al ruedo y eso ya cuenta.'],
      weaknesses: weaknesses.length ? weaknesses : ['Se puede apretar más el cierre.'],
      bestMoment:
        typeof data.best_moment === 'string' && data.best_moment.trim()
          ? data.best_moment.trim().slice(0, 220)
          : 'El momento en que decidiste vender igual.',
      funnyComment:
        typeof data.funny_comment === 'string' && data.funny_comment.trim()
          ? data.funny_comment.trim().slice(0, 220)
          : 'El jurado necesita un café… y quizá tu producto.',
      label:
        typeof data.label === 'string' && data.label.trim()
          ? data.label.trim().slice(0, 60)
          : 'Vendedor en proceso',
    }
  } catch {
    return null
  }
}

export function parseObjection(raw: string): string | null {
  const match = raw.trim().match(/\{[\s\S]*\}/)
  if (!match) {
    const line = raw.trim().split('\n')[0]?.trim()
    return line && line.length > 8 ? line.slice(0, 280) : null
  }
  try {
    const data = JSON.parse(match[0]) as { objection?: unknown }
    if (typeof data.objection === 'string' && data.objection.trim()) {
      return data.objection.trim().slice(0, 280)
    }
  } catch {
    /* fallthrough */
  }
  return null
}

function mockEvaluation(input: {
  pitchTranscript: string
  replyTranscript: string
  words: string[]
  productName: string
}): SnakeOilEvaluation {
  const pitchWords = input.pitchTranscript.trim().split(/\s+/).filter(Boolean).length
  const replyWords = input.replyTranscript.trim().split(/\s+/).filter(Boolean).length
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
  return {
    score,
    dimensions: {
      persuasion: clamp100(base + 5),
      creativity: clamp100(base + used * 3),
      improvisation: clamp100(base + (replyWords > 5 ? 8 : 0)),
      coherence: clamp100(base - 5),
      humor: clamp100(base + 2),
      customerFit: clamp100(base),
      objectionHandling: clamp100(replyWords >= 8 ? base + 10 : base - 10),
      clarity: clamp100(base),
      originality: clamp100(base + 4),
      fluency: clamp100(pitchWords >= 30 ? base + 6 : base - 4),
      wordUse: clamp100(40 + used * 15),
    },
    strengths: [
      'Has salido a vender sin miedo.',
      used > 0
        ? 'Has metido las palabras en la historia.'
        : 'La energía del pitch se entiende aunque Whisper titubee.',
    ],
    weaknesses: [
      replyWords < 5
        ? 'La respuesta a la objeción se ha quedado corta.'
        : 'Se puede cerrar con una frase más memorable.',
    ],
    bestMoment: `Cuando nombraste «${input.productName}» como si existiera de verdad.`,
    funnyComment: 'Demo local: ridículamente convincente… dentro de lo que cabe.',
    label: score >= 75 ? 'Excelente vendedor' : score >= 55 ? 'Vendedor con potencial' : 'Cliente confuso',
  }
}

function mockObjection(input: { productName: string; customerNeed: string }): string {
  return `¿Y por qué voy a gastar dinero en «${input.productName}» con lo que ya me pasa: ${input.customerNeed.slice(0, 80)}?`
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
      max_tokens: 700,
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
  customerTitle: string
  customerNeed: string
  words: string[]
  productName: string
  pitchTranscript: string
}): Promise<string> {
  const pitch = input.pitchTranscript.trim()
  if (!pitch) throw new Error('Transcripción del pitch vacía')
  assertUsableTranscript(pitch, 'Pitch')

  try {
    const content = await callDeepSeek(
      [
        { role: 'system', content: buildObjectionSystemPrompt() },
        { role: 'user', content: buildObjectionUserPrompt(input) },
      ],
      0.9,
    )
    const parsed = parseObjection(content)
    if (!parsed) throw new Error('No se pudo interpretar la objeción')
    return parsed
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_API_KEY') {
      return mockObjection({ productName: input.productName, customerNeed: input.customerNeed })
    }
    throw error
  }
}

export async function evaluateSnakeOilRound(input: {
  customerTitle: string
  customerNeed: string
  words: string[]
  productName: string
  pitchTranscript: string
  objection: string
  replyTranscript: string
  pitchSeconds: number
  replySeconds: number
}): Promise<SnakeOilEvaluation> {
  const pitch = input.pitchTranscript.trim()
  if (!input.productName.trim()) throw new Error('Falta el producto')
  if (!pitch) throw new Error('Transcripción del pitch vacía')
  assertUsableTranscript(pitch, 'Pitch')

  try {
    const content = await callDeepSeek(
      [
        { role: 'system', content: buildEvaluateSystemPrompt() },
        { role: 'user', content: buildEvaluateUserPrompt(input) },
      ],
      0.7,
    )
    const parsed = parseEvaluation(content)
    if (!parsed) throw new Error('No se pudo interpretar la evaluación')
    return parsed
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_API_KEY') {
      return mockEvaluation({
        pitchTranscript: pitch,
        replyTranscript: input.replyTranscript,
        words: input.words,
        productName: input.productName,
      })
    }
    throw error
  }
}

/** @deprecated compat tests antiguos */
export function buildSnakeOilSystemPrompt(): string {
  return buildEvaluateSystemPrompt()
}

/** @deprecated compat tests antiguos */
export function buildSnakeOilUserPrompt(input: {
  transcript: string
  customer: string
  product: string
  durationSec: number
}): string {
  return buildEvaluateUserPrompt({
    customerTitle: input.customer,
    customerNeed: input.customer,
    words: [],
    productName: input.product,
    pitchTranscript: input.transcript,
    objection: '',
    replyTranscript: '',
    pitchSeconds: input.durationSec,
    replySeconds: 20,
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
    customerTitle: input.customer,
    customerNeed: input.customer,
    words: [],
    productName: input.product,
    pitchTranscript: input.transcript,
    objection: '',
    replyTranscript: '',
    pitchSeconds: input.durationSec,
    replySeconds: 0,
  })
  return { score: Math.round(full.score / 10), feedback: full.funnyComment }
}
