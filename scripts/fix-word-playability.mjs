/**
 * Aplica correcciones de jugabilidad a words.ts y adultWords.ts.
 * Uso: node scripts/fix-word-playability.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const GENERIC_HINTS = new Set([
  'Se mueve',
  'Salud',
  'Sentimiento',
  'Comida',
  'Naturaleza',
  'Ambiente picante',
  'Fiesta',
  'Beso',
  'Baile',
  'Ambiente',
  'Cultura',
  'Ropa',
  'Redes',
]);

const HINT_FIXES = {
  Tren: 'Vías y andenes',
  Barco: 'Puerto y mar abierto',
  Bicicleta: 'Pedales y casco',
  Documental: 'Televisión informativa',
  Plato: 'Mesa servida',
  Vendaje: 'Herida cubierta',
  Pastilla: 'Farmacia y dosis',
  Análisis: 'Laboratorio clínico',
  Cirugía: 'Quirófano y bisturí',
  Dieta: 'Menú saludable',
  Sueño: 'Cama y descanso',
  Estrés: 'Nervios y presión',
  Éxito: 'Meta cumplida',
  Fracaso: 'Plan que salió mal',
  Suerte: 'Azar favorable',
  Destino: 'Camino marcado',
  Recuerdo: 'Foto en la mente',
  Idea: 'Bombilla encendida',
  Secreto: 'Susurro entre dos',
  Segundo: 'Reloj en marcha',
  Presupuesto: 'Hoja de gastos',
  'Castillo encantado': 'Murallas y princesas',
  'Pizarra blanca': 'Aula y marcadores',
  Proyector: 'Sala oscura',
  Lavadero: 'Ropa tendida',
  Problema: 'Encrucijada difícil',
};

const FARSANTE_FIXES = {
  Zapatos: 'Botas',
  Medianoche: 'Anochecer',
  'Pan de molde': 'Baguette',
  'Pez león': 'Manta raya',
  Astrofísica: 'Geología',
  Empanadilla: 'Empanada argentina',
  'Oso pardo': 'Oso hormiguero',
  'Té con leche': 'Infusión de hierbas',
};

/** Segunda aparición del normal: renombrar para evitar colisión. */
const NORMAL_RENAME_ON_DUP = {
  Podcast: 'Podcast de entrevistas',
  Nube: 'Nubarrón',
  Primavera: 'Estación florida',
  Sueño: 'Ensueño',
  Batería: 'Pila recargable',
  Mapa: 'Mapa turístico',
  Maleta: 'Maleta con ruedas',
  Hotel: 'Hotel boutique',
  Camping: 'Campamento',
  Rosa: 'Rosa roja',
  Sol: 'Sol de verano',
  Coral: 'Arrecife de coral',
  Pasillo: 'Pasillo central',
  Vacuna: 'Inyección preventiva',
  Historia: 'Historia antigua',
  Algodón: 'Algodón en bolas',
  Cartera: 'Cartera de cuero',
  Zapatero: 'Mueble zapatero',
};

const ADULT_FARSANTE_FIXES = {
  'Baile erótico': 'Striptease',
  'Que te den': 'Que te follen',
  'Acabada dentro': 'Acabar fuera',
  Resaca: 'Resaca leve',
  Pastillas: 'Pastillero',
  Frotarse: 'Frotamiento mutuo',
  Chupetón: 'Marca en el cuello',
  Cucharita: 'Postura lateral',
  Cotilleo: 'Cotilleo de bar',
  Fertilidad: 'Fecundación asistida',
  Aceptación: 'Autoestima en pareja',
  Valoración: 'Opinión sincera',
  'Dominatrix económica': 'Sugar mommy',
};

