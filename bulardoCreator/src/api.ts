export type BulardoMode = 'cunado' | 'suave' | 'credible'
export type BulardoAction = 'generate' | 'regenerate' | 'moreAbsurd' | 'moreSober'

export type BulardoArticle = {
  headline: string
  lead: string
  body: string
  closer: string
  raw: string
  mode?: BulardoMode
}

export type ChatItem =
  | { id: string; role: 'user'; text: string; mode: BulardoMode }
  | {
      id: string
      role: 'article'
      question: string
      article: BulardoArticle
      mode: BulardoMode
    }
  | { id: string; role: 'error'; text: string }
  | { id: string; role: 'streaming'; text: string }

export type RequestOptions = {
  mode?: BulardoMode
  action?: BulardoAction
  onToken?: (token: string) => void
}

function friendlyError(status: number, fallback: string): string {
  if (status === 429) return 'Límite de uso, prueba en unos minutos'
  if (status >= 500) return fallback || 'DeepSeek no respondió'
  return fallback || 'No se pudo fabricar la noticia'
}

export async function requestBulardoArticle(
  question: string,
  options: RequestOptions = {},
): Promise<BulardoArticle> {
  const mode = options.mode ?? 'cunado'
  const action = options.action ?? 'generate'

  const res = await fetch('/api/bulardo', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, mode, action, stream: true }),
  })

  if (!res.ok) {
    let message = 'No se pudo fabricar la noticia'
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(friendlyError(res.status, message))
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    const data = (await res.json()) as {
      article?: BulardoArticle
      error?: string
    }
    if (!data.article) {
      throw new Error(data.error || 'No se pudo fabricar la noticia')
    }
    return {
      ...data.article,
      mode: data.article.mode ?? mode,
    }
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('DeepSeek no respondió')

  const decoder = new TextDecoder()
  let buffer = ''
  let article: BulardoArticle | null = null
  let eventName = 'message'

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''

    for (const chunk of chunks) {
      const lines = chunk.split('\n')
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          dataLine += line.slice(5).trim()
        }
      }
      if (!dataLine) continue
      try {
        const payload = JSON.parse(dataLine) as {
          token?: string
          article?: BulardoArticle
          error?: string
          mode?: BulardoMode
        }
        if (eventName === 'token' && payload.token) {
          options.onToken?.(payload.token)
        }
        if (eventName === 'article' && payload.article) {
          article = {
            ...payload.article,
            mode: payload.article.mode ?? payload.mode ?? mode,
          }
        }
        if (eventName === 'error' && payload.error) {
          throw new Error(payload.error)
        }
      } catch (err) {
        if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
          if (eventName === 'error' || err.message.includes('Límite') || err.message.includes('DeepSeek')) {
            throw err
          }
        }
      }
      eventName = 'message'
    }
  }

  if (!article) {
    throw new Error('DeepSeek no respondió')
  }
  return article
}
