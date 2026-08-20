/** Une segmentos de Whisper con solape para no duplicar el final de cada ventana. */

function foldToken(token: string): string {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñ]/g, '');
}

/** Igualdad laxa: plurales / formas cercanas (calcetín ≈ calcetines). */
export function tokensLooselyEqual(a: string, b: string): boolean {
  const x = foldToken(a);
  const y = foldToken(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x === `${y}s` || y === `${x}s`) return true;
  if (x === `${y}es` || y === `${x}es`) return true;
  if (x.endsWith('es') && x.slice(0, -2) === y) return true;
  if (y.endsWith('es') && y.slice(0, -2) === x) return true;
  // Distancia muy corta en tokens ≥5 (errores ASR leves)
  if (x.length >= 5 && y.length >= 5 && Math.abs(x.length - y.length) <= 1) {
    let diffs = 0;
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i += 1) {
      if (x[i] !== y[i]) diffs += 1;
      if (diffs > 1) return false;
    }
    return diffs <= 1;
  }
  return false;
}

function overlapWordCount(prevWords: string[], nextWords: string[]): number {
  const max = Math.min(prevWords.length, nextWords.length, 14);
  for (let n = max; n >= 2; n -= 1) {
    let ok = true;
    for (let i = 0; i < n; i += 1) {
      if (!tokensLooselyEqual(prevWords[prevWords.length - n + i]!, nextWords[i]!)) {
        ok = false;
        break;
      }
    }
    if (ok) return n;
  }
  if (prevWords.length && nextWords.length && tokensLooselyEqual(prevWords.at(-1)!, nextWords[0]!)) {
    return 1;
  }
  return 0;
}

export function stitchTranscript(previous: string, incoming: string): string {
  const prev = previous.trim().replace(/\s+/g, ' ');
  const next = incoming.trim().replace(/\s+/g, ' ');
  if (!prev) return next;
  if (!next) return prev;

  const prevNorm = prev.toLowerCase();
  const nextNorm = next.toLowerCase();
  if (nextNorm.startsWith(prevNorm) && next.length >= prev.length) return next;
  if (prevNorm.endsWith(nextNorm) && next.length >= 12) return prev;

  const prevWords = prev.split(' ');
  const nextWords = next.split(' ');
  const n = overlapWordCount(prevWords, nextWords);
  if (n > 0) {
    return [...prevWords, ...nextWords.slice(n)].join(' ');
  }
  return `${prev} ${next}`;
}

export function concatFloat32(a: Float32Array, b: Float32Array): Float32Array {
  const out: Float32Array = new Float32Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function copyFloat32(input: ArrayLike<number>): Float32Array {
  return Float32Array.from(input);
}
