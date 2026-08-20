/**
 * Fusiona lotes /tmp/improved-*.json sobre words.ts.
 * Valida cobertura, pistas demasiado genéricas y farsantes idénticos.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordsPath = join(__dirname, '../src/data/words.ts');

const source = readFileSync(wordsPath, 'utf8');
const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
const escape = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const original = [
  ...source.matchAll(
    /\['((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\]/g,
  ),
].map((m, i) => ({
  i,
  n: unescape(m[1]),
  f: unescape(m[2]),
  h: unescape(m[3]),
}));

if (original.length !== 1190) {
  console.error('Expected 1190 pairs, got', original.length);
  process.exit(1);
}

const improved = new Map();
const batchFiles = readdirSync('/tmp')
  .filter((f) => f.startsWith('improved-') && f.endsWith('.json'))
  .sort();

for (const file of batchFiles) {
  const rows = JSON.parse(readFileSync(join('/tmp', file), 'utf8'));
  if (!Array.isArray(rows)) {
    console.error(file, 'is not an array');
    process.exit(1);
  }
  for (const row of rows) {
    if (typeof row.i !== 'number' || !row.n || !row.f || !row.h) {
      console.error('Invalid row in', file, row);
      process.exit(1);
    }
    improved.set(row.i, { n: String(row.n), f: String(row.f), h: String(row.h) });
  }
  console.log(`Loaded ${rows.length} from ${file}`);
}

const GENERIC = new Set([
  'Para comer',
  'Digital',
  'Se mueve',
  'Competir',
  'Vestir',
  'Bricolaje',
  'Bolsillo',
  'Vacaciones',
  'Decorar',
  'Sabor',
  'Sitio',
  'Paisaje',
  'En el plato',
  'Se bebe',
  'Espectáculo',
  'Salir',
  'En casa',
  'Trabajo',
  'Cole',
  'Tu cuerpo',
  'Calendario',
  'Sentimiento',
  'Fantasía',
  'Jardín',
  'Cocina',
  'Estilo',
  'Oficio',
  'Exótico',
  'Salvaje',
  'Edificio',
  'Despensa',
  'Laboratorio',
  'Contrario',
  'Granja o bosque',
  'Selva o sabana',
  'Pequeño animal',
  'Huerta',
  'Condimento',
  'Rutina',
  'Forma',
  'Tono',
  'Melodía',
  'Organizar',
  'Auxilio',
  'Jugar',
  'Tema cercano',
  'Bicho',
  'Escamas',
  'Pico',
  'Océano',
  'Hogar',
  'Clima',
  'Comunicar',
  'Energía',
  'Oficina',
  'Espacio',
  'Aire libre',
  'Mapa',
  'Hobby',
  'Construcción',
  'Buenas maneras',
  'Electrodoméstico',
  'Calle',
  'Compañero',
  'Página',
  'Utensilio',
  'Terreno',
  'En línea',
  'Espejo',
  'Asfalto',
  'Entrenar',
  'Llevar encima',
  'Tronco',
  'Automóvil',
  'Crece',
  'Material',
  'Salud',
  'Infancia',
  'Cielo',
]);

const missing = [];
const sameWord = [];
const genericHints = [];
const hintContainsWord = [];
const nameMismatch = [];
const hintFreq = new Map();

const merged = original.map((row) => {
  const next = improved.get(row.i);
  if (!next) {
    missing.push(row.i);
    return row;
  }
  if (next.n !== row.n) nameMismatch.push(row.i);
  if (next.f.trim().toLowerCase() === next.n.trim().toLowerCase()) sameWord.push(row.i);
  if (GENERIC.has(next.h.trim())) genericHints.push(row.i);
  const nLower = next.n.toLowerCase();
  if (next.h.toLowerCase().includes(nLower) && nLower.length > 3) {
    hintContainsWord.push(row.i);
  }
  hintFreq.set(next.h, (hintFreq.get(next.h) || 0) + 1);
  return { i: row.i, n: row.n, f: next.f.trim(), h: next.h.trim() };
});

const reused = [...hintFreq.entries()].filter(([, c]) => c > 8).sort((a, b) => b[1] - a[1]);

console.log('Coverage:', improved.size, '/', original.length);
console.log('Missing:', missing.length, missing.slice(0, 20));
console.log('Name mismatches:', nameMismatch.length, nameMismatch.slice(0, 10));
console.log('Farsante == normal:', sameWord.length, sameWord.slice(0, 10));
console.log('Generic hints left:', genericHints.length, genericHints.slice(0, 20));
console.log('Hint contains word:', hintContainsWord.length, hintContainsWord.slice(0, 20));
console.log('Hints reused >8 times:', reused.slice(0, 15));

if (missing.length || nameMismatch.length || sameWord.length) {
  console.error('Refusing to write: fix missing/mismatch/same-word first');
  process.exit(1);
}

const lines = merged.map(
  ({ n, f, h }) => `  ['${escape(n)}', '${escape(f)}', '${escape(h)}'],`,
);

const output = `/**
 * Parejas de palabras similares para Mr White.
 * Los jugadores normales reciben la primera palabra;
 * los Farsantes reciben la segunda (muy parecida);
 * Mr White recibe la tercera como pista (asociación cercana a la palabra, no la palabra).
 */
export type WordPair = readonly [normal: string, farsante: string, hint: string];

export const WORD_PAIRS: readonly WordPair[] = [
${lines.join('\n')}
];
`;

writeFileSync(wordsPath, output);
console.log(`Wrote ${merged.length} improved pairs to ${wordsPath}`);

// Sample checks
for (const i of [0, 1, 50, 93, 109, 490, 530, 589, 1000, 1189]) {
  const p = merged[i];
  console.log(`${i}: ${p.n} / ${p.f} → ${p.h}`);
}
