import type { BulardoArticle } from './api'

export function formatArticlePlain(article: BulardoArticle): string {
  return [article.headline, '', article.lead, '', article.body, '', article.closer]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function copyArticle(article: BulardoArticle): Promise<void> {
  const text = formatArticlePlain(article)
  await navigator.clipboard.writeText(text)
}