const ADULT_HINT_POOLS = {
  insulto: [
    'Bronca de bar',
    'Discusión absurda',
    'Grito en la calle',
    'Pelea de borrachos',
    'Insulto entre colegas',
  ],
  cuerpo: [
    'Baño privado',
    'Espejo del dormitorio',
    'Ropa interior',
    'Ducha caliente',
    'Sabanas revueltas',
  ],
  sexo: [
    'Habitación a oscuras',
    'Noche larga',
    'Respiro entrecortado',
    'Puerta con llave',
    'Sábanas revueltas',
  ],
  fiesta: [
    'Madrugada en la calle',
    'Bar con música alta',
    'Después de la discoteca',
    'Copas encima de la mesa',
    'Grupo de amigos',
  ],
  sado: [
    'Acuerdo en pareja',
    'Límite negociado',
    'Cuarto con candado',
    'Juego de roles',
    'Cuero y cadenas',
  ],
  ligue: [
    'Mensaje a medianoche',
    'App con fotos',
    'Bar de copas',
    'Mirada prolongada',
    'Plan de fin de semana',
  ],
  trabajo: [
    'Oficina discreta',
    'Contrato confidencial',
    'Reunión privada',
    'Factura sin nombre',
    'Cliente habitual',
  ],
  default: [
    'Confidencia entre amigos',
    'Noche de verano',
    'Rincón del bar',
    'Conversación en voz baja',
    'Secreto compartido',
  ],
};

