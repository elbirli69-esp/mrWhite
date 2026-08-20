import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  evaluateSnakeOilRound,
  generateSnakeOilObjection,
} from '../api/_lib/snakeoilScore.js'

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

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Sirve /api/snakeoil en vite. */
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
          const action = asString(body.action) || 'evaluate'
          const customerTitle = asString(body.customerTitle) || asString(body.customer)
          const customerNeed = asString(body.customerNeed) || customerTitle
          const productName = asString(body.productName) || asString(body.product)
          const words = asStringArray(body.words)
          const pitchTranscript = asString(body.pitchTranscript) || asString(body.transcript)

          if (action === 'objection') {
            const objection = await generateSnakeOilObjection({
              customerTitle,
              customerNeed,
              words,
              productName,
              pitchTranscript,
            })
            sendJson(res, 200, { ok: true, objection })
            return
          }

          const evaluation = await evaluateSnakeOilRound({
            customerTitle,
            customerNeed,
            words,
            productName,
            pitchTranscript,
            objection: asString(body.objection),
            replyTranscript: asString(body.replyTranscript),
            pitchSeconds: asNumber(body.pitchSeconds ?? body.durationSec, 45),
            replySeconds: asNumber(body.replySeconds, 20),
          })
          sendJson(res, 200, { ok: true, evaluation })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error del servidor'
          console.error('[snakeoil vite api]', error)
          const status =
            message.includes('Falta') ||
            message.includes('vacía') ||
            message.includes('vacío') ||
            message.includes('corta') ||
            message.includes('producto') ||
            message.includes('Pitch')
              ? 400
              : 500
          sendJson(res, status, { ok: false, error: message })
        }
      })
    },
  }
}
