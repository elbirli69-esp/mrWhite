export type TopicMode = 'serious' | 'invented'

export type HablaYaEvaluation = {
  score: number
  feedback: string
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10))
}

function systemPrompt(mode: TopicMode): string {
  if (mode === 'invented') {
    return `Eres juez de un juego de mesa llamado "Habla ya".
El jugador DEBE inventar: se premia imaginación, inventiva, coherencia interna, humor y que el discurso "cuadre" con la categoría aunque sea mentira.
Se penaliza quedarse en blanco, repetir lo obvio sin inventar, o un discurso vacío.
Responde SOLO en JSON válido con esta forma exacta:
{"score": number, "feedback": string}
score es un número de 0 a 10 (un decimal permitido).
feedback es 1 frase corta en castellano explicando la nota.`
  }

  return `Eres juez de un juego de mesa llamado "Habla ya".
El jugador habla en serio: se premia relevancia al tema, ideas útiles o datos razonables, claridad y estructura.
Se penaliza irse por las ramas, silencio, relleno vacío o contradicciones graves.
Responde SOLO en JSON válido con esta forma exacta:
{"score": number, "feedback": string}
score es un número de 0 a 10 (un decimal permitido).
feedback es 1 frase corta en castellano explicando la nota.`
}

function userPrompt(input: {
  transcript: string
  category: string
  topicMode: TopicMode
  durationSec: number
}): string {
  return `Categoría: ${input.category}
Modo: ${input.topicMode === 'invented' ? 'inventado' : 'serio'}
Duración del turno: ${input.durationSec}s
Transcripción del audio (puede ser imperfecta):
"""
${input.transcript.slice(0, 4000)}
"""`
}

function mockEvaluation(input: {
  transcript: string
  category: string
  topicMode: TopicMode
}): HablaYaEvaluation {
  const words = input.transcript.trim().split(/\s+/).filter(Boolean).length
  let score = 4
  if (words >= 8) score = 6
  if (words >= 20) score = 7.5
  if (words >= 40) score = 8.5
  if (input.transcript.includes('(sin transcripción')) score = 3
  if (input.topicMode === 'invented' && words >= 15) score += 0.5
  return {
    score: clampScore(score),
    feedback:
      input.topicMode === 'invented'
        ? `Modo inventado · demo local sobre «${input.category}».`
        : `Modo serio · demo local sobre «${input.category}».`,
  }
}

function parseEvaluation(raw: string): HablaYaEvaluation | null {
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

export async function evaluateHablaYaSpeech(input: {
  transcript: string
  category: string
  topicMode: TopicMode
  durationSec: number
}): Promise<HablaYaEvaluation> {
  const category = input.category.trim()
  const transcript = input.transcript.trim()
  if (!category) throw new Error('Falta la categoría')
  if (!transcript) throw new Error('Transcripción vacía')

  const topicMode: TopicMode = input.topicMode === 'invented' ? 'invented' : 'serious'
  const durationSec = Number.isFinite(input.durationSec) ? input.durationSec : 45

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.VERCEL) {
      throw new Error('Falta DEEPSEEK_API_KEY')
    }
    return mockEvaluation({ transcript, category, topicMode })
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: topicMode === 'invented' ? 0.8 : 0.4,
      max_tokens: 200,
      messages: [
        { role: 'system', content: systemPrompt(topicMode) },
        {
          role: 'user',
          content: userPrompt({ transcript, category, topicMode, durationSec }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[hablaya deepseek]', response.status, detail.slice(0, 300))
    throw new Error('No se pudo evaluar el discurso')
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
