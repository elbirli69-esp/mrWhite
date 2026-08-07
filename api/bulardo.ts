import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  generateBulardoArticle,
  resolveBulardoMode,
} from './_lib/bulardoGenerate.js'

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return sendJson(res, 405, { error: 'Método no permitido' })
    }

    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as Record<string, unknown>)
        : ((req.body ?? {}) as Record<string, unknown>)

    const question =
      typeof body.question === 'string'
        ? body.question
        : typeof body.prompt === 'string'
          ? body.prompt
          : typeof body.brief === 'string'
            ? body.brief
            : ''
    const mode = resolveBulardoMode(
      body.credible ?? body.mode ?? body.scientific,
    )
    const article = await generateBulardoArticle(question, mode)
    return sendJson(res, 200, { ok: true, article, mode })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error del servidor'
    console.error('[bulardo api]', error)
    const status =
      message.includes('vacío') ||
      message.includes('vacía') ||
      message.includes('largo') ||
      message.includes('larga')
        ? 400
        : 500
    return sendJson(res, status, { ok: false, error: message })
  }
}
