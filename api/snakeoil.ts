import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  evaluateSnakeOilRound,
  generateSnakeOilObjection,
  type CustomerProfileInput,
  type ConversationTurnInput,
  type Difficulty,
} from './_lib/snakeoilScore.js'

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
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

/** POST /api/snakeoil — actions: objection | evaluate */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return sendJson(res, 405, { ok: false, error: 'Método no permitido' })
    }

    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as Record<string, unknown>)
        : ((req.body ?? {}) as Record<string, unknown>)

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
      return sendJson(res, 200, { ok: true, objection: result.objection, kind: result.kind })
    }

    const conversation = asConversation(body)
    const evaluation = await evaluateSnakeOilRound({
      customer,
      words,
      productName,
      conversation,
      pitchTranscript,
      objection: asString(body.objection),
      replyTranscript: asString(body.replyTranscript),
      pitchSeconds: asNumber(body.pitchSeconds ?? body.durationSec, 45),
      replySeconds: asNumber(body.replySeconds, 20),
      difficulty,
      format: asString(body.format) || 'full',
      eventTitle: asString(body.eventTitle) || undefined,
    })

    return sendJson(res, 200, { ok: true, evaluation })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[snakeoil api]', error)
    const status =
      message.includes('Falta') ||
      message.includes('vacía') ||
      message.includes('vacío') ||
      message.includes('corta') ||
      message.includes('producto') ||
      message.includes('Pitch')
        ? 400
        : 500
    return sendJson(res, status, { ok: false, error: message })
  }
}
