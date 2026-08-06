import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSharedCounters, postSharedAction } from '../api/countersApi'
import {
  hasLegacyMigrationRun,
  legacyNeedsMigration,
  markLegacyMigrationDone,
  readLegacyLocalCounters,
} from '../legacyLocal'
import type { Counter } from '../types'

const POLL_MS = 2500

export type SyncStatus = 'loading' | 'live' | 'error'

export function useCounters() {
  const [counters, setCounters] = useState<Counter[]>([])
  const [status, setStatus] = useState<SyncStatus>('loading')
  const busyRef = useRef(false)
  const migrationTried = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSharedCounters()
      setCounters(next)
      setStatus('live')
      return next
    } catch {
      setStatus((prev) => (prev === 'loading' ? 'error' : prev))
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const server = await refresh()
      if (cancelled || server === null || migrationTried.current) return
      migrationTried.current = true

      // Recupera frases/contadores que quedaron en localStorage del modo anterior.
      if (hasLegacyMigrationRun()) return
      const local = readLegacyLocalCounters()
      if (!legacyNeedsMigration(local, server)) {
        markLegacyMigrationDone()
        return
      }

      busyRef.current = true
      try {
        const result = await postSharedAction({
          action: 'merge',
          counters: local,
        })
        if (!cancelled) {
          setCounters(result.counters)
          setStatus('live')
        }
        markLegacyMigrationDone()
      } catch {
        // Se reintentará en la próxima visita si falla.
        migrationTried.current = false
      } finally {
        busyRef.current = false
      }
    }

    void boot()
    const timer = window.setInterval(() => {
      if (!busyRef.current) void refresh()
    }, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [refresh])

  async function runMutation(
    optimistic: (prev: Counter[]) => Counter[],
    request: () => Promise<{ counters: Counter[]; ok: boolean }>,
  ): Promise<boolean> {
    busyRef.current = true
    setCounters(optimistic)
    try {
      const result = await request()
      setCounters(result.counters)
      setStatus('live')
      return result.ok
    } catch {
      await refresh()
      return false
    } finally {
      busyRef.current = false
    }
  }

  function increment(id: string) {
    void runMutation(
      (prev) =>
        prev.map((c) => (c.id === id ? { ...c, count: c.count + 1 } : c)),
      () => postSharedAction({ action: 'increment', id }),
    )
  }

  function reset(id: string) {
    void runMutation(
      (prev) => prev.map((c) => (c.id === id ? { ...c, count: 0 } : c)),
      () => postSharedAction({ action: 'reset', id }),
    )
  }

  function remove(id: string) {
    void runMutation(
      (prev) => prev.filter((c) => c.id !== id),
      () => postSharedAction({ action: 'remove', id }),
    )
  }

  async function add(phrase: string): Promise<boolean> {
    const trimmed = phrase.trim().replace(/\s+/g, ' ')
    if (!trimmed) return false

    const exists = counters.some(
      (c) => c.phrase.toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) return false

    const tempId = `temp-${Date.now()}`
    return runMutation(
      (prev) => [
        ...prev,
        {
          id: tempId,
          phrase: trimmed,
          count: 0,
          createdAt: Date.now(),
        },
      ],
      () => postSharedAction({ action: 'add', phrase: trimmed }),
    )
  }

  return { counters, status, increment, reset, remove, add, refresh }
}
