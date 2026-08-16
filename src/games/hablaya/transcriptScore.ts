/**
 * Métricas ligeras para comparar transcripciones de Habla ya.
 */

export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/a\s*[-.]?\s*3\s*[-.]?\s*20/g, 'a320')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function transcriptTokens(text: string): string[] {
  return normalizeTranscript(text).split(' ').filter(Boolean);
}

/** Recall de tokens únicos del esperado que aparecen en la hipótesis. */
export function tokenRecall(expected: string, hypothesis: string): number {
  const exp = [...new Set(transcriptTokens(expected))];
  if (exp.length === 0) return 1;
  const got = new Set(transcriptTokens(hypothesis));
  const hits = exp.filter((t) => got.has(t));
  return hits.length / exp.length;
}

export function missingTokens(expected: string, hypothesis: string): string[] {
  const exp = [...new Set(transcriptTokens(expected))];
  const got = new Set(transcriptTokens(hypothesis));
  return exp.filter((t) => !got.has(t));
}

export function hasAllMustHave(hypothesis: string, mustHave: string[]): boolean {
  const got = transcriptTokens(hypothesis);
  return mustHave.every((raw) => {
    const needle = normalizeTranscript(raw);
    return got.some(
      (token) =>
        token === needle ||
        token === `${needle}s` ||
        token === `${needle}es` ||
        (needle.endsWith('s') && token === needle.slice(0, -1)),
    );
  });
}

export function countNiceToHave(hypothesis: string, niceToHave: string[]): number {
  const got = new Set(transcriptTokens(hypothesis));
  return niceToHave.filter((w) => got.has(normalizeTranscript(w))).length;
}
