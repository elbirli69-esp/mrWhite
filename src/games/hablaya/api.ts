export type HablaYaScoreResult = {
  ok: boolean;
  score?: number;
  feedback?: string;
  error?: string;
};

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
