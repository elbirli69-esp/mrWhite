import type { Counter, CountersState } from './types'

/** Misma clave siempre: no cambiar o se pierden contadores y frases guardadas. */
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

function normalizeCounters(counters: unknown): Counter[] | null {
  if (!Array.isArray(counters)) return null

  const normalized = counters
    .filter(
      (c): c is Counter =>
        typeof c?.id === 'string' &&
        typeof c?.phrase === 'string' &&
        c.phrase.trim().length > 0 &&
        typeof c?.count === 'number' &&
        Number.isFinite(c.count),
    )
    .map((c) => ({
      id: c.id,
      phrase: c.phrase.trim().replace(/\s+/g, ' '),
      count: Math.max(0, Math.floor(c.count)),
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
    }))

  return normalized
}

/**
 * Carga contadores desde localStorage.
 * Si hay datos guardados (aunque fallen al parsear), no los sustituye por defecto
 * en caliente: eso lo evita el hook al no guardar en el primer mount fallido.
 */
export function loadCounters(): Counter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_COUNTERS.map((c) => ({ ...c }))

    const parsed = JSON.parse(raw) as CountersState
    const normalized = normalizeCounters(parsed?.counters)
    if (!normalized) return DEFAULT_COUNTERS.map((c) => ({ ...c }))

    // Lista vacía guardada a propósito (el usuario quitó todas las frases).
    return normalized
  } catch {
    return DEFAULT_COUNTERS.map((c) => ({ ...c }))
  }
}

export function saveCounters(counters: Counter[]): boolean {
  try {
    const payload: CountersState = { counters }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
