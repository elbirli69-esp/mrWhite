export type SnakeOilEvaluation = {
  score: number
  feedback: string
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10))
}

function transcriptionCaveat(): string {
  return `IMPORTANTE sobre el texto que recibes:
- No es lo que el jugador escribió: es una TRANSCRIPCIÓN automática (Whisper) del audio.
- Puede haber palabras mal reconocidas o nombres deformados.
- Evalúa la IDEA del discurso de venta, no la ortografía ni fallos típicos de ASR.
- No bajes la nota por errores de reconocimiento; sí penaliza si el pitch es vacío, irrelevante o no intenta vender.`
}

export function buildSnakeOilSystemPrompt(): string {
  return `Eres juez de un juego de mesa llamado "Snake Oil".
Un vendedor inventa un producto absurdo (dos palabras juntas) y hace un pitch oral para convencer a un cliente con un rol concreto.

Premia: persuasión, inventiva, humor, encaje con el cliente, estructura del pitch y caradura creativa.
Penaliza: silencio, no mencionar el producto, no dirigir el pitch al cliente, relleno vacío o pitch genérico que valdría para cualquiera.

${transcriptionCaveat()}

Responde SOLO en JSON válido con esta forma exacta:
{"score": number, "feedback": string}
score es un número de 0 a 10 (un decimal permitido).
feedback es 1 frase corta en castellano explicando la nota.`
}

export function buildSnakeOilUserPrompt(input: {
  transcript: string
  customer: string
  product: string
  durationSec: number
}): string {
  return `Cliente (rol): ${input.customer}
Producto a vender: ${input.product}
Duración del pitch: ${input.durationSec}s
Texto procedente de transcripción automática del audio (puede ser imperfecta; no juzgues fallos de reconocimiento):
"""
${input.transcript.slice(0, 4000)}
"""`
}

function mockEvaluation(input: {
  transcript: string
  customer: string
  product: string
}): SnakeOilEvaluation {
  const words = input.transcript.trim().split(/\s+/).filter(Boolean).length
  let score = 4
  if (words >= 8) score = 6
  if (words >= 20) score = 7.5
  if (words >= 40) score = 8.5
  const lower = input.transcript.toLocaleLowerCase('es')
  const productBits = input.product.toLocaleLowerCase('es').split(/\s+/).filter(Boolean)
  const mentionsProduct = productBits.some((bit) => bit.length > 2 && lower.includes(bit))
  if (mentionsProduct) score += 0.5
  if (lower.includes(input.customer.toLocaleLowerCase('es').slice(0, 6))) score += 0.3
  return {
    score: clampScore(score),
    feedback: `Demo local · pitch de «${input.product}» para ${input.customer}.`,
  }
}

function parseEvaluation(raw: string): SnakeOilEvaluation | null {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const data = JSON.parse(jsonMatch[0]) as { score?: unknown; feedback?: unknown }
    if (typeof data.score !== 'number') return null
    const feedback =
      typeof data.feedback === 'string' && data.feedback.trim()
        ? data.feedback.trim().slice(0, 220)
        : 'Sin comentario.'
    return { score: clampScore(data.score), feedback }
  } catch {
    return null
  }
}

export async function evaluateSnakeOilPitch(input: {
  transcript: string
  customer: string
  product: string
  durationSec: number
}): Promise<SnakeOilEvaluation> {
  const customer = input.customer.trim()
  const product = input.product.trim()
  const transcript = input.transcript.trim()
  if (!customer) throw new Error('Falta el cliente')
  if (!product) throw new Error('Falta el producto')
  if (!transcript) throw new Error('Transcripción vacía')

  const words = transcript.split(/\s+/).filter((w) => /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/.test(w))
  const useless =
    /\(sin transcripción/i.test(transcript) ||
    (words.length < 3 && !(words.length >= 2 && transcript.length >= 20))

  if (useless) {
    throw new Error(
      'Texto demasiado corto. Escribe un resumen del pitch (mín. 3 palabras) y vuelve a evaluar.',
    )
  }

  const durationSec = Number.isFinite(input.durationSec) ? input.durationSec : 30
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.VERCEL) {
      throw new Error('Falta DEEPSEEK_API_KEY')
    }
    return mockEvaluation({ transcript, customer, product })
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 200,
      messages: [
        { role: 'system', content: buildSnakeOilSystemPrompt() },
        {
          role: 'user',
          content: buildSnakeOilUserPrompt({ transcript, customer, product, durationSec }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[snakeoil deepseek]', response.status, detail.slice(0, 300))
    throw new Error('No se pudo evaluar el pitch')
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Respuesta vacía del modelo')

  const parsed = parseEvaluation(content)
  if (!parsed) throw new Error('No se pudo interpretar la nota')
  return parsed
}
