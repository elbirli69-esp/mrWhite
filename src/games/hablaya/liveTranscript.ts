/** Une segmentos de Whisper con solape para no duplicar el final de cada ventana. */
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
  const max = Math.min(prevWords.length, nextWords.length, 14);
  for (let n = max; n >= 2; n -= 1) {
    const suffix = prevWords.slice(-n).join(' ').toLowerCase();
    const prefix = nextWords.slice(0, n).join(' ').toLowerCase();
    if (suffix === prefix) {
      return [...prevWords, ...nextWords.slice(n)].join(' ');
    }
  }
  if (prevWords[prevWords.length - 1]!.toLowerCase() === nextWords[0]!.toLowerCase()) {
    return [...prevWords, ...nextWords.slice(1)].join(' ');
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
