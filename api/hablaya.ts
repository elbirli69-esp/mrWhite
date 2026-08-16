import type { VercelRequest, VercelResponse } from '@vercel/node'
import { evaluateHablaYaSpeech, type TopicMode } from './_lib/hablayaScore.js'
import { decodeAudioBase64, transcribeWithWhisper } from './_lib/hablayaWhisper.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
}

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

    const category = typeof body.category === 'string' ? body.category : ''
    const topicMode = (body.topicMode === 'invented' ? 'invented' : 'serious') as TopicMode
    const durationSec =
      typeof body.durationSec === 'number' ? body.durationSec : Number(body.durationSec) || 45

    let transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''

    // Preferir audio → Whisper cuando viene el fichero
    const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : ''
    if (audioBase64) {
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'audio/webm'
      const audio = decodeAudioBase64(audioBase64)
      transcript = await transcribeWithWhisper({ audio, mimeType, category })
    }

    const result = await evaluateHablaYaSpeech({
      transcript,
      category,
      topicMode,
      durationSec,
    })

    return sendJson(res, 200, { ok: true, transcript, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[hablaya api]', error)
    const status =
      message.includes('Falta') ||
      message.includes('vacía') ||
      message.includes('vacío') ||
      message.includes('categoría') ||
      message.includes('corta') ||
      message.includes('Audio') ||
      message.includes('grande')
        ? 400
        : 500
    return sendJson(res, status, { ok: false, error: message })
  }
}
