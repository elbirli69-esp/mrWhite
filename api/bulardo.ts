import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  generateBulardoArticle,
  mockArticleForMode,
  openBulardoDeepSeekStream,
  parseArticle,
  resolveBulardoAction,
  resolveBulardoMode,
  shiftMode,
  type BulardoAction,
  type BulardoMode,
} from './_lib/bulardoGenerate.js'
import {
  checkBulardoRateLimit,
  getClientIp,
} from './_lib/bulardoRateLimit.js'

function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(body)
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === 'string'
    ? (JSON.parse(req.body) as Record<string, unknown>)
    : ((req.body ?? {}) as Record<string, unknown>)
}

function extractQuestion(body: Record<string, unknown>): string {
  if (typeof body.question === 'string') return body.question
  if (typeof body.prompt === 'string') return body.prompt
  if (typeof body.brief === 'string') return body.brief
  return ''
}

function wantsStream(req: VercelRequest, body: Record<string, unknown>): boolean {
  if (body.stream === true || body.stream === 'true') return true
  const accept = req.headers.accept || ''
  return String(accept).includes('text/event-stream')
}

function statusForError(message: string): number {
  if (message.includes('vacío') || message.includes('vacía') || message.includes('largo')) {
    return 400
  }
  if (message.includes('Límite de uso') || message.includes('saturado')) {
    return 429
  }
  return 500
}

async function writeSseProxy(
  res: VercelResponse,
  upstream: Response,
  mode: BulardoMode,
) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Connection', 'keep-alive')
  res.status(200)

  const reader = upstream.body?.getReader()
  if (!reader) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Stream vacío' })}\n\n`)
    res.end()
    return
  }

  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const token = json.choices?.[0]?.delta?.content || ''
        if (token) {
          accumulated += token
          res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`)
        }
      } catch {
        // ignore partial JSON
      }
    }
  }

  const article = parseArticle(accumulated, mode)
  res.write(`event: article\ndata: ${JSON.stringify({ article, mode })}\n\n`)
  res.write('event: done\ndata: {}\n\n')
  res.end()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return sendJson(res, 405, { error: 'Método no permitido' })
    }

    const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>)
    const limit = checkBulardoRateLimit(ip)
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfterSec ?? 60))
      return sendJson(res, 429, {
        ok: false,
        error: 'Límite de uso, prueba en unos minutos',
      })
    }

    const body = parseBody(req)
    const question = extractQuestion(body)
    const requestedMode = resolveBulardoMode(
      body.mode ?? body.credible ?? body.scientific,
    )
    const action = resolveBulardoAction(body.action) as BulardoAction
    let mode = requestedMode
    if (action === 'moreAbsurd' || action === 'moreSober') {
      mode = shiftMode(requestedMode, action)
    }

    if (wantsStream(req, body)) {
      try {
        const upstream = await openBulardoDeepSeekStream(question, requestedMode, action)
        return await writeSseProxy(res, upstream, mode)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error del servidor'
        if (message === 'NO_STREAM_MOCK') {
          const article = mockArticleForMode(question, mode)
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.status(200)
          for (const ch of article.raw) {
            res.write(`event: token\ndata: ${JSON.stringify({ token: ch })}\n\n`)
          }
          res.write(`event: article\ndata: ${JSON.stringify({ article, mode })}\n\n`)
          res.write('event: done\ndata: {}\n\n')
          res.end()
          return
        }
        return sendJson(res, statusForError(message), { ok: false, error: message })
      }
    }

    const article = await generateBulardoArticle(question, {
      mode: requestedMode,
      action,
    })
    return sendJson(res, 200, { ok: true, article, mode: article.mode })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error del servidor'
    console.error('[bulardo api]', error)
    return sendJson(res, statusForError(message), { ok: false, error: message })
  }
}
