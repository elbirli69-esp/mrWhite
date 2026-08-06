import { useEffect, useRef, useState } from 'react'
import { createId, loadCounters, saveCounters } from '../storage'
import type { Counter } from '../types'

function persist(next: Counter[]): Counter[] {
  saveCounters(next)
  return next
}

export function useCounters() {
  const [counters, setCounters] = useState<Counter[]>(() => loadCounters())
  const countersRef = useRef(counters)
  countersRef.current = counters

  // Guardado síncrono en cada mutación; este efecto solo respalda cambios
  // posteriores al primer mount (evita pisar localStorage si la carga falló).
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    saveCounters(counters)
  }, [counters])

  // Si cierran o recargan a mitad de un click, flushear el estado actual.
  useEffect(() => {
    const flush = () => {
      saveCounters(countersRef.current)
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  function increment(id: string) {
    setCounters((prev) =>
      persist(
        prev.map((c) => (c.id === id ? { ...c, count: c.count + 1 } : c)),
      ),
    )
  }

  function reset(id: string) {
    setCounters((prev) =>
      persist(prev.map((c) => (c.id === id ? { ...c, count: 0 } : c))),
    )
  }

  function remove(id: string) {
    setCounters((prev) => persist(prev.filter((c) => c.id !== id)))
  }

  function add(phrase: string): boolean {
    const trimmed = phrase.trim().replace(/\s+/g, ' ')
    if (!trimmed) return false

    const exists = counters.some(
      (c) => c.phrase.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) return false

    setCounters((prev) =>
      persist([
        ...prev,
        {
          id: createId(),
          phrase: trimmed,
          count: 0,
          createdAt: Date.now(),
        },
      ]),
    )
    return true
  }

  return { counters, increment, reset, remove, add }
}
