import { ADULT_WORD_PAIRS } from './adultWords';
import type { WordPair } from './words';
import { WORD_PAIRS } from './words';

const ABSTRACT_NORMALS = new Set(
  [
    'Éxito',
    'Fracaso',
    'Suerte',
    'Destino',
    'Sueño',
    'Ensueño',
    'Miedo',
    'Amor',
    'Esperanza',
    'Paz',
    'Caos',
    'Ilusión',
    'Recuerdo',
    'Idea',
    'Secreto',
    'Libertad',
    'Justicia',
    'Verdad',
    'Mentira',
    'Nostalgia',
    'Futuro',
    'Tiempo',
    'Espacio',
    'Energía',
    'Orden',
    'Silencio',
    'Ruido',
    'Estrés',
    'Ansiedad',
    'Felicidad',
    'Tristeza',
  ].map((w) => norm(w)),
);

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñü\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordPairsForMode(adultMode: boolean): readonly WordPair[] {
  return adultMode ? ADULT_WORD_PAIRS : WORD_PAIRS;
}

export function isAbstractWord(word: string): boolean {
  return ABSTRACT_NORMALS.has(norm(word));
}

export function filterWordPairs(
  pairs: readonly WordPair[],
  options: {
    maxNormalLength?: number;
    excludeAbstract?: boolean;
    drawableOnly?: boolean;
    drawableMaxLength?: number;
  },
): WordPair[] {
  const maxLen = options.drawableOnly
    ? (options.drawableMaxLength ?? 14)
    : options.maxNormalLength;
  return pairs.filter(([normal]) => {
    if (maxLen !== undefined && normal.length > maxLen) return false;
    if (options.excludeAbstract && isAbstractWord(normal)) return false;
    if (options.drawableOnly && isAbstractWord(normal)) return false;
    return true;
  });
}

/** En la frente: palabras cortas y concretas. */
export function normalWordsForHeadsUp(adultMode: boolean): string[] {
  return filterWordPairs(wordPairsForMode(adultMode), {
    maxNormalLength: adultMode ? 20 : 12,
    excludeAbstract: !adultMode,
  }).map(([word]) => word);
}

/** Sin repetir: mismas reglas que En la frente. */
export function normalWordsForJustOne(adultMode: boolean): string[] {
  return normalWordsForHeadsUp(adultMode);
}

/** Todos igual: sin conceptos abstractos en modo familiar. */
export function normalWordsForUnanimo(adultMode: boolean): string[] {
  return filterWordPairs(wordPairsForMode(adultMode), {
    excludeAbstract: !adultMode,
  }).map(([word]) => word);
}

/** Trazo falso: dibujable en ~30 s. */
export function pairsForFakeArtist(adultMode: boolean): WordPair[] {
  return filterWordPairs(wordPairsForMode(adultMode), {
    drawableOnly: true,
    drawableMaxLength: adultMode ? 20 : 14,
  });
}

/** Pista y número: tablero legible. */
export function wordsForCodigoSecreto(adultMode: boolean): string[] {
  const pairs = filterWordPairs(wordPairsForMode(adultMode), { maxNormalLength: 16 });
  const seen = new Set<string>();
  const words: string[] = [];
  for (const [normal, farsante] of pairs) {
    for (const word of [normal, farsante]) {
      if (word.length > 16) continue;
      const key = norm(word);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      words.push(word);
    }
  }
  return words;
}
