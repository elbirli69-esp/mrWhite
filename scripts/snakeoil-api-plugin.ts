import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  evaluateSnakeOilRound,
  generateSnakeOilObjection,
  type CustomerProfileInput,
  type ConversationTurnInput,
  type Difficulty,
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

function asDifficulty(value: unknown): Difficulty {
  if (value === 'easy' || value === 'hard' || value === 'normal') return value
  return 'normal'
}

function asCustomer(body: Record<string, unknown>): CustomerProfileInput {
  const nested = (body.customer && typeof body.customer === 'object'
    ? (body.customer as Record<string, unknown>)
    : null)
  const name =
    asString(nested?.name) ||
    asString(body.customerTitle) ||
    asString(body.customer) ||
    'Cliente'
  return {
    name,
    description: asString(nested?.description) || asString(body.customerDescription) || name,
    personality: asString(nested?.personality) || asString(body.customerPersonality) || 'Escéptico',
    need:
      asString(nested?.need) ||
      asString(body.customerNeed) ||
      asString(body.customer) ||
      name,
    secretConcern: asString(nested?.secretConcern) || asString(body.secretConcern) || '',
    patience: asNumber(nested?.patience ?? body.patience, 50),
    skepticism: asNumber(nested?.skepticism ?? body.skepticism, 50),
    humor: asNumber(nested?.humor ?? body.humor, 50),
  }
}

function asConversation(body: Record<string, unknown>): ConversationTurnInput[] {
  if (Array.isArray(body.conversation)) {
    return body.conversation
      .map((t) => {
        if (!t || typeof t !== 'object') return null
        const row = t as Record<string, unknown>
        const role = asString(row.role)
        const text = asString(row.text)
        if (!role || !text) return null
        return { role, text }
      })
      .filter((t): t is ConversationTurnInput => !!t)
  }
  return []
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
          const customer = asCustomer(body)
          const productName = asString(body.productName) || asString(body.product)
          const words = asStringArray(body.words)
          const pitchTranscript = asString(body.pitchTranscript) || asString(body.transcript)
          const difficulty = asDifficulty(body.difficulty)

          if (action === 'objection') {
            const turn = asNumber(body.turn, 1) === 2 ? 2 : 1
            const result = await generateSnakeOilObjection({
              customer,
              words,
              productName,
              pitchTranscript,
              difficulty,
              objectionKindHint: asString(body.objectionKindHint) || undefined,
              turn,
              previousObjection: asString(body.previousObjection) || undefined,
              previousReply: asString(body.previousReply) || undefined,
            })
            sendJson(res, 200, { ok: true, objection: result.objection, kind: result.kind })
            return
          }

          const evaluation = await evaluateSnakeOilRound({
            customer,
            words,
            productName,
            conversation: asConversation(body),
            pitchTranscript,
            objection: asString(body.objection),
            replyTranscript: asString(body.replyTranscript),
            pitchSeconds: asNumber(body.pitchSeconds ?? body.durationSec, 45),
            replySeconds: asNumber(body.replySeconds, 20),
            difficulty,
            format: asString(body.format) || 'full',
            eventTitle: asString(body.eventTitle) || undefined,
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
