import {
  buildBulardoUserPrompt,
  buildRetryUserPrompt,
  getBulardoSystemPrompt,
  normalizeBulardoInput,
  type BulardoAction,
  type BulardoMode,
} from './bulardoPrompt.js'

export type BulardoArticle = {
  headline: string
  lead: string
  body: string
  closer: string
  raw: string
  mode: BulardoMode
}

export type { BulardoMode, BulardoAction }

export const BULARDO_INPUT_MAX = 1500
export const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

const MODE_ORDER: BulardoMode[] = ['cunado', 'suave', 'credible']

/** Normaliza la respuesta del modelo para que el parseo por etiquetas no se rompa. */
export function normalizeModelOutput(raw: string): string {
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
  const re = new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)${next}`, 'i')
  return text.match(re)?.[1]?.trim() || ''
}

export function parseArticle(
  raw: string,
  mode: BulardoMode = 'cunado',
): BulardoArticle {
  const text = normalizeModelOutput(raw)

  const headline =
    section(text, 'TITULAR', ['ENTRADA', 'CUERPO', 'CIERRE']) ||
    text
      .split('\n')
      .find((l) => l.trim() && !/^(ENTRADA|CUERPO|CIERRE)\s*:/i.test(l))
      ?.trim() ||
    'Suceso sin confirmar altera la agenda informativa'

  const lead = section(text, 'ENTRADA', ['CUERPO', 'CIERRE'])
  const body = section(text, 'CUERPO', ['CIERRE'])
  const closer = section(text, 'CIERRE', [])

  const safeBody =
    body ||
    (!lead && !closer
      ? text.replace(/^TITULAR\s*:.*$/im, '').trim()
      : '')

  return {
    headline: headline.replace(/^TITULAR\s*:\s*/i, '').trim(),
    lead,
    body: safeBody,
    closer,
    raw: text,
    mode,
  }
}

export function isCompleteArticle(article: BulardoArticle): boolean {
  return Boolean(
    article.headline?.trim() &&
      article.lead?.trim() &&
      article.body?.trim() &&
      article.closer?.trim(),
  )
}

export function formatArticlePlain(article: BulardoArticle): string {
  const parts = [
    article.headline,
    '',
    article.lead,
    '',
    article.body,
    '',
    article.closer,
  ]
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function resolveBulardoMode(value: unknown): BulardoMode {
  if (value === 'suave' || value === 'soft') return 'suave'
  if (
    value === true ||
    value === 'true' ||
    value === 'credible' ||
    value === 'scientific' ||
    value === 1
  ) {
    return 'credible'
  }
  if (value === 'cunado' || value === 'false' || value === false || value === 0) {
    return 'cunado'
  }
  return 'cunado'
}

export function resolveBulardoAction(value: unknown): BulardoAction {
  if (value === 'regenerate' || value === 'moreAbsurd' || value === 'moreSober') {
    return value
  }
  return 'generate'
}

/** moreAbsurd → hacia cunado; moreSober → hacia credible. */
export function shiftMode(mode: BulardoMode, action: BulardoAction): BulardoMode {
  const idx = MODE_ORDER.indexOf(mode)
  if (action === 'moreAbsurd') {
    return MODE_ORDER[Math.max(0, idx - 1)] ?? 'cunado'
  }
  if (action === 'moreSober') {
    return MODE_ORDER[Math.min(MODE_ORDER.length - 1, idx + 1)] ?? 'credible'
  }
  return mode
}

export function temperatureFor(mode: BulardoMode, action: BulardoAction): number {
  const base = mode === 'credible' ? 0.7 : mode === 'suave' ? 0.9 : 1.0
  if (action === 'regenerate') return Math.min(1.25, base + 0.15)
  if (action === 'moreAbsurd') return Math.min(1.25, base + 0.1)
  if (action === 'moreSober') return Math.max(0.55, base - 0.1)
  return base
}

function mockArticle(input: string, mode: BulardoMode): BulardoArticle {
  const topic = input.replace(/\s+/g, ' ').trim().slice(0, 90) || 'un asunto menor'

  if (mode === 'credible') {
    const raw = `TITULAR: Un estudio preliminar asocia “${topic}” a patrones ambientales medibles
ENTRADA: Un equipo del Instituto Ibérico de Dinámica Socioambiental estima un aumento del 12,4% en la señal observada tras controlar por estacionalidad.
CUERPO:
La investigación, basada en 4.812 registros longitudinales, apunta a una correlación moderada (r=0,31; p=0,004). “No hablamos de causalidad cerrada”, señaló la Dra. Elena Marqués.

