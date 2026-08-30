/**
 * Valida las pistas y palabras del farsante en words.ts.
 *
 * Las pistas ya no se generan por rangos genéricos: cada pareja lleva
 * una asociación cercana a la palabra normal y un farsante muy parecido.
 * Usa scripts/apply-improved-pairs.mjs solo al fusionar lotes curados.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordsPath = join(__dirname, '../src/data/words.ts');

const source = readFileSync(wordsPath, 'utf8');
const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');

const pairs = [
  ...source.matchAll(
    /\['((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\]/g,
  ),
].map((m) => ({
  n: unescape(m[1]),
  f: unescape(m[2]),
  h: unescape(m[3]),
}));

if (pairs.length !== 1190) {
  console.error('Expected 1190 pairs, got', pairs.length);
  process.exit(1);
}

const GENERIC = new Set([
  'Para comer',
  'Digital',
  'Se mueve',
  'Salud',
  'Sentimiento',
  'Comida',
  'Naturaleza',
  'Ambiente picante',
  'Fiesta',
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
  'Contrario',
  'Granja o bosque',
  'Selva o sabana',
  'Pequeño animal',
  'Tema cercano',
]);

const hintFreq = new Map();
const errors = [];

for (const [i, { n, f, h }] of pairs.entries()) {
  if (!n || !f || !h) errors.push(`${i}: empty field`);
  if (f.toLowerCase() === n.toLowerCase()) errors.push(`${i}: farsante equals normal (${n})`);
  if (h.toLowerCase() === n.toLowerCase()) errors.push(`${i}: hint equals normal (${n})`);
  if (GENERIC.has(h)) errors.push(`${i}: generic hint "${h}" for ${n}`);
  if (n.length > 3 && h.toLowerCase().includes(n.toLowerCase())) {
    errors.push(`${i}: hint contains normal word (${n} / ${h})`);
  }
  hintFreq.set(h, (hintFreq.get(h) || 0) + 1);
}

const heavilyReused = [...hintFreq.entries()].filter(([, c]) => c > 3);
if (heavilyReused.length) {
  errors.push(`Hints reused >3 times: ${heavilyReused.map(([h, c]) => `${h}×${c}`).join(', ')}`);
}

console.log(`Pairs: ${pairs.length}`);
console.log(`Unique hints: ${hintFreq.size}`);
console.log(`Max hint reuse: ${Math.max(...hintFreq.values())}`);

if (errors.length) {
  console.error('Validation failed:');
  for (const e of errors.slice(0, 40)) console.error(' -', e);
  process.exit(1);
}

console.log('OK: farsante words and Mr White hints look specific.');
for (const i of [0, 1, 50, 93, 490, 530]) {
  const p = pairs[i];
  console.log(`${i}: ${p.n} / ${p.f} → ${p.h}`);
}
