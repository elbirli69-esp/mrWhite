import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  requestBulardoArticle,
  type BulardoAction,
  type BulardoMode,
  type ChatItem,
} from './api'
import { ArticleCard } from './components/ArticleCard'
import { loadHistory, saveHistoryEntry, type HistoryEntry } from './history'
import { BULARDO_TEMPLATES } from './templates'

const INPUT_MAX = 1500

const MODES: Array<{ id: BulardoMode; label: string; hint: string }> = [
  { id: 'cunado', label: 'Cuñado', hint: 'Gen Z + toques foro' },
  { id: 'suave', label: 'Suave', hint: 'Absurdo, poco slang' },
  { id: 'credible', label: 'Creíble', hint: 'Nota científica' },
]

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
  const [mode, setMode] = useState<BulardoMode>('cunado')
  const [items, setItems] = useState<ChatItem[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items, pending])

  async function runGenerate(
    question: string,
    useMode: BulardoMode,
    action: BulardoAction = 'generate',
  ) {
    if (!question || pending) return

    setError(null)
    setPending(true)

    const streamingId = uid()
    if (action === 'generate') {
      setItems((prev) => [
        ...prev,
        { id: uid(), role: 'user', text: question, mode: useMode },
        { id: streamingId, role: 'streaming', text: '' },
      ])
    } else {
      setItems((prev) => [
        ...prev,
        { id: streamingId, role: 'streaming', text: '' },
      ])
    }

    try {
      const article = await requestBulardoArticle(question, {
        mode: useMode,
        action,
        onToken: (token) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === streamingId && item.role === 'streaming'
                ? { ...item, text: item.text + token }
                : item,
            ),
          )
        },
      })
      const resolvedMode = article.mode ?? useMode
      setItems((prev) => {
        const withoutStream = prev.filter((item) => item.id !== streamingId)
        return [
          ...withoutStream,
          {
            id: uid(),
            role: 'article',
            question,
            article,
            mode: resolvedMode,
          },
        ]
      })
      setHistory(
        saveHistoryEntry({
          question,
          mode: resolvedMode,
          article,
        }),
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo fabricar la noticia'
      setError(message)
      setItems((prev) => {
        const withoutStream = prev.filter((item) => item.id !== streamingId)
        return [...withoutStream, { id: uid(), role: 'error', text: message }]
      })
    } finally {
      setPending(false)
    }
  }

  async function submitDraft() {
    const trimmed = normalizeInput(draft)
    if (!trimmed || pending) return
    setDraft('')
    await runGenerate(trimmed, mode, 'generate')
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

  function applyTemplate(id: string) {
    const template = BULARDO_TEMPLATES.find((t) => t.id === id)
    if (!template) return
    setDraft(template.text.slice(0, INPUT_MAX))
    if (template.mode) setMode(template.mode)
    setError(null)
  }

  function openHistoryEntry(entry: HistoryEntry) {
    setItems((prev) => [
      ...prev,
      { id: uid(), role: 'user', text: entry.question, mode: entry.mode },
      {
        id: uid(),
        role: 'article',
        question: entry.question,
        article: entry.article,
        mode: entry.mode,
      },
    ])
    setHistoryOpen(false)
  }

  const pendingLabel =
    mode === 'credible'
      ? 'Calibrando cable científico…'
      : mode === 'suave'
        ? 'Montando bulo suave…'
        : 'Inventando cable de foro…'

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-8 pb-6 sm:px-5">
      <header className="mb-6">
        <p className="mb-3 flex items-center justify-between gap-3">
          <a
            href="/"
            className="text-sm font-medium tracking-wide text-[var(--bulardo-muted)] underline-offset-4 transition-colors hover:text-[var(--bulardo-ink)] hover:underline"
          >
            ← Apps
          </a>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="text-sm font-medium tracking-wide text-[var(--bulardo-muted)] underline-offset-4 hover:text-[var(--bulardo-ink)] hover:underline"
          >
            {historyOpen ? 'Cerrar historial' : `Anteriores (${history.length})`}
          </button>
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
          Pregunta o pega factos. Elige cuñado, suave o creíble; copia y
          regenera desde cada cable.
        </motion.p>
        <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-[var(--bulardo-accent)] uppercase">
          100% inventado · no es información real
        </p>
      </header>

      {historyOpen ? (
        <div className="mb-4 rounded-2xl border border-[var(--bulardo-line)] bg-[var(--bulardo-panel)] p-4">
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-[var(--bulardo-accent)] uppercase">
            Historial local
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--bulardo-muted)]">Aún no hay bulos guardados.</p>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 12).map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => openHistoryEntry(entry)}
                    className="w-full rounded-xl border border-[var(--bulardo-line)] px-3 py-2 text-left text-sm text-[var(--bulardo-ink)] hover:bg-[rgba(242,238,230,0.06)]"
                  >
                    <span className="block text-[0.65rem] tracking-wide text-[var(--bulardo-muted)] uppercase">
                      {entry.mode} · {new Date(entry.savedAt).toLocaleString('es-ES')}
                    </span>
                    <span className="line-clamp-2">{entry.article.headline}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <section aria-label="Conversación" className="flex flex-1 flex-col gap-4 pb-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--bulardo-line)] px-5 py-8 text-[var(--bulardo-muted)]">
            <p className="text-center text-sm">Plantillas rápidas</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {BULARDO_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.id)}
                  className="rounded-full border border-[var(--bulardo-line)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--bulardo-ink)] uppercase hover:bg-[rgba(242,238,230,0.06)]"
                >
                  {template.label}
                </button>
              ))}
            </div>
            <p className="mt-6 text-center text-sm">
              O prueba: “Me he metido una fabada y no me cabe ni el aire”
            </p>
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
                  <span className="mb-2 block text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--bulardo-accent)] uppercase">
                    {item.mode}
                  </span>
                  {item.text}
                </motion.div>
              )
            }
            if (item.role === 'streaming') {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-dashed border-[var(--bulardo-line)] px-4 py-3 text-sm whitespace-pre-wrap text-[var(--bulardo-muted)]"
                >
                  {item.text || '…'}
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
                mode={item.mode}
                busy={pending}
                onAction={(action) => {
                  void runGenerate(item.question, item.mode, action)
                }}
              />
            )
          })}
        </AnimatePresence>

        {pending ? (
          <p className="text-sm tracking-wide text-[var(--bulardo-muted)]">
            {pendingLabel}
          </p>
        ) : null}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 mt-auto border-t border-[var(--bulardo-line)] bg-[rgba(12,13,16,0.92)] pt-4 backdrop-blur"
      >
        <div
          className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-[var(--bulardo-line)] bg-[var(--bulardo-panel)] p-1"
          role="radiogroup"
          aria-label="Modo de bulo"
        >
          {MODES.map((option) => {
            const active = mode === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => setMode(option.id)}
                className={`rounded-lg px-2 py-2 text-center transition-colors ${
                  active
                    ? 'bg-[var(--bulardo-accent)] text-white'
                    : 'text-[var(--bulardo-muted)] hover:text-[var(--bulardo-ink)]'
                }`}
              >
                <span className="block text-xs font-semibold tracking-wide uppercase">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[0.65rem] opacity-80">
                  {option.hint}
                </span>
              </button>
            )
          })}
        </div>

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
            placeholder="Pregunta… o “Crea un bulo” + factos (Shift+Enter = nueva línea)"
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
