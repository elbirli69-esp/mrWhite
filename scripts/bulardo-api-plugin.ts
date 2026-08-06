import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { generateBulardoArticle } from '../api/_lib/bulardoGenerate.js'

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

/** Sirve /api/bulardo en vite. */
export function bulardoApiPlugin(): Plugin {
  return {
    name: 'bulardo-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/bulardo') {
          next()
          return
        }

        try {
          if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST')
            sendJson(res, 405, { error: 'Método no permitido' })
            return
          }

          const body = (await readBody(req)) as Record<string, unknown>
          const question = typeof body.question === 'string' ? body.question : ''
          const article = await generateBulardoArticle(question)
          sendJson(res, 200, { ok: true, article })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Error del servidor'
          console.error('[bulardo vite api]', error)
          const status =
            message.includes('vacía') || message.includes('larga') ? 400 : 500
          sendJson(res, status, { ok: false, error: message })
        }
      })
    },
  }
}
