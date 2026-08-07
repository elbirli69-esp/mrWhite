import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { requestBulardoArticle, type ChatItem } from './api'
import { ArticleCard } from './components/ArticleCard'

const INPUT_MAX = 1500

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeInput(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function App() {
  const [draft, setDraft] = useState('')
  const [items, setItems] = useState<ChatItem[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items, pending])

  async function submitDraft() {
    const trimmed = normalizeInput(draft)
    if (!trimmed || pending) return

    setError(null)
    setDraft('')
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await submitDraft()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitDraft()
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
          className="mt-3 max-w-lg text-[var(--bulardo-muted)]"
        >
          Pregunta o pega factos: cable serio por fuera, absurdo por dentro.
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
          <div className="rounded-2xl border border-dashed border-[var(--bulardo-line)] px-5 py-10 text-[var(--bulardo-muted)]">
            <p className="text-center">
              Ejemplos (ya no van Venturi ni pesetas): curiosidad real o bulo con
              factos
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed">
              <li>
                “Me he metido una fabada y no me cabe ni el aire, ¿qué hago?”
              </li>
              <li>
                “¿Por qué el WiFi va fatal cuando llueve?”
              </li>
              <li className="whitespace-pre-wrap">
                {`Crea un bulo:
- El café de gasolinera sube un 40%
- Lo dice un estudio con 18.000 camioneros
- Culpan a las cápsulas mal recicladas`}
              </li>
            </ul>
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
                  className="ml-auto max-w-[90%] rounded-2xl bg-[rgba(242,238,230,0.1)] px-4 py-3 text-[var(--bulardo-ink)] whitespace-pre-wrap"
                >
                  {item.text}
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
          Pregunta o briefing del bulo
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            id="bulardo-q"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, INPUT_MAX))
              if (error) setError(null)
            }}
            onKeyDown={onKeyDown}
            maxLength={INPUT_MAX}
            rows={3}
            placeholder="Pregunta… o “Crea un bulo” + factos (Shift+Enter para nueva línea)"
            disabled={pending}
            className="min-h-24 flex-1 resize-y rounded-xl border border-[var(--bulardo-line)] bg-[var(--bulardo-panel)] px-4 py-3 text-[var(--bulardo-ink)] placeholder:text-[var(--bulardo-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bulardo-accent)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="min-h-12 cursor-pointer rounded-xl bg-[var(--bulardo-accent)] px-5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-24"
          >
            Fabricar
          </button>
        </div>
        <p className="mt-2 text-right text-xs text-[var(--bulardo-muted)]">
          {draft.length}/{INPUT_MAX}
        </p>
      </form>
    </div>
  )
}
