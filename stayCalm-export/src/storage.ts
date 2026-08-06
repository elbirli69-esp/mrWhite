import type { Counter, CountersState } from './types'

const STORAGE_KEY = 'staycalm-counters-v1'

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

export function loadCounters(): Counter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_COUNTERS.map((c) => ({ ...c }))

    const parsed = JSON.parse(raw) as CountersState
    if (!Array.isArray(parsed.counters)) return DEFAULT_COUNTERS.map((c) => ({ ...c }))

    return parsed.counters
      .filter(
        (c): c is Counter =>
          typeof c?.id === 'string' &&
          typeof c?.phrase === 'string' &&
          typeof c?.count === 'number' &&
          Number.isFinite(c.count),
      )
      .map((c) => ({
        id: c.id,
        phrase: c.phrase,
        count: Math.max(0, Math.floor(c.count)),
        createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
      }))
  } catch {
    return DEFAULT_COUNTERS.map((c) => ({ ...c }))
  }
}

export function saveCounters(counters: Counter[]): void {
  const payload: CountersState = { counters }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
