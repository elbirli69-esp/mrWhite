export type HablaYaScoreResult = {
  ok: boolean;
  score?: number;
  feedback?: string;
  transcript?: string;
  error?: string;
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Sube el audio a Whisper + puntuación DeepSeek. */
export async function evaluateRecording(input: {
  blob: Blob;
  category: string;
  topicMode: 'serious' | 'invented';
  durationSec: number;
}): Promise<HablaYaScoreResult> {
  try {
    const audioBase64 = await blobToBase64(input.blob);
    const response = await fetch('/api/hablaya', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType: input.blob.type || 'audio/webm',
        category: input.category,
        topicMode: input.topicMode,
        durationSec: input.durationSec,
      }),
    });
    const data = (await response.json()) as HablaYaScoreResult;
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.error || 'No se pudo evaluar', transcript: data.transcript };
    }
    return data;
  } catch {
    return { ok: false, error: 'Sin conexión con el evaluador' };
  }
}

/** Re-puntuar solo con texto (tras editar la transcripción). */
export async function scoreSpeech(input: {
  transcript: string;
  category: string;
  topicMode: 'serious' | 'invented';
  durationSec: number;
}): Promise<HablaYaScoreResult> {
  try {
    const response = await fetch('/api/hablaya', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as HablaYaScoreResult;
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.error || 'No se pudo evaluar' };
    }
    return data;
  } catch {
    return { ok: false, error: 'Sin conexión con el evaluador' };
  }
}
