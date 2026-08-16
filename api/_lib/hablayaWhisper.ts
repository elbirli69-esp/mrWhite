/** Transcripción de audio con OpenAI Whisper. */

const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions'

const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/webm;codecs=opus': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/ogg;codecs=opus': 'ogg',
  'audio/m4a': 'm4a',
}

export function extensionForMime(mimeType: string): string {
  const key = mimeType.trim().toLowerCase()
  if (EXT_BY_MIME[key]) return EXT_BY_MIME[key]!
  if (key.includes('webm')) return 'webm'
  if (key.includes('mp4') || key.includes('m4a')) return 'mp4'
  if (key.includes('ogg')) return 'ogg'
  if (key.includes('wav')) return 'wav'
  if (key.includes('mpeg') || key.includes('mp3')) return 'mp3'
  return 'webm'
}

function mockTranscript(category: string): string {
  return `Demo local sin OPENAI_API_KEY. El jugador ha hablado sobre «${category}» durante el turno, con varias ideas encadenadas y un cierre improvisado.`
}

/**
 * Transcribe audio (Buffer) a texto en castellano con Whisper.
 */
export async function transcribeWithWhisper(input: {
  audio: Buffer
  mimeType: string
  category?: string
}): Promise<string> {
  if (!input.audio.length) {
    throw new Error('Audio vacío')
  }
  // ~4 MB raw ≈ seguro bajo el límite de body de Vercel
  if (input.audio.length > 4_000_000) {
    throw new Error('Audio demasiado grande (máx. ~4 MB)')
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    if (process.env.VERCEL) {
      throw new Error('Falta OPENAI_API_KEY (Whisper)')
    }
    return mockTranscript(input.category?.trim() || 'la categoría')
  }

  const ext = extensionForMime(input.mimeType || 'audio/webm')
  const filename = `hablaya.${ext}`
  const type = (input.mimeType || 'audio/webm').split(';')[0] || 'audio/webm'

  const form = new FormData()
  const blob = new Blob([new Uint8Array(input.audio)], { type })
  form.append('file', blob, filename)
  form.append('model', 'whisper-1')
  form.append('language', 'es')
  form.append('response_format', 'json')

  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[hablaya whisper]', response.status, detail.slice(0, 400))
    throw new Error('No se pudo transcribir el audio con Whisper')
  }

  const data = (await response.json()) as { text?: string }
  const text = data.text?.trim()
  if (!text) {
    throw new Error('Whisper no devolvió texto (¿silencio?)')
  }
  return text
}

export function decodeAudioBase64(audioBase64: string): Buffer {
  const cleaned = audioBase64.replace(/^data:[^;]+;base64,/, '').trim()
  if (!cleaned) throw new Error('Audio vacío')
  return Buffer.from(cleaned, 'base64')
}
