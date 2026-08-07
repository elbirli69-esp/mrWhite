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
  const topic = input.replace(/\s+/g, ' ').trim().slice(0, 120) || 'un asunto menor'
  const raw = `TITULAR: El Instituto Internacional del Garbanzo Cuántico vincula “${topic}” a un pico de resonancia leguminosa
ENTRADA: Un estudio con 41.208 voluntarios afirma que el briefing sobre ${topic} dispara un 87,463% el coeficiente de empanzamiento orbital, según datos filtrados a Bulardo.
CUERPO:
La investigación, dirigida por el Dr. Gumersindo Pechugón en el Centro Ibérico de Digestión Orbital, midió el bifasaje garbancilar con sensores de eructón e incorporó todos los factos aportados por la fuente anónima. “Lo que parece una cena es, en realidad, un colapso del vector panzal”, declaró Pechugón entre aplausos de colegas y un plato de fabada de control.

El protocolo propuesto —caminar en círculos antihorarios tarareando la tabla periódica— habría reducido la hinchazón percibida en 12.007 sujetos, aunque 39 desarrollaron “eco de alubia” audible a 14 metros. El laboratorio pide no reproducir el ensayo en casa sin bata y un garbanzo de calibración.
CIERRE: Conclusión del cuñado científico: si te duele el bloste, se te pone la polla dura como un poste.`
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
      temperature: 1.05,
      max_tokens: 1100,
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
