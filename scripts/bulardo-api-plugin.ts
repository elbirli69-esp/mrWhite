import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
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
} from '../api/_lib/bulardoGenerate.js'
import {
  checkBulardoRateLimit,
  getClientIp,
} from '../api/_lib/bulardoRateLimit.js'

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

function extractQuestion(body: Record<string, unknown>): string {
  if (typeof body.question === 'string') return body.question
  if (typeof body.prompt === 'string') return body.prompt
  if (typeof body.brief === 'string') return body.brief
  return ''
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
  res: ServerResponse,
  upstream: Response,
  mode: BulardoMode,
) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Connection', 'keep-alive')

  const reader = upstream.body?.getReader()
  if (!reader) {
    res.end(`event: error\ndata: ${JSON.stringify({ error: 'Stream vacío' })}\n\n`)
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
        // ignore
      }
    }
  }

  const article = parseArticle(accumulated, mode)
  res.write(`event: article\ndata: ${JSON.stringify({ article, mode })}\n\n`)
  res.write('event: done\ndata: {}\n\n')
  res.end()
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

          const ip = getClientIp(
            req.headers as Record<string, string | string[] | undefined>,
          )
          const limit = checkBulardoRateLimit(ip)
          if (!limit.ok) {
            res.setHeader('Retry-After', String(limit.retryAfterSec ?? 60))
            sendJson(res, 429, {
              ok: false,
              error: 'Límite de uso, prueba en unos minutos',
            })
            return
          }

          const body = (await readBody(req)) as Record<string, unknown>
          const question = extractQuestion(body)
          const requestedMode = resolveBulardoMode(
            body.mode ?? body.credible ?? body.scientific,
          )
          const action = resolveBulardoAction(body.action) as BulardoAction
          let mode = requestedMode
          if (action === 'moreAbsurd' || action === 'moreSober') {
            mode = shiftMode(requestedMode, action)
          }

          const accept = req.headers.accept || ''
          const stream =
            body.stream === true ||
            body.stream === 'true' ||
            String(accept).includes('text/event-stream')

          if (stream) {
            try {
              const upstream = await openBulardoDeepSeekStream(
                question,
                requestedMode,
                action,
              )
              await writeSseProxy(res, upstream, mode)
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Error del servidor'
              if (message === 'NO_STREAM_MOCK') {
                const article = mockArticleForMode(question, mode)
                res.statusCode = 200
                res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
                for (const ch of article.raw) {
                  res.write(
                    `event: token\ndata: ${JSON.stringify({ token: ch })}\n\n`,
                  )
                }
                res.write(
                  `event: article\ndata: ${JSON.stringify({ article, mode })}\n\n`,
                )
                res.write('event: done\ndata: {}\n\n')
                res.end()
                return
              }
              sendJson(res, statusForError(message), { ok: false, error: message })
            }
            return
          }

          const article = await generateBulardoArticle(question, {
            mode: requestedMode,
            action,
          })
          sendJson(res, 200, { ok: true, article, mode: article.mode })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Error del servidor'
          console.error('[bulardo vite api]', error)
          sendJson(res, statusForError(message), { ok: false, error: message })
        }
      })
    },
  }
}
