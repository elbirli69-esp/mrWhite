import type { Counter } from '../types'

type CountersResponse = {
  counters: Counter[]
  ok?: boolean
  error?: string
}

async function readResponse(res: Response): Promise<CountersResponse> {
  if (!res.ok && res.status !== 409) {
    throw new Error(`HTTP ${res.status}`)
  }
  const data = (await res.json()) as CountersResponse
  if (!Array.isArray(data.counters)) {
    throw new Error('Respuesta inválida')
  }
  return data
}

export async function fetchSharedCounters(): Promise<Counter[]> {
  const res = await fetch('/api/staycalm', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  const data = await readResponse(res)
  return data.counters
}

export async function postSharedAction(
  body:
    | { action: 'increment'; id: string }
    | { action: 'reset'; id: string }
    | { action: 'remove'; id: string }
    | { action: 'add'; phrase: string },
): Promise<{ counters: Counter[]; ok: boolean; error?: string }> {
  const res = await fetch('/api/staycalm', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await readResponse(res)
  if (body.action === 'add') {
    return {
      counters: data.counters,
      ok: data.ok !== false && res.status === 200,
      error: data.error,
    }
  }
  return { counters: data.counters, ok: true }
}
