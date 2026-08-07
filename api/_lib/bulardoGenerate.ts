import {
  BULARDO_SYSTEM_PROMPT,
  buildBulardoUserPrompt,
  normalizeBulardoInput,
} from './bulardoPrompt.js'

export type BulardoArticle = {
  headline: string
  lead: string
  body: string
  closer: string
  raw: string
}

export const BULARDO_INPUT_MAX = 1500

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

function mockArticle(input: string): BulardoArticle {
  const topic = input.replace(/\s+/g, ' ').trim().slice(0, 90) || 'un asunto menor'
  const raw = `TITULAR: Flipas: el Garbanzo Cuántico confirma lo de “${topic}”
ENTRADA: Fuente de confianza (un primo en Benidorm): 41.208 tíos midieron un +87,463% de empanzamiento orbital xD
CUERPO:
En el Instituto Internacional del Garbanzo Cuántico, el Dr. Gumersindo Pechugón suelta que es “bifasaje garbancilar nivel dios”. Te lo juro, metieron sensores de eructón y salió tremendo. Protocolo oficial: dar vueltas antihorario tarareando la tabla periódica. 39 pillaron eco de alubia a 14 metros. De locos.
CIERRE: Si te duele el bloste, se te pone la polla dura como un poste.`
  return parseArticle(raw)
}

export async function generateBulardoArticle(
  input: string,
): Promise<BulardoArticle> {
  const trimmed = normalizeBulardoInput(input)
  if (!trimmed) {
    throw new Error('Pedido vacío')
  }
  if (trimmed.length > BULARDO_INPUT_MAX) {
    throw new Error(`Pedido demasiado largo (máx. ${BULARDO_INPUT_MAX} caracteres)`)
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
      temperature: 1.15,
      max_tokens: 550,
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
