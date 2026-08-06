import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  addCounter,
  incrementCounter,
  listCounters,
  removeCounter,
  resetCounter,
} from '../api/_lib/staycalmStore.js'

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (chunks.length === 0) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw) as unknown
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

/**
 * Sirve /api/staycalm en `vite` (memoria local o Redis si hay env).
 */
export function stayCalmApiPlugin(): Plugin {
  return {
    name: 'staycalm-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/staycalm') {
          next()
          return
        }

        try {
          if (req.method === 'GET') {
            const counters = await listCounters()
            sendJson(res, 200, { counters })
            return
          }

          if (req.method === 'POST') {
            const body = (await readBody(req)) as Record<string, unknown>
            const action = body.action

            if (action === 'increment' && typeof body.id === 'string') {
              sendJson(res, 200, { counters: await incrementCounter(body.id) })
              return
            }
            if (action === 'reset' && typeof body.id === 'string') {
              sendJson(res, 200, { counters: await resetCounter(body.id) })
              return
            }
            if (action === 'remove' && typeof body.id === 'string') {
              sendJson(res, 200, { counters: await removeCounter(body.id) })
              return
            }
            if (action === 'add' && typeof body.phrase === 'string') {
              const result = await addCounter(body.phrase)
              sendJson(res, result.ok ? 200 : 409, {
                counters: result.counters,
                ok: result.ok,
                error: result.error,
              })
              return
            }

            sendJson(res, 400, { error: 'Acción no válida' })
            return
          }

          res.setHeader('Allow', 'GET, POST')
          sendJson(res, 405, { error: 'Método no permitido' })
        } catch (error) {
          console.error('[staycalm vite api]', error)
          sendJson(res, 500, { error: 'Error del servidor' })
        }
      })
    },
  }
}
