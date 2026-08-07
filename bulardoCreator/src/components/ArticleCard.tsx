import { motion } from 'framer-motion'
import type { BulardoArticle } from '../api'

type Props = {
  question: string
  article: BulardoArticle
  credible?: boolean
}

function bodyParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function ArticleCard({ question, article, credible = false }: Props) {
  const paragraphs = bodyParagraphs(article.body)
  const isCredible = credible || article.mode === 'credible'

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[var(--bulardo-line)] bg-[var(--bulardo-panel)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[var(--bulardo-accent-soft)] px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--bulardo-accent)] uppercase">
          {isCredible ? 'Creíble' : 'Cuñado científico'}
        </span>
        <span className="line-clamp-3 max-w-full text-xs tracking-wide break-words text-[var(--bulardo-muted)] whitespace-pre-wrap">
          Por curiosidad · {question}
        </span>
      </div>

      <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight font-bold tracking-tight text-[var(--bulardo-ink)] sm:text-3xl">
        {article.headline}
      </h2>

      {article.lead ? (
        <p className="mt-4 text-[1.05rem] leading-relaxed font-medium text-[var(--bulardo-ink)]">
          {article.lead}
        </p>
      ) : null}

      {paragraphs.length > 0 ? (
        <div className="mt-4 space-y-3 text-[0.98rem] leading-relaxed text-[var(--bulardo-muted)]">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {article.closer ? (
        <p className="mt-4 border-t border-[var(--bulardo-line)] pt-4 text-sm text-[var(--bulardo-muted)]">
          {article.closer}
        </p>
      ) : null}
    </motion.article>
  )
}
