/**
 * Asigna pistas únicas al pack adulto (máx. 3 reutilizaciones).
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adultPath = join(__dirname, '../src/data/adultWords.ts');

const GENERIC = new Set([
  'Ambiente picante',
  'Fiesta',
  'Beso',
  'Baile',
  'Ambiente',
  'Cultura',
  'Ropa',
  'Redes',
  'Salud',
  'Sentimiento',
  'Se mueve',
]);

const OPENERS = [
  'Noche',
  'Tarde',
  'Madrugada',
  'Plan',
  'Charla',
  'Broma',
  'Secreto',
  'Anécdota',
  'Historia',
  'Momento',
  'Escena',
  'Detalle',
  'Rumor',
  'Confesión',
  'Recuerdo',
  'Vibra',
  'Ambiente',
  'Situación',
  'Episodio',
  'Capítulo',
];

const MIDDLES = [
  'en el bar',
  'de verano',
  'entre amigos',
  'en voz baja',
  'de fiesta',
  'en casa',
  'de madrugada',
  'en la calle',
  'del grupo',
  'en pareja',
  'del viaje',
  'en la cocina',
  'del piso',
  'en el after',
  'del trabajo',
  'en la playa',
  'del barrio',
  'en el coche',
  'del curro',
  'en el baño',
];

const CLOSERS = [
  'tensa',
  'loca',
  'íntima',
  'discreta',
  'improvisada',
  'inesperada',
  'compartida',
  'incómoda',
  'divertida',
  'privada',
  'rápida',
  'larga',
  'borracha',
  'romántica',
  'picante',
  'absurda',
  'memorable',
  'vergonzosa',
  'entrañable',
  'surrealista',
];

function unescape(s) {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function escape(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function parsePairs(text) {
  return [...text.matchAll(/\['((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\]/g)].map(
    (m) => [unescape(m[1]), unescape(m[2]), unescape(m[3])],
  );
}

function buildHintCatalog(size) {
  const catalog = [];
  for (const opener of OPENERS) {
    for (const middle of MIDDLES) {
      for (const closer of CLOSERS) {
        catalog.push(`${opener} ${middle} ${closer}`);
        if (catalog.length >= size) return catalog;
      }
    }
  }
  return catalog;
}

function hintReveals(farsante, hint) {
  if (farsante.length <= 3) return false;
  return hint.toLowerCase().includes(farsante.toLowerCase());
}

const source = readFileSync(adultPath, 'utf8');
const pairs = parsePairs(source);
const catalog = buildHintCatalog(pairs.length * 2);
const hintUse = new Map();
let catalogIndex = 0;

function nextHint(normal, farsante, current) {
  if (!GENERIC.has(current) && !hintReveals(farsante, current) && (hintUse.get(current) ?? 0) < 3) {
    return current;
  }

  for (let attempt = 0; attempt < catalog.length; attempt += 1) {
    const candidate = catalog[catalogIndex % catalog.length];
    catalogIndex += 1;
    if (GENERIC.has(candidate)) continue;
    if (hintReveals(farsante, candidate)) continue;
    if ((hintUse.get(candidate) ?? 0) >= 3) continue;
    return candidate;
  }

  return `Plan ${catalogIndex++} de la noche`;
}

const fixed = pairs.map(([normal, farsante, hint]) => {
  const next = nextHint(normal, farsante, hint);
  hintUse.set(next, (hintUse.get(next) ?? 0) + 1);
  return [normal, farsante, next];
});

const headerEnd = source.indexOf('export const');
const header = source.slice(0, headerEnd);
const lines = fixed.map(([n, f, h]) => `  ['${escape(n)}', '${escape(f)}', '${escape(h)}'],`);
const body = `${header}export const ADULT_WORD_PAIRS: readonly WordPair[] = [\n${lines.join('\n')}\n];\n\nexport const ADULT_WORDS: readonly string[] = ADULT_WORD_PAIRS.map(([w]) => w);\n`;
writeFileSync(adultPath, body);
copyFileSync(adultPath, join(__dirname, '../shared/adultWords.ts'));

const reused = [...hintUse.entries()].filter(([, c]) => c > 3);
console.log('Adult pairs:', fixed.length, 'hints reused >3:', reused.length);
