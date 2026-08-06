import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  addCounter,
  incrementCounter,
  listCounters,
  mergeCounters,
  removeCounter,
  resetCounter,
} from './_lib/staycalmStore.js'

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const counters = await listCounters()
      return sendJson(res, 200, { counters })
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string'
          ? (JSON.parse(req.body) as Record<string, unknown>)
          : ((req.body ?? {}) as Record<string, unknown>)

      const action = body.action
      if (action === 'increment' && typeof body.id === 'string') {
        const counters = await incrementCounter(body.id)
        return sendJson(res, 200, { counters })
      }
      if (action === 'reset' && typeof body.id === 'string') {
        const counters = await resetCounter(body.id)
        return sendJson(res, 200, { counters })
      }
      if (action === 'remove' && typeof body.id === 'string') {
        const counters = await removeCounter(body.id)
        return sendJson(res, 200, { counters })
      }
      if (action === 'add' && typeof body.phrase === 'string') {
        const result = await addCounter(body.phrase)
        return sendJson(res, result.ok ? 200 : 409, {
          counters: result.counters,
          ok: result.ok,
          error: result.error,
        })
      }
      if (action === 'merge' && Array.isArray(body.counters)) {
        const result = await mergeCounters(body.counters)
        return sendJson(res, 200, {
          counters: result.counters,
          ok: true,
          added: result.added,
          updated: result.updated,
        })
      }

      return sendJson(res, 400, { error: 'Acción no válida' })
    }

    res.setHeader('Allow', 'GET, POST')
    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('[staycalm api]', error)
    return sendJson(res, 500, { error: 'Error del servidor' })
  }
}
