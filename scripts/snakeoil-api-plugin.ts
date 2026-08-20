import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { evaluateSnakeOilPitch } from '../api/_lib/snakeoilScore.js'

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

/** Sirve /api/snakeoil en vite (solo puntuación; Whisper es local). */
export function snakeoilApiPlugin(): Plugin {
  return {
    name: 'snakeoil-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/snakeoil') {
          next()
          return
        }

        try {
          if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST')
            sendJson(res, 405, { ok: false, error: 'Método no permitido' })
            return
          }

          const body = (await readBody(req)) as Record<string, unknown>
          const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
          const customer = typeof body.customer === 'string' ? body.customer : ''
          const product = typeof body.product === 'string' ? body.product : ''
          const durationSec =
            typeof body.durationSec === 'number'
              ? body.durationSec
              : Number(body.durationSec) || 30

          const result = await evaluateSnakeOilPitch({
            transcript,
            customer,
            product,
            durationSec,
          })
          sendJson(res, 200, { ok: true, transcript, ...result })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error del servidor'
          console.error('[snakeoil vite api]', error)
          const status =
            message.includes('Falta') ||
            message.includes('vacía') ||
            message.includes('vacío') ||
            message.includes('corta') ||
            message.includes('cliente') ||
            message.includes('producto')
              ? 400
              : 500
          sendJson(res, status, { ok: false, error: message })
        }
      })
    },
  }
}
