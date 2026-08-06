import { useEffect, useState } from 'react'
import { createId, loadCounters, saveCounters } from '../storage'
import type { Counter } from '../types'

export function useCounters() {
  const [counters, setCounters] = useState<Counter[]>(() => loadCounters())

  useEffect(() => {
    saveCounters(counters)
  }, [counters])

  function increment(id: string) {
    setCounters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, count: c.count + 1 } : c)),
    )
  }

  function reset(id: string) {
    setCounters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, count: 0 } : c)),
    )
  }

  function remove(id: string) {
    setCounters((prev) => prev.filter((c) => c.id !== id))
  }

  function add(phrase: string): boolean {
    const trimmed = phrase.trim().replace(/\s+/g, ' ')
    if (!trimmed) return false

    const exists = counters.some(
      (c) => c.phrase.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) return false

    setCounters((prev) => [
      ...prev,
      {
        id: createId(),
        phrase: trimmed,
        count: 0,
        createdAt: Date.now(),
      },
    ])
    return true
  }

  return { counters, increment, reset, remove, add }
}
