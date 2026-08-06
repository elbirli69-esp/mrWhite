import { createClient, type RedisClientType } from 'redis'
import {
  createId,
  DEFAULT_COUNTERS,
  normalizePhrase,
  type Counter,
} from './staycalmTypes.js'

const LIST_KEY = 'staycalm:counters:v1'
const LOCK_KEY = 'staycalm:counters:lock'

/** Fallback en memoria cuando no hay Redis (dev local). */
let memoryStore: Counter[] | null = null

/** Cliente reutilizado entre invocaciones serverless. */
let redisClient: RedisClientType | null = null
let redisConnecting: Promise<RedisClientType> | null = null

function cloneDefaults(): Counter[] {
  return DEFAULT_COUNTERS.map((c: Counter) => ({ ...c }))
}

function cloneList(list: Counter[]): Counter[] {
  return list.map((c) => ({ ...c }))
}

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

/** Detecta plantillas de Railway tipo redis://${{REDISUSER}}:... pegadas literales. */
function looksUnresolvedTemplate(value: string): boolean {
  return /\$\{\{|\{\{REDIS|\$\{REDIS/i.test(value)
}

/**
 * Resuelve la URL de Redis.
 * Acepta REDIS_URL completa, o las piezas de Railway
 * (REDISHOST / REDISPORT / REDISUSER / REDIS_PASSWORD).
 */
export function resolveRedisUrl(): string | null {
  const rawUrl = firstEnv('REDIS_URL', 'REDIS_PRIVATE_URL', 'DATABASE_URL')
  if (rawUrl && !looksUnresolvedTemplate(rawUrl)) {
    return rawUrl
  }

  const host = firstEnv('REDISHOST', 'REDIS_HOST', 'RAILWAY_TCP_PROXY_DOMAIN')
  const port = firstEnv('REDISPORT', 'REDIS_PORT', 'RAILWAY_TCP_PROXY_PORT')
  const user = firstEnv('REDISUSER', 'REDIS_USER', 'REDIS_USERNAME') ?? 'default'
  const password = firstEnv(
    'REDIS_PASSWORD',
    'REDISPASSWORD',
    'REDIS_PASS',
  )

  if (host && port && password) {
    const encUser = encodeURIComponent(user)
    const encPass = encodeURIComponent(password)
    return `redis://${encUser}:${encPass}@${host}:${port}`
  }

  return null
}

function hasRedisConfig(): boolean {
  return Boolean(resolveRedisUrl())
}

async function getRedis(): Promise<RedisClientType | null> {
  const url = resolveRedisUrl()
  if (!url) {
    // En Vercel sin Redis los contadores no serían compartidos entre instancias.
    if (process.env.VERCEL) {
      throw new Error(
        'Falta Redis: pon REDIS_URL real (no la plantilla ${{...}}) o REDISHOST/REDISPORT/REDISUSER/REDIS_PASSWORD en Vercel',
      )
    }
    return null
  }

  if (redisClient?.isOpen) return redisClient
  if (redisConnecting) return redisConnecting

  redisConnecting = (async () => {
    const client = createClient({ url }) as RedisClientType
    client.on('error', (err) => {
      console.error('[staycalm redis]', err)
    })
    await client.connect()
    redisClient = client
    return client
  })()

  try {
    return await redisConnecting
  } finally {
    redisConnecting = null
  }
}

function isValidCounter(value: unknown): value is Counter {
  if (!value || typeof value !== 'object') return false
  const c = value as Counter
  return (
    typeof c.id === 'string' &&
    typeof c.phrase === 'string' &&
    c.phrase.trim().length > 0 &&
    typeof c.count === 'number' &&
    Number.isFinite(c.count) &&
    typeof c.createdAt === 'number'
  )
}

function sanitize(list: unknown): Counter[] | null {
  if (!Array.isArray(list)) return null
  return list.filter(isValidCounter).map((c) => ({
    id: c.id,
    phrase: normalizePhrase(c.phrase),
    count: Math.max(0, Math.floor(c.count)),
    createdAt: c.createdAt,
  }))
}

async function readRedis(redis: RedisClientType): Promise<Counter[]> {
  const raw = await redis.get(LIST_KEY)
  if (!raw) {
    const defaults = cloneDefaults()
    await redis.set(LIST_KEY, JSON.stringify(defaults))
    return defaults
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    const sanitized = sanitize(parsed)
    if (sanitized) return sanitized
  } catch {
    // corrupt → reseed
  }

  const defaults = cloneDefaults()
  await redis.set(LIST_KEY, JSON.stringify(defaults))
  return defaults
}

async function withLock<T>(
  redis: RedisClientType,
  fn: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const locked = await redis.set(LOCK_KEY, '1', {
      NX: true,
      PX: 4000,
    })
    if (locked) {
      try {
        return await fn()
      } finally {
        await redis.del(LOCK_KEY)
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 40 + attempt * 25))
  }
  throw new Error('No se pudo obtener el candado de contadores')
}

export async function listCounters(): Promise<Counter[]> {
  const redis = await getRedis()
  if (!redis) {
    if (!memoryStore) memoryStore = cloneDefaults()
    return cloneList(memoryStore)
  }
  return readRedis(redis)
}

async function writeCounters(
  mutator: (prev: Counter[]) => Counter[],
): Promise<Counter[]> {
  const redis = await getRedis()
  if (!redis) {
    if (!memoryStore) memoryStore = cloneDefaults()
    memoryStore = mutator(cloneList(memoryStore))
    return cloneList(memoryStore)
  }

  return withLock(redis, async () => {
    const current = await readRedis(redis)
    const next = mutator(cloneList(current))
    await redis.set(LIST_KEY, JSON.stringify(next))
    return cloneList(next)
  })
}

export async function incrementCounter(id: string): Promise<Counter[]> {
  return writeCounters((prev) => {
    const found = prev.some((c) => c.id === id)
    if (!found) return prev
    return prev.map((c) =>
      c.id === id ? { ...c, count: c.count + 1 } : c,
    )
  })
}

export async function resetCounter(id: string): Promise<Counter[]> {
  return writeCounters((prev) => {
    const found = prev.some((c) => c.id === id)
    if (!found) return prev
    return prev.map((c) => (c.id === id ? { ...c, count: 0 } : c))
  })
}

export async function removeCounter(id: string): Promise<Counter[]> {
  return writeCounters((prev) => prev.filter((c) => c.id !== id))
}

export async function addCounter(phrase: string): Promise<{
  counters: Counter[]
  ok: boolean
  error?: string
}> {
  const trimmed = normalizePhrase(phrase)
  if (!trimmed) {
    return { counters: await listCounters(), ok: false, error: 'empty' }
  }

  let rejected: 'duplicate' | null = null
  const counters = await writeCounters((prev) => {
    const exists = prev.some(
      (c) => c.phrase.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      rejected = 'duplicate'
      return prev
    }
    return [
      ...prev,
      {
        id: createId(),
        phrase: trimmed,
        count: 0,
        createdAt: Date.now(),
      },
    ]
  })

  if (rejected === 'duplicate') {
    return { counters, ok: false, error: 'duplicate' }
  }
  return { counters, ok: true }
}

function sanitizeIncoming(list: unknown): Counter[] {
  if (!Array.isArray(list)) return []
  const out: Counter[] = []
  for (const value of list) {
    if (!value || typeof value !== 'object') continue
    const c = value as Partial<Counter>
    if (typeof c.phrase !== 'string' || !c.phrase.trim()) continue
    if (typeof c.count !== 'number' || !Number.isFinite(c.count)) continue
    out.push({
      id: typeof c.id === 'string' && c.id ? c.id : createId(),
      phrase: normalizePhrase(c.phrase),
      count: Math.max(0, Math.floor(c.count)),
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
    })
  }
  return out
}

/**
 * Fusiona contadores antiguos (p. ej. localStorage) en el estado compartido.
 * - Frases nuevas se añaden
 * - Si ya existe la frase, se queda el count más alto
 */
export async function mergeCounters(incoming: unknown): Promise<{
  counters: Counter[]
  added: number
  updated: number
}> {
  const imported = sanitizeIncoming(incoming)
  let added = 0
  let updated = 0

  const counters = await writeCounters((prev) => {
    const byPhrase = new Map<string, Counter>()
    for (const c of prev) {
      byPhrase.set(c.phrase.toLowerCase(), { ...c })
    }

    for (const item of imported) {
      const key = item.phrase.toLowerCase()
      const existing = byPhrase.get(key)
      if (!existing) {
        byPhrase.set(key, item)
        added += 1
        continue
      }
      if (item.count > existing.count) {
        byPhrase.set(key, { ...existing, count: item.count })
        updated += 1
      }
    }

    const serverOrder = prev.map((c) => c.phrase.toLowerCase())
    const merged: Counter[] = []
    for (const key of serverOrder) {
      const c = byPhrase.get(key)
      if (c) merged.push(c)
      byPhrase.delete(key)
    }
    const extras = [...byPhrase.values()].sort(
      (a, b) => a.createdAt - b.createdAt,
    )
    return [...merged, ...extras]
  })

  return { counters, added, updated }
}

export function usingMemoryFallback(): boolean {
  return !hasRedisConfig() && !process.env.VERCEL
}
