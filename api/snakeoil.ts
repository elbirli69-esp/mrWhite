import type { VercelRequest, VercelResponse } from '@vercel/node'
import { evaluateSnakeOilPitch } from './_lib/snakeoilScore.js'

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
}

/** Puntuación DeepSeek del pitch; Whisper es local en el cliente. */
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

    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
    const customer = typeof body.customer === 'string' ? body.customer : ''
    const product = typeof body.product === 'string' ? body.product : ''
    const durationSec =
      typeof body.durationSec === 'number' ? body.durationSec : Number(body.durationSec) || 30

    const result = await evaluateSnakeOilPitch({
      transcript,
      customer,
      product,
      durationSec,
    })

    return sendJson(res, 200, { ok: true, transcript, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[snakeoil api]', error)
    const status =
      message.includes('Falta') ||
      message.includes('vacía') ||
      message.includes('vacío') ||
      message.includes('corta') ||
      message.includes('cliente') ||
      message.includes('producto')
        ? 400
        : 500
    return sendJson(res, status, { ok: false, error: message })
  }
}
