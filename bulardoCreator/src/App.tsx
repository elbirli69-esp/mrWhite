import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { requestBulardoArticle, type ChatItem } from './api'
import { ArticleCard } from './components/ArticleCard'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [question, setQuestion] = useState('')
  const [items, setItems] = useState<ChatItem[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items, pending])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = question.trim().replace(/\s+/g, ' ')
    if (!trimmed || pending) return

    setError(null)
    setQuestion('')
    setItems((prev) => [...prev, { id: uid(), role: 'user', text: trimmed }])
    setPending(true)

    try {
      const article = await requestBulardoArticle(trimmed)
      setItems((prev) => [
        ...prev,
        { id: uid(), role: 'article', question: trimmed, article },
      ])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo fabricar la noticia'
      setError(message)
      setItems((prev) => [
        ...prev,
        { id: uid(), role: 'error', text: message },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-8 pb-6 sm:px-5">
      <header className="mb-6">
        <p className="mb-3">
          <a
            href="/"
            className="text-sm font-medium tracking-wide text-[var(--bulardo-muted)] underline-offset-4 transition-colors hover:text-[var(--bulardo-ink)] hover:underline"
          >
            ← Apps
          </a>
        </p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl"
        >
          bulardoCreator
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-3 max-w-md text-[var(--bulardo-muted)]"
        >
          Pregunta por curiosidad. Entra el Modo Cuñado Científico: instituto
          ficticio, estudio absurdo y cero consejos útiles.
        </motion.p>
        <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-[var(--bulardo-accent)] uppercase">
          Modo Cuñado Científico · 100% inventado
        </p>
      </header>

      <section
        aria-label="Conversación"
        className="flex flex-1 flex-col gap-4 pb-4"
      >
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--bulardo-line)] px-5 py-10 text-center text-[var(--bulardo-muted)]">
            Prueba con algo como “estómago lleno de fabada”, “efecto Venturi”
            o “por qué me pica la rodilla cuando llueve”.
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {items.map((item) => {
            if (item.role === 'user') {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ml-auto max-w-[90%] rounded-2xl bg-[rgba(242,238,230,0.1)] px-4 py-3 text-[var(--bulardo-ink)]"
                >
                  Por curiosidad: {item.text}
                </motion.div>
              )
            }
            if (item.role === 'error') {
              return (
                <p
                  key={item.id}
                  className="rounded-xl border border-[var(--bulardo-accent)]/40 bg-[var(--bulardo-accent-soft)] px-4 py-3 text-sm text-[#ffb4ab]"
                  role="alert"
                >
                  {item.text}
                </p>
              )
            }
            return (
              <ArticleCard
                key={item.id}
                question={item.question}
                article={item.article}
              />
            )
          })}
        </AnimatePresence>

        {pending ? (
          <p className="text-sm tracking-wide text-[var(--bulardo-muted)]">
            Redacción inventando cable…
          </p>
        ) : null}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 mt-auto border-t border-[var(--bulardo-line)] bg-[rgba(12,13,16,0.92)] pt-4 backdrop-blur"
      >
        <label htmlFor="bulardo-q" className="sr-only">
          Pregunta por curiosidad
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="bulardo-q"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value)
              if (error) setError(null)
            }}
            maxLength={280}
            placeholder="Por curiosidad…"
            disabled={pending}
            className="min-h-12 flex-1 rounded-xl border border-[var(--bulardo-line)] bg-[var(--bulardo-panel)] px-4 text-[var(--bulardo-ink)] placeholder:text-[var(--bulardo-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bulardo-accent)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !question.trim()}
            className="min-h-12 cursor-pointer rounded-xl bg-[var(--bulardo-accent)] px-5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Fabricar
          </button>
        </div>
      </form>
    </div>
  )
}
