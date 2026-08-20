/**
 * Normalización ASR controlada para Snake Oil.
 * Solo corrige errores evidentes hacia palabras/producto conocidos.
 * No reescribe el discurso ni inventa argumentos.
 */

export type NormalizeHit = {
  from: string;
  to: string;
  reason: 'lexicon' | 'product';
};

export type NormalizeResult = {
  raw: string;
  normalized: string;
  hits: NormalizeHit[];
};

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemLoose(s: string): string {
  const f = fold(s);
  if (f.endsWith('es') && f.length > 4) return f.slice(0, -2);
  if (f.endsWith('s') && f.length > 3) return f.slice(0, -1);
  return f;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) row[j] = j;
  for (let i = 1; i <= m; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n]!;
}

function closeEnough(token: string, target: string): boolean {
  const t = fold(token);
  const g = fold(target);
  if (!t || !g) return false;
  if (t === g) return true;
  if (stemLoose(t) === stemLoose(g)) return true;
  // Prefijo fuerte (dino / dinosaurio) solo si el token es truncación plausible
  if (g.length >= 6 && t.length >= 4 && g.startsWith(t) && g.length - t.length <= 4) return true;
  if (t.length >= 4 && g.length >= 4) {
    const maxDist = Math.max(t.length, g.length) <= 6 ? 1 : 2;
    if (Math.abs(t.length - g.length) <= 2 && editDistance(t, g) <= maxDist) return true;
  }
  return false;
}

/**
 * Sustituye tokens ASR por formas canónicas del léxico del juego
 * únicamente cuando la coincidencia es muy probable.
 */
export function normalizeGameTranscript(
  raw: string,
  lexicon: string[],
  productName?: string,
): NormalizeResult {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return { raw, normalized: '', hits: [] };

  const targets = [
    ...lexicon.map((w) => ({ word: w.trim(), reason: 'lexicon' as const })),
    ...(productName?.trim()
      ? productName
          .split(/[\s\-_/]+/)
          .filter((p) => p.length >= 4)
          .map((word) => ({ word, reason: 'product' as const }))
      : []),
  ].filter((t) => t.word.length >= 3);

  if (!targets.length) return { raw, normalized: text, hits: [] };

  const hits: NormalizeHit[] = [];
  const parts = text.split(/(\s+)/);
  const out = parts.map((part) => {
    if (/^\s+$/.test(part) || !part) return part;
    const bare = part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (bare.length < 3) return part;
    for (const target of targets) {
      if (closeEnough(bare, target.word) && fold(bare) !== fold(target.word)) {
        // Conservar mayúscula inicial si la había
        const replacement =
          bare[0] && bare[0] === bare[0].toUpperCase()
            ? target.word.charAt(0).toUpperCase() + target.word.slice(1)
            : target.word;
        hits.push({ from: bare, to: target.word, reason: target.reason });
        return part.replace(bare, replacement);
      }
    }
    return part;
  });

  return { raw, normalized: out.join(''), hits };
}
