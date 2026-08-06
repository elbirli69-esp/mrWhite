import type { Counter } from './types'

const LEGACY_STORAGE_KEY = 'staycalm-counters-v1'
const MIGRATED_FLAG_KEY = 'staycalm-local-migrated-to-redis-v1'

function isCounter(value: unknown): value is Counter {
  if (!value || typeof value !== 'object') return false
  const c = value as Counter
  return (
    typeof c.phrase === 'string' &&
    c.phrase.trim().length > 0 &&
    typeof c.count === 'number' &&
    Number.isFinite(c.count)
  )
}

/** Lee contadores que quedaron en localStorage antes del modo compartido. */
export function readLegacyLocalCounters(): Counter[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { counters?: unknown }
    if (!Array.isArray(parsed.counters)) return []
    return parsed.counters.filter(isCounter).map((c) => ({
      id: typeof c.id === 'string' ? c.id : `legacy-${c.phrase}`,
      phrase: c.phrase.trim().replace(/\s+/g, ' '),
      count: Math.max(0, Math.floor(c.count)),
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
    }))
  } catch {
    return []
  }
}

export function hasLegacyMigrationRun(): boolean {
  try {
    return localStorage.getItem(MIGRATED_FLAG_KEY) === '1'
  } catch {
    return true
  }
}

export function markLegacyMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATED_FLAG_KEY, '1')
  } catch {
    // ignore
  }
}

/** ¿Hay algo útil que subir al servidor? (más de las semillas o counts > 0) */
export function legacyNeedsMigration(
  local: Counter[],
  server: Counter[],
): boolean {
  if (local.length === 0) return false
  const serverByPhrase = new Map(
    server.map((c) => [c.phrase.toLowerCase(), c.count] as const),
  )
  for (const item of local) {
    const key = item.phrase.toLowerCase()
    const serverCount = serverByPhrase.get(key)
    if (serverCount === undefined) return true
    if (item.count > serverCount) return true
  }
  return false
}
