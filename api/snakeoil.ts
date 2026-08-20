import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  evaluateSnakeOilRound,
  generateSnakeOilObjection,
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
      return sendJson(res, 200, { ok: true, objection })
    }

    const objection = asString(body.objection)
    const replyTranscript = asString(body.replyTranscript)
    const evaluation = await evaluateSnakeOilRound({
      customerTitle,
      customerNeed,
      words,
      productName,
      pitchTranscript,
      objection,
      replyTranscript,
      pitchSeconds: asNumber(body.pitchSeconds ?? body.durationSec, 45),
      replySeconds: asNumber(body.replySeconds, 20),
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
