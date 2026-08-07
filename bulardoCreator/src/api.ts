export type BulardoMode = 'cunado' | 'credible'

export type BulardoArticle = {
  headline: string
  lead: string
  body: string
  closer: string
  raw: string
  mode?: BulardoMode
}

export type ChatItem =
  | { id: string; role: 'user'; text: string; credible: boolean }
  | {
      id: string
      role: 'article'
      question: string
      article: BulardoArticle
      credible: boolean
    }
  | { id: string; role: 'error'; text: string }

export async function requestBulardoArticle(
  question: string,
  credible = false,
): Promise<BulardoArticle> {
  const res = await fetch('/api/bulardo', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, credible }),
  })
  const data = (await res.json()) as {
    ok?: boolean
    article?: BulardoArticle
    error?: string
  }
  if (!res.ok || !data.article) {
    throw new Error(data.error || 'No se pudo fabricar la noticia')
  }
  return {
    ...data.article,
    mode: data.article.mode ?? (credible ? 'credible' : 'cunado'),
  }
}
