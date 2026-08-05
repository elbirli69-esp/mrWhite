/**
 * Genera words.ts con un tercer elemento (pista) por pareja.
 * La pista es un concepto cercano: ayuda a Mr White a inventar
 * una palabra plausible sin delatar la secreta.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordsPath = join(__dirname, '../src/data/words.ts');

const source = readFileSync(wordsPath, 'utf8');
const pairMatches = [
  ...source.matchAll(
    /\['((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'(?:,\s*'((?:\\'|[^'])*)')?\]/g,
  ),
];

if (pairMatches.length < 1000) {
  console.error('Expected ~1190 pairs, got', pairMatches.length);
  process.exit(1);
}

const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
const pairs = pairMatches.map((m) => [unescape(m[1]), unescape(m[2])]);

/**
 * Rangos inclusivos → pista.
 * Ordenados de más específico a más amplio no importa:
 * se elige el rango más estrecho que contenga el índice.
 */
const RANGE_HINTS = [
  // Animales
  [0, 9, 'Granja o bosque'],
  [10, 15, 'Pico'],
  [16, 19, 'Océano'],
  [20, 24, 'Bicho'],
  [25, 29, 'Escamas'],
  [30, 39, 'Selva o sabana'],
  [40, 43, 'Pico'],
  [44, 47, 'Pequeño animal'],
  [48, 49, 'Fondo del mar'],

  // Comida / bebida
  [50, 64, 'Para comer'],
  [65, 71, 'Dulce y jugoso'],
  [72, 79, 'Huerta'],
  [80, 84, 'Condimento'],
  [85, 99, 'En el plato'],
  [100, 109, 'Se bebe'],

  // Transporte / lugares / tech / ocio
  [110, 127, 'Se mueve'],
  [128, 130, 'Auxilio'],
  [131, 139, 'Paisaje'],
  [140, 159, 'Sitio'],
  [160, 169, 'Salir'],
  [170, 199, 'Digital'],
  [200, 221, 'Espectáculo'],
  [222, 229, 'Jugar'],
  [230, 259, 'Competir'],
  [260, 289, 'Vestir'],
  [290, 319, 'En casa'],
  [320, 329, 'Cielo'],
  [330, 339, 'Crece'],
  [340, 349, 'Material'],
  [350, 379, 'Trabajo'],
  [380, 399, 'Tu cuerpo'],
  [400, 409, 'Salud'],
  [410, 429, 'Calendario'],
  [430, 458, 'Cole'],
  [459, 478, 'Sentimiento'],
  [479, 498, 'Bricolaje'],
  [499, 518, 'Bolsillo'],
  [519, 530, 'Vacaciones'],
  [531, 538, 'Melodía'],
  [539, 547, 'Tono'],
  [548, 558, 'Forma'],
  [559, 574, 'Rutina'],
  [575, 578, 'Organizar'],
  [579, 598, 'Fantasía'],
  [599, 610, 'Automóvil'],
  [611, 630, 'Jardín'],
  [631, 650, 'Cocina'],
  [651, 658, 'Mapa'],
  [659, 670, 'Oficina'],
  [671, 678, 'Aire libre'],
  [679, 690, 'Espacio'],
  [691, 698, 'Océano'],
  [699, 710, 'Bicho'],
  [711, 718, 'Ave'],
  [719, 730, 'Hogar'],
  [731, 738, 'Infancia'],
  [739, 750, 'Clima'],
  [751, 770, 'Sabor'],
  [771, 778, 'Hobby'],
  [779, 790, 'Comunicar'],
  [791, 798, 'Construcción'],
  [799, 810, 'Energía'],
  [811, 830, 'Estilo'],
  [831, 838, 'Buenas maneras'],
  [839, 859, 'Laboratorio'],
  [860, 869, 'Electrodoméstico'],
  [870, 879, 'Calle'],
  [880, 889, 'Compañero'],
  [890, 899, 'Página'],
  [900, 909, 'Utensilio'],
  [910, 929, 'Sabor'],
  [930, 939, 'Terreno'],
  [940, 949, 'En línea'],
  [950, 959, 'Espejo'],
  [960, 969, 'Asfalto'],
  [970, 989, 'Oficio'],
  [990, 999, 'Entrenar'],
  [1000, 1029, 'Contrario'],
  [1030, 1049, 'Exótico'],
  [1050, 1059, 'Llevar encima'],
  [1060, 1079, 'Salvaje'],
  [1080, 1089, 'Tronco'],
  [1090, 1109, 'Edificio'],
  [1110, 1129, 'Sabor'],
  [1130, 1159, 'Despensa'],
  [1160, 1189, 'Decorar'],
];

/** Overrides puntuales: orientan sin regalar la palabra. */
const OVERRIDES = {
  0: 'Cuatro patas',
  1: 'Bigotes',
  2: 'Rugido',
  3: 'Establo',
  17: 'Agua salada',
  50: 'Horno',
  51: 'Taza',
  59: 'Con pan',
  61: 'Postre',
  110: 'Cielo',
  111: 'Carretera',
  132: 'Verano',
  170: 'Escritorio',
  184: 'Pantalla',
  200: 'Sofá',
  230: 'Campo',
  260: 'Armario',
  290: 'Salón',
  320: 'Arriba',
  350: 'Bata',
  351: 'Aula',
  380: 'Rostro',
  400: 'Cama',
  420: 'Invierno',
  430: 'Mesa',
  459: 'Cara',
  499: 'Billetera',
  519: 'Aeropuerto',
  580: 'Cuento',
  600: 'Taller',
  1000: 'Extremos',
  1002: 'Conversación',
  1004: 'Cadena',
  1010: 'Medida',
  1018: 'Sensación',
};

function hintForIndex(index) {
  if (OVERRIDES[index]) return OVERRIDES[index];

  const matches = RANGE_HINTS.filter(([from, to]) => index >= from && index <= to);
  if (matches.length === 0) return 'Tema cercano';

  matches.sort((a, b) => a[1] - a[0] - (b[1] - b[0]));
  return matches[0][2];
}

const lines = pairs.map(([normal, farsante], i) => {
  const hint = hintForIndex(i);
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `  ['${esc(normal)}', '${esc(farsante)}', '${esc(hint)}'],`;
});

const output = `/**
 * Parejas de palabras similares para Mr White.
 * Los jugadores normales reciben la primera palabra;
 * los Farsantes reciben la segunda (parecida);
 * Mr White recibe la tercera como pista (tema cercano, no la palabra).
 */
export type WordPair = readonly [normal: string, farsante: string, hint: string];

export const WORD_PAIRS: readonly WordPair[] = [
${lines.join('\n')}
];
`;

writeFileSync(wordsPath, output);
console.log(`Wrote ${pairs.length} pairs with hints`);

const uncovered = [];
for (let i = 0; i < pairs.length; i += 1) {
  if (hintForIndex(i) === 'Tema cercano') uncovered.push(i);
}
console.log('Fallback hints:', uncovered.length, uncovered.slice(0, 20));

for (const i of [0, 50, 110, 230, 351, 500, 580, 700, 900, 1000, 1060, 1189]) {
  console.log(`${i}: ${pairs[i][0]} / ${pairs[i][1]} → ${hintForIndex(i)}`);
}
