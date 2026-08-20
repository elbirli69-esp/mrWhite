import { useState } from 'react'
import { motion } from 'framer-motion'
import type { BulardoArticle, BulardoAction, BulardoMode } from '../api'
import { copyArticle } from '../formatArticle'

type Props = {
  question: string
  article: BulardoArticle
  mode: BulardoMode
  busy?: boolean
  onAction?: (action: BulardoAction) => void
}

function bodyParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function modeLabel(mode: BulardoMode): string {
  if (mode === 'credible') return 'Creíble'
  if (mode === 'suave') return 'Cuñado suave'
  return 'Cuñado científico'
}

export function ArticleCard({
  question,
  article,
  mode,
  busy = false,
  onAction,
}: Props) {
  const paragraphs = bodyParagraphs(article.body)
  const [copied, setCopied] = useState(false)
  const resolvedMode = article.mode ?? mode

  async function onCopy() {
    try {
      await copyArticle(article)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[var(--bulardo-line)] bg-[var(--bulardo-panel)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[var(--bulardo-accent-soft)] px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--bulardo-accent)] uppercase">
          {modeLabel(resolvedMode)}
        </span>
        <span className="line-clamp-3 max-w-full text-xs tracking-wide break-words text-[var(--bulardo-muted)] whitespace-pre-wrap">
          Pedido · {question}
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

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onCopy()}
          className="rounded-lg border border-[var(--bulardo-line)] px-3 py-2 text-xs font-semibold tracking-wide text-[var(--bulardo-ink)] uppercase hover:bg-[rgba(242,238,230,0.06)]"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction?.('regenerate')}
          className="rounded-lg border border-[var(--bulardo-line)] px-3 py-2 text-xs font-semibold tracking-wide text-[var(--bulardo-ink)] uppercase hover:bg-[rgba(242,238,230,0.06)] disabled:opacity-50"
        >
          Regenerar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction?.('moreAbsurd')}
          className="rounded-lg border border-[var(--bulardo-line)] px-3 py-2 text-xs font-semibold tracking-wide text-[var(--bulardo-ink)] uppercase hover:bg-[rgba(242,238,230,0.06)] disabled:opacity-50"
        >
          Más absurdo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction?.('moreSober')}
          className="rounded-lg border border-[var(--bulardo-line)] px-3 py-2 text-xs font-semibold tracking-wide text-[var(--bulardo-ink)] uppercase hover:bg-[rgba(242,238,230,0.06)] disabled:opacity-50"
        >
          Más sobrio
        </button>
      </div>
    </motion.article>
  )
}