function unescape(s) {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function escape(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function parsePairs(filePath) {
  const text = readFileSync(filePath, 'utf8');
  return [...text.matchAll(/\['((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\]/g)].map(
    (m) => [unescape(m[1]), unescape(m[2]), unescape(m[3])],
  );
}

function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9ñ ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tooClose(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return true;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  if (na.length >= 4 && nb.length >= 4 && na.slice(0, 4) === nb.slice(0, 4)) return true;
  return false;
}

function hintRevealsFarsante(farsante, hint) {
  if (farsante.length <= 3) return false;
  return hint.toLowerCase().includes(farsante.toLowerCase());
}

function pickFromPool(pool, seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

function adultHintCategory(normal) {
  const n = norm(normal);
  if (/puta|cabron|gilipollas|imbecil|idiota|hostia|joder|mierda|capullo|zorra|insulto|hijo de/.test(n)) {
    return 'insulto';
  }
  if (/sado|látigo|fusta|esposas|domin|sumis|azote|antifaz|mazmorra/.test(n)) return 'sado';
  if (/ligue|app|tinder|match|novio|pareja|infiel|cornud|poliamor/.test(n)) return 'ligue';
  if (/fiesta|resaca|borrach|madrugad|discotec|after/.test(n)) return 'fiesta';
  if (/prostitut|burdel|puticlub|gigolo|acompañante|trabajo sexual/.test(n)) return 'trabajo';
  if (/teta|culo|polla|chocho|pezon|nalgas|clitoris|pene|vagina|semen|orgasmo|follar|mamada|sexo/.test(n)) {
    return 'sexo';
  }
  if (/pierna|brazo|ombligo|muslo|labio|pecho|ingle|piel/.test(n)) return 'cuerpo';
  return 'default';
}

function generateAdultHint(normal, farsante) {
  const cat = adultHintCategory(normal);
  return pickFromPool(ADULT_HINT_POOLS[cat], `${normal}|${farsante}`);
}

function fixWordsPairs(pairs, { adult = false } = {}) {
  const seenNormals = new Set();
  const hintUse = new Map();
  const out = [];

  for (let [normal, farsante, hint] of pairs) {
    if (seenNormals.has(normal)) {
      const renamed = NORMAL_RENAME_ON_DUP[normal];
      if (renamed) {
        normal = renamed;
      }
    }

    if (seenNormals.has(normal)) {
      continue;
    }
    seenNormals.add(normal);

    if (FARSANTE_FIXES[farsante]) farsante = FARSANTE_FIXES[farsante];
    if (adult && ADULT_FARSANTE_FIXES[farsante]) farsante = ADULT_FARSANTE_FIXES[farsante];

    if (HINT_FIXES[normal]) hint = HINT_FIXES[normal];
    if (GENERIC_HINTS.has(hint) || (adult && GENERIC_HINTS.has(hint))) {
      hint = adult ? generateAdultHint(normal, farsante) : HINT_FIXES[normal] ?? hint;
    }
    if (GENERIC_HINTS.has(hint)) {
      hint = adult ? generateAdultHint(normal, farsante) : generateAdultHint(normal, farsante);
    }
    if (hintRevealsFarsante(farsante, hint)) {
      hint = adult ? generateAdultHint(normal, farsante) : `Contexto de ${normal.toLowerCase()}`;
      if (hintRevealsFarsante(farsante, hint) || GENERIC_HINTS.has(hint)) {
        hint = pickFromPool(ADULT_HINT_POOLS.default, normal);
      }
    }

  let attempts = 0;
  while ((hintUse.get(hint) ?? 0) >= 3 && attempts < 12) {
    hint = adult
      ? pickFromPool(ADULT_HINT_POOLS[adultHintCategory(normal)], `${normal}|${attempts}`)
      : `${hint} (${attempts + 2})`;
    attempts += 1;
  }

    hintUse.set(hint, (hintUse.get(hint) ?? 0) + 1);

    if (tooClose(normal, farsante)) {
      const alt = adult ? 'Noche larga' : 'Otro del mismo tipo';
      farsante = alt;
    }

    out.push([normal, farsante, hint]);
  }

  return out;
}

function writePairsFile(srcPath, outPath, exportName, pairs, headerComment) {
  const src = readFileSync(srcPath, 'utf8');
  const headerEnd = src.indexOf('export const');
  const header = src.slice(0, headerEnd);
  const lines = pairs.map(([n, f, h]) => `  ['${escape(n)}', '${escape(f)}', '${escape(h)}'],`);
  const body = `${header}export const ${exportName}: readonly WordPair[] = [\n${lines.join('\n')}\n];\n`;
  const footerMatch = src.match(/\nexport const \w+.*$/s);
  let footer = '';
  if (exportName === 'ADULT_WORD_PAIRS') {
    footer = `\nexport const ADULT_WORDS: readonly string[] = ADULT_WORD_PAIRS.map(([w]) => w);\n`;
  }
  writeFileSync(outPath, body + footer);
}

const wordsPath = join(root, 'src/data/words.ts');
const adultPath = join(root, 'src/data/adultWords.ts');

const wordsPairs = parsePairs(wordsPath);
const adultPairs = parsePairs(adultPath);

console.log('Before:', wordsPairs.length, 'words,', adultPairs.length, 'adult');

const fixedWords = fixWordsPairs(wordsPairs);
const fixedAdult = fixWordsPairs(adultPairs, { adult: true });

// Restaurar pares eliminados por deduplicación con nuevas entradas únicas
const REPLACEMENT_PAIRS = [
  ['Guisante', 'Haba', 'Guiso de invierno'],
  ['Brocha', 'Rodillo', 'Pintura en pared'],
  ['Cinturón', 'Tirantes', 'Pantalón ajustado'],
  ['Estantería', 'Armario', 'Mueble del salón'],
  ['Ventilador', 'Aire acondicionado', 'Día de calor'],
  ['Tostadora', 'Microondas', 'Desayuno rápido'],
  ['Candelabro', 'Lámpara', 'Cena con luz tenue'],
  ['Percha', 'Colgador', 'Ropa en el armario'],
  ['Felpa', 'Lana', 'Manta del sofá'],
  ['Broche', 'Imperdible', 'Prenda sujeta'],
  ['Cazo', 'Olla', 'Cocina humeante'],
  ['Rodaja', 'Loncha', 'Corte fino'],
  ['Pincel', 'Esponja', 'Maquillaje'],
  ['Brocal', 'Maceta', 'Planta en balcón'],
  ['Estropajo', 'Bayeta', 'Fregar platos'],
  ['Cazoleta', 'Cazuela', 'Guiso casero'],
  ['Salero', 'Pimentero', 'Mesa puesta'],
  ['Exprimidor', 'Licuadora', 'Zumo recién hecho'],
  ['Pelador', 'Rallador', 'Verdura preparada'],
];

while (fixedWords.length < wordsPairs.length) {
  const next = REPLACEMENT_PAIRS[fixedWords.length - (wordsPairs.length - REPLACEMENT_PAIRS.length)] ??
    REPLACEMENT_PAIRS[fixedWords.length % REPLACEMENT_PAIRS.length];
  if (!fixedWords.some(([n]) => n === next[0])) fixedWords.push(next);
}

if (fixedWords.length !== wordsPairs.length) {
  console.error('Word count mismatch:', fixedWords.length, 'vs', wordsPairs.length);
  process.exit(1);
}

writePairsFile(wordsPath, wordsPath, 'WORD_PAIRS', fixedWords, '');
writePairsFile(adultPath, adultPath, 'ADULT_WORD_PAIRS', fixedAdult, '');

copyFileSync(wordsPath, join(root, 'shared/words.ts'));
copyFileSync(adultPath, join(root, 'shared/adultWords.ts'));

console.log('After:', fixedWords.length, 'words,', fixedAdult.length, 'adult');
console.log('Synced shared/ copies');
