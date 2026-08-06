export type Counter = {
  id: string
  phrase: string
  count: number
  createdAt: number
}

export type CountersState = {
  counters: Counter[]
}

/** Frases iniciales compartidas (semilla del servidor). */
export const DEFAULT_COUNTERS: Counter[] = [
  {
    id: 'seed-quejas-gg',
    phrase: 'quejas gg',
    count: 0,
    createdAt: 1,
  },
  {
    id: 'seed-thank-you-driver',
    phrase: 'thank you driver',
    count: 0,
    createdAt: 2,
  },
]

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function normalizePhrase(phrase: string): string {
  return phrase.trim().replace(/\s+/g, ' ')
}
