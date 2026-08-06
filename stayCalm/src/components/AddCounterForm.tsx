import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'

type Props = {
  onAdd: (phrase: string) => boolean | Promise<boolean>
  disabled?: boolean
}

export function AddCounterForm({ onAdd, disabled = false }: Props) {
  const [phrase, setPhrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (disabled || pending) return
    setPending(true)
    try {
      const ok = await onAdd(phrase)
      if (!ok) {
        setError(
          phrase.trim()
            ? 'Esa frase ya existe'
            : 'Escribe una frase para contar',
        )
        return
      }
      setPhrase('')
      setError(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/25 bg-[rgba(14,61,72,0.28)] p-4 shadow-[0_16px_48px_rgba(14,61,72,0.18)] backdrop-blur-md sm:p-5"
    >
      <label
        htmlFor="new-phrase"
        className="mb-2 block font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-foam)]"
      >
        Nueva frase
      </label>
      <p className="mb-4 text-sm text-[rgba(232,244,242,0.82)]">
        Añade un botón para empezar a contar otra cosa. Se comparte con todo el
        mundo.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="new-phrase"
          value={phrase}
          onChange={(e) => {
            setPhrase(e.target.value)
            if (error) setError(null)
          }}
          placeholder='ej. "otra vez el lag"'
          maxLength={80}
          disabled={disabled || pending}
          className="min-h-[var(--touch-min)] flex-1 rounded-xl border border-white/20 bg-[var(--color-foam)] px-4 text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || pending}
          className="min-h-[var(--touch-min)] cursor-pointer rounded-xl bg-[var(--color-accent)] px-5 font-semibold text-white transition-colors hover:bg-[var(--color-accent-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Añadir contador
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-[#ffd5d5]" role="alert">
          {error}
        </p>
      ) : null}
    </motion.form>
  )
}
