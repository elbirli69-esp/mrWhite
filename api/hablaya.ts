import type { VercelRequest, VercelResponse } from '@vercel/node'
import { evaluateHablaYaSpeech, type TopicMode } from './_lib/hablayaScore.js'

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
}

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

    const transcript = typeof body.transcript === 'string' ? body.transcript : ''
    const category = typeof body.category === 'string' ? body.category : ''
    const topicMode = (body.topicMode === 'invented' ? 'invented' : 'serious') as TopicMode
    const durationSec =
      typeof body.durationSec === 'number' ? body.durationSec : Number(body.durationSec) || 45

    const result = await evaluateHablaYaSpeech({
      transcript,
      category,
      topicMode,
      durationSec,
    })

    return sendJson(res, 200, { ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[hablaya api]', error)
    const status =
      message.includes('Falta') ||
      message.includes('vacía') ||
      message.includes('vacío') ||
      message.includes('categoría')
        ? 400
        : 500
    return sendJson(res, status, { ok: false, error: message })
  }
}
