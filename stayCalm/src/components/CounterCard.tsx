import { motion } from 'framer-motion'
import type { Counter } from '../types'

type Props = {
  counter: Counter
  index: number
  onIncrement: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}

export function CounterCard({
  counter,
  index,
  onIncrement,
  onReset,
  onRemove,
}: Props) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_40px_rgba(14,61,72,0.12)] backdrop-blur-md"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => onIncrement(counter.id)}
        className="flex w-full cursor-pointer flex-col items-start gap-3 px-5 py-5 text-left transition-colors hover:bg-white/35 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)]"
        aria-label={`Sumar 1 a “${counter.phrase}”. Ahora va en ${counter.count}`}
      >
        <span className="text-sm font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">
          frase
        </span>
        <span className="font-[family-name:var(--font-display)] text-2xl leading-tight font-semibold text-[var(--color-ink)] sm:text-[1.7rem]">
          {counter.phrase}
        </span>
        <motion.span
          key={counter.count}
          initial={{ scale: 1.18, opacity: 0.55 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none font-bold tabular-nums text-[var(--color-accent-deep)]"
        >
          {counter.count}
        </motion.span>
        <span className="text-sm text-[var(--color-ink-muted)]">
          Toca para sumar
        </span>
      </motion.button>

      <div className="flex border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => onReset(counter.id)}
          disabled={counter.count === 0}
          className="min-h-[var(--touch-min)] flex-1 cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--color-ink-muted)] transition-colors hover:bg-white/40 hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => onRemove(counter.id)}
          className="min-h-[var(--touch-min)] flex-1 cursor-pointer border-l border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-danger)] transition-colors hover:bg-white/40"
        >
          Quitar
        </button>
      </div>
    </motion.article>
  )
}