Los autores advierten limitaciones de cobertura rural y proponen validar el hallazgo con sensores independientes.
CIERRE: El consorcio prevé ampliar la cohorte en el próximo trimestre.`
    return parseArticle(raw, mode)
  }

  if (mode === 'suave') {
    const raw = `TITULAR: Un informe sitúa “${topic}” en un vector panfláutico experimental
ENTRADA: El Observatorio Ibérico de Trashumancia Urbana registra 18.447 desplazamientos asociados al fenómeno.
CUERPO:
Según el Dr. Gumersindo Pechugón, el 73,2% de los casos respondería a una resonancia de mochila medida con boyas sonoras. El protocolo propone corredores peatonales cuando el viento gira a noroeste.
CIERRE: Si te pica el flaute, se te pone la polla tiesa como un poste.`
    return parseArticle(raw, mode)
  }

  const raw = `TITULAR: El gonocho etílico residual explica lo de “${topic}” y yo flipando
ENTRADA: O sea, un campo magnético inventado por Bulardo estaría detrás, con un 87,3% de casos. Qué fuerte.
CUERPO:
Literal no pasa porque la gente quiera, en plan, es por el "gonocho etílico residual". Según la doctora Aluminia Paparajote, "el dromedario del buen rollo te arrastra hacia donde los churros valen baratos". No puedo con esto. Fuente: un colega xD. Menuda estafa no es: les renta más el tranvía.
CIERRE: Si ves que vuelven a por ti, vete al quiosco y di "quizá no eres un calorro, pero al final te vuelvo a ver, so capullo y con birra detrás".`
  return parseArticle(raw, mode)
}

async function callDeepSeekOnce(
  apiKey: string,
  system: string,
  user: string,
  temperature: number,
): Promise<string> {
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature,
      max_tokens: 800,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[bulardo deepseek]', response.status, detail.slice(0, 300))
    if (response.status === 429) {
      throw new Error('DeepSeek saturado, prueba en unos minutos')
    }
    throw new Error('DeepSeek no respondió')
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('Respuesta vacía del modelo')
  }
  return content
}

export type GenerateOptions = {
  mode?: BulardoMode
  action?: BulardoAction
}

export async function generateBulardoArticle(
  input: string,
  modeOrOptions: BulardoMode | GenerateOptions = 'cunado',
): Promise<BulardoArticle> {
  const options: GenerateOptions =
    typeof modeOrOptions === 'string' ? { mode: modeOrOptions } : modeOrOptions
  const action = options.action ?? 'generate'
  let mode = options.mode ?? 'cunado'
  if (action === 'moreAbsurd' || action === 'moreSober') {
    mode = shiftMode(mode, action)
  }

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
    return mockArticle(trimmed, mode)
  }

  const temperature = temperatureFor(mode, action)
  const system = getBulardoSystemPrompt(mode)
  let content = await callDeepSeekOnce(
    apiKey,
    system,
    buildBulardoUserPrompt(trimmed, mode, action),
    temperature,
  )
  let article = parseArticle(content, mode)

  if (!isCompleteArticle(article)) {
    content = await callDeepSeekOnce(
      apiKey,
      system,
      buildRetryUserPrompt(trimmed, mode),
      Math.max(0.5, temperature - 0.15),
    )
    article = parseArticle(content, mode)
  }

  return article
}

/** Abre el stream de DeepSeek (el caller hace proxy SSE). */
export async function openBulardoDeepSeekStream(
  input: string,
  mode: BulardoMode,
  action: BulardoAction = 'generate',
): Promise<Response> {
  const trimmed = normalizeBulardoInput(input)
  if (!trimmed) throw new Error('Pedido vacío')
  if (trimmed.length > BULARDO_INPUT_MAX) {
    throw new Error(`Pedido demasiado largo (máx. ${BULARDO_INPUT_MAX} caracteres)`)
  }

  let effectiveMode = mode
  if (action === 'moreAbsurd' || action === 'moreSober') {
    effectiveMode = shiftMode(mode, action)
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      process.env.VERCEL ? 'Falta DEEPSEEK_API_KEY' : 'NO_STREAM_MOCK',
    )
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: temperatureFor(effectiveMode, action),
      max_tokens: 800,
      stream: true,
      messages: [
        { role: 'system', content: getBulardoSystemPrompt(effectiveMode) },
        {
          role: 'user',
          content: buildBulardoUserPrompt(trimmed, effectiveMode, action),
        },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[bulardo deepseek stream]', response.status, detail.slice(0, 300))
    if (response.status === 429) {
      throw new Error('DeepSeek saturado, prueba en unos minutos')
    }
    throw new Error('DeepSeek no respondió')
  }

  return response
}

export function mockArticleForMode(input: string, mode: BulardoMode): BulardoArticle {
  return mockArticle(normalizeBulardoInput(input) || 'un asunto menor', mode)
}
