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

/** Normaliza la respuesta del modelo para que el parseo por etiquetas no se rompa. */
function normalizeModelOutput(raw: string): string {
  return raw
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\s*(TITULAR\s*:)/gi, '\n$1')
    .replace(/\s*(ENTRADA\s*:)/gi, '\n$1')
    .replace(/\s*(CUERPO\s*:)/gi, '\n$1')
    .replace(/\s*(CIERRE\s*:)/gi, '\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function section(
  text: string,
  label: string,
  nextLabels: string[],
): string {
  const next = nextLabels.length
    ? `(?=\\n\\s*(?:${nextLabels.join('|')})\\s*:|$)`
    : '$'
  const re = new RegExp(
    `${label}\\s*:\\s*([\\s\\S]*?)${next}`,
    'i',
  )
  return text.match(re)?.[1]?.trim() || ''
}

export function parseArticle(raw: string): BulardoArticle {
  const text = normalizeModelOutput(raw)

  const headline =
    section(text, 'TITULAR', ['ENTRADA', 'CUERPO', 'CIERRE']) ||
    text.split('\n').find((l) => l.trim() && !/^(ENTRADA|CUERPO|CIERRE)\s*:/i.test(l))?.trim() ||
    'Suceso sin confirmar altera la agenda informativa'

  const lead = section(text, 'ENTRADA', ['CUERPO', 'CIERRE'])
  const body = section(text, 'CUERPO', ['CIERRE'])
  const closer = section(text, 'CIERRE', [])

  // Si el modelo ignora etiquetas, evita volcar todo el raw en el cuerpo.
  const safeBody =
    body ||
    (!lead && !closer
      ? text
          .replace(/^TITULAR\s*:.*$/im, '')
          .trim()
      : '')

  return {
    headline: headline.replace(/^TITULAR\s*:\s*/i, '').trim(),
    lead,
    body: safeBody,
    closer,
    raw: text,
  }
}

function mockArticle(input: string): BulardoArticle {
  const topic = input.replace(/\s+/g, ' ').trim().slice(0, 90) || 'un asunto menor'
  const raw = `TITULAR: El gonocho etílico residual explica lo de “${topic}”
ENTRADA: Un campo magnético inventado por Bulardo estaría detrás del fenómeno, con un 87,3% de casos tras un cambio de ruta absurdo.
CUERPO:
Resulta que no pasa porque la gente quiera, no, es por el "gonocho etílico residual", un campo que desprende cada maceta sospechosa del archipiélago. Según la doctora Aluminia Paparajote, "en ese flipe, el dromedario del buen rollo te arrastra hacia donde los churros valen baratos y hay wifi libre". Venga va, que no son tontos: les renta más el tranvía de la Baixa que quedarse mirando el Atlántico.
CIERRE: Si ves que vuelven a por ti, vete al quiosco y di "quizá no eres un calorro, pero al final te vuelvo a ver, so capullo y con birra detrás".`
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
      temperature: 1.0,
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
