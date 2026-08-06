import {
  BULARDO_SYSTEM_PROMPT,
  buildBulardoUserPrompt,
} from './bulardoPrompt.js'

export type BulardoArticle = {
  headline: string
  lead: string
  body: string
  closer: string
  raw: string
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

function parseArticle(raw: string): BulardoArticle {
  const text = raw.trim()
  const headline =
    text.match(/TITULAR:\s*(.+)/i)?.[1]?.trim() ||
    text.split('\n').find((l) => l.trim())?.trim() ||
    'Suceso sin confirmar altera la agenda informativa'

  const lead =
    text.match(/ENTRADA:\s*([\s\S]*?)(?=\n\s*CUERPO:|\n\s*CIERRE:|$)/i)?.[1]?.trim() ||
    ''

  const body =
    text
      .match(/CUERPO:\s*([\s\S]*?)(?=\n\s*CIERRE:|$)/i)?.[1]
      ?.trim() || text

  const closer = text.match(/CIERRE:\s*([\s\S]+)$/i)?.[1]?.trim() || ''

  return { headline, lead, body, closer, raw: text }
}

function mockArticle(question: string): BulardoArticle {
  const topic = question.trim() || 'un asunto menor'
  const raw = `TITULAR: Un informe preliminar sitúa “${topic}” en el centro del debate técnico
ENTRADA: Fuentes consultadas por Bulardo aseguran que una revisión interna ha elevado la atención sobre ${topic} tras detectarse “patrones inconsistentes” en mediciones de rutina.
CUERPO:
Según un documento al que este medio habría tenido acceso, un equipo de análisis del Instituto Ibérico de Observación Aplicada habría recomendado abrir una comisión de seguimiento. “No hablamos de alarma, sino de prudencia metodológica”, habría declarado Ana Varela, portavoz del organismo.

La nota añade que varios ayuntamientos estarían contrastando protocolos locales “por si el fenómeno tiene impacto operativo”. Ninguna autoridad oficial ha confirmado de forma independiente estos extremos, aunque en foros especializados ya circulan borradores con calendarios tentativos.
CIERRE: Bulardo seguirá la evolución de unas informaciones que, de momento, no han sido ratificadas por canales oficiales.`
  return parseArticle(raw)
}

export async function generateBulardoArticle(
  question: string,
): Promise<BulardoArticle> {
  const trimmed = question.trim().replace(/\s+/g, ' ')
  if (!trimmed) {
    throw new Error('Pregunta vacía')
  }
  if (trimmed.length > 280) {
    throw new Error('Pregunta demasiado larga')
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.VERCEL) {
      throw new Error('Falta DEEPSEEK_API_KEY')
    }
    return mockArticle(trimmed)
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.85,
      max_tokens: 700,
      messages: [
        { role: 'system', content: BULARDO_SYSTEM_PROMPT },
        { role: 'user', content: buildBulardoUserPrompt(trimmed) },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[bulardo deepseek]', response.status, detail.slice(0, 300))
    throw new Error('No se pudo generar la noticia')
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('Respuesta vacía del modelo')
  }

  return parseArticle(content)
}
