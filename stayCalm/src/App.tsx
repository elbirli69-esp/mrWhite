import { AnimatePresence, motion } from 'framer-motion'
import { AddCounterForm } from './components/AddCounterForm'
import { CounterCard } from './components/CounterCard'
import { useCounters } from './hooks/useCounters'

export default function App() {
  const { counters, increment, reset, remove, add } = useCounters()
  const total = counters.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <div className="atmosphere-orb atmosphere-orb--a" aria-hidden />
      <div className="atmosphere-orb atmosphere-orb--b" aria-hidden />

      <main className="relative mx-auto flex w-full max-w-lg flex-col gap-8 px-5 pt-10 pb-16 sm:pt-14">
        <header className="brand-mark text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-[var(--color-foam)] sm:text-6xl"
          >
            stayCalm
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-3 max-w-[22rem] text-[var(--color-foam)]/85"
          >
            Cuenta las frases. Respira. Sigue.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="mt-4 text-sm font-medium tracking-wide text-[rgba(232,244,242,0.7)] uppercase"
          >
            {total === 0
              ? 'Todavía cero. Qué paz.'
              : `${total} en total · ${counters.length} frases`}
          </motion.p>
        </header>

        <AddCounterForm onAdd={add} />

        <section aria-label="Contadores" className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {counters.map((counter, index) => (
              <CounterCard
                key={counter.id}
                counter={counter}
                index={index}
                onIncrement={increment}
                onReset={reset}
                onRemove={remove}
              />
            ))}
          </AnimatePresence>

          {counters.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-white/30 px-5 py-10 text-center text-[var(--color-foam)]/80"
            >
              No hay frases. Añade una arriba y empieza a contar.
            </motion.p>
          ) : null}
        </section>
      </main>
    </div>
  )
}
