/**
 * Regenera farsantes más distintos y pistas más lejanas para Mr White.
 * Uso: node scripts/improve-mrwhite-pairs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parsePairs(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return [...text.matchAll(/\['((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\]/g)].map((m) =>
    [m[1], m[2], m[3]].map((s) => s.replace(/\\'/g, "'")),
  );
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

function tokens(s) {
  return norm(s).split(' ').filter(Boolean);
}

/** Farsante demasiado parecido a la palabra normal. */
export function tooClose(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return true;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta[0] && tb[0] && ta[0] === tb[0] && ta[0].length >= 4) return true;
  // León/Leona, hostia/ostia, etc.
  if (na.length >= 4 && nb.length >= 4) {
    const minLen = Math.min(na.length, nb.length);
    const stem = na.slice(0, minLen - 1);
    if (
      stem.length >= 4 &&
      na.startsWith(stem) &&
      nb.startsWith(stem) &&
      Math.abs(na.length - nb.length) <= 2
    ) {
      return true;
    }
  }
  return false;
}

const SOUND_HINT =
  /^(ladrido|ronroneo|rugido|mugido|gruñido|ulular|cuac|arrullo|croar|sisear|zumbido|graznar|aullido|maullido|balido|relincho|piar|cacarear|rebuznar)$/i;

const BODY_HINT =
  /^(trompa|cuello largo|ocho patas|joroba|aleta dorsal|pinzas|colmillos|caparazón|bolsa|una pata|pico|bigotes|cuatro patas|mejill|alas|pedales|volante|ra[ií]les|ancla)$/i;

const DICT_HINT =
  /^(veinti|doce |siete |sesenta |parte del|unidad |traga|se escribe|cubre |previene |muestra de|en el quir|controlar el|cerrar los|nervios |meta conseguida|no lo logr|loter[ií]a|est[aá] escrito|foto antigua|bombilla|no contarlo)/i;

function tooDirectHint(hint) {
  const h = hint.trim();
  if (SOUND_HINT.test(h)) return true;
  if (BODY_HINT.test(h)) return true;
  if (DICT_HINT.test(h)) return true;
  // Definiciones largas tipo diccionario (verbo + objeto), no ambientes
  const words = h.split(/\s+/);
  if (words.length >= 5 && /^(se |la |el |los |las |cubre |traga |mide |abre |corta |pesa |da |lleva |escribe )/i.test(h)) {
    return true;
  }
  if (words.length >= 6) return true;
  return false;
}

function tooVagueHint(hint) {
  return /^(para comer|granja o bosque|selva o sabana|oc[eé]ano|bicho|pico|escamas|vestir|competir|armario|tu cuerpo|calendario|vacaciones|melod[ií]a|forma|organizar|en el plato|huerta|postre|con pan|dulce y jugoso|peque[nñ]o animal|fondo del mar)$/i.test(
    hint.trim(),
  );
}

/** Overrides puntuales: farsante distinto + pista lejana (ambiente / contexto). */
const OVERRIDES = {
  Perro: ['Lobo', 'Parque al atardecer'],
  Gato: ['Tigre', 'Sofá junto a la ventana'],
  León: ['Tigre', 'Sabana al amanecer'],
  Caballo: ['Cebra', 'Campo abierto'],
  Vaca: ['Búfalo', 'Pradera verde'],
  Oveja: ['Cabra', 'Colina con niebla'],
  Cerdo: ['Jabalí', 'Barro tras la lluvia'],
  Conejo: ['Liebre', 'Huerto de madrugada'],
  Ratón: ['Ardilla', 'Rincón del trastero'],
  Oso: ['Panda', 'Bosque denso'],
  Águila: ['Halcón', 'Cielo despejado'],
  Búho: ['Murciélago', 'Noche en el bosque'],
  Pato: ['Ganso', 'Estanque del parque'],
  Gallina: ['Pavo', 'Corral de pueblo'],
  Paloma: ['Cuervo', 'Plaza con bancos'],
  Loro: ['Tucán', 'Jaula junto a la ventana'],
  Pingüino: ['Foca', 'Hielo y viento'],
  Delfín: ['Ballena', 'Espuma en alta mar'],
  Tiburón: ['Orca', 'Profundidades'],
  Pulpo: ['Medusa', 'Acuario oscuro'],
  Araña: ['Escorpión', 'Rincón polvoriento'],
  Hormiga: ['Abeja', 'Picnic en el césped'],
  Abeja: ['Avispa', 'Jardín en flor'],
  Mariposa: ['Libélula', 'Prado de primavera'],
  Mosca: ['Mosquito', 'Tarde de verano'],
  Serpiente: ['Lagarto', 'Roca al sol'],
  Tortuga: ['Caracol', 'Orilla tranquila'],
  Rana: ['Tritón', 'Charca de noche'],
  Cocodrilo: ['Caimán', 'Río turbio'],
  Camello: ['Llama', 'Desierto lejano'],
  Elefante: ['Rinoceronte', 'Sabana seca'],
  Jirafa: ['Cebra', 'Árboles altos'],
  Mono: ['Perezoso', 'Copa de los árboles'],
  Gorila: ['Chimpancé', 'Selva húmeda'],
  Canguro: ['Koala', 'Llanura austral'],
  Koala: ['Wombat', 'Árbol de eucalipto'],
  Zorro: ['Coyote', 'Claro del bosque'],
  Lince: ['Puma', 'Montaña nevada'],
  Jaguar: ['Leopardo', 'Selva tropical'],
  Hiena: ['Chacal', 'Noche en la sabana'],
  Flamenco: ['Pelícano', 'Laguna rosa'],
  Cisne: ['Pato', 'Lago en calma'],
  Cuervo: ['Urraca', 'Tejado viejo'],
  Canario: ['Jilguero', 'Jaula en el balcón'],
  Hamster: ['Cobaya', 'Rueda en la jaula'],
  Hurón: ['Comadreja', 'Madriguera estrecha'],
  Nutria: ['Castor', 'Río con piedras'],
  Morsa: ['Foca', 'Banquisa'],
  'Estrella de mar': ['Erizo de mar', 'Marea baja'],
  Cangrejo: ['Langosta', 'Rocas con algas'],
  Pizza: ['Lasaña', 'Viernes en casa'],
  Café: ['Té', 'Terraza de mañana'],
  Pan: ['Biscote', 'Horno del barrio'],
  Queso: ['Mantequilla', 'Tabla de picoteo'],
  Leche: ['Batido', 'Desayuno temprano'],
  Huevo: ['Tortilla', 'Sartén caliente'],
  Arroz: ['Pasta', 'Olla humeante'],
  Sopa: ['Cuscus', 'Invierno en casa'],
  Ensalada: ['Gazpacho', 'Comida ligera'],
  Hamburguesa: ['Perrito caliente', 'Local de comida rápida'],
  'Patatas fritas': ['Nachos', 'Ración para compartir'],
  Chocolate: ['Caramelo', 'Merienda dulce'],
  Helado: ['Granizado', 'Paseo de verano'],
  Pastel: ['Magdalena', 'Cumpleaños'],
  Donut: ['Cruasán', 'Cafetería de paso'],
  Manzana: ['Pera', 'Frutero de cocina'],
  Naranja: ['Limón', 'Zumo recién hecho'],
  Plátano: ['Kiwi', 'Bowl de fruta'],
  Fresa: ['Frambuesa', 'Tarta del domingo'],
  Uva: ['Cereza', 'Racimo en la mesa'],
  Sandía: ['Melón', 'Toalla en la playa'],
  Piña: ['Mango', 'Cóctel tropical'],
  Aguacate: ['Oliva', 'Tostada de brunch'],
  Tomate: ['Pimiento', 'Sofrito casero'],
  Zanahoria: ['Apio', 'Estofado lento'],
  Cebolla: ['Puerro', 'Olla de guiso'],
};

/** Compuestos / variantes que compartían la misma raíz: forzar hermano de categoría. */
const COMPOUND_FIXES = {
  Plátano: ['Mango', 'Bowl de fruta'],
  'Tortilla española': ['Croqueta', 'Bar de raciones'],
  Golf: ['Bolos', 'Césped cuidado'],
  Surf: ['Skate', 'Espuma en la orilla'],
  Chaleco: ['Abrigo', 'Pasillo del armario'],
  'Caja fuerte': ['Candado', 'Oficina discreta'],
  'Ensalada César': ['Gazpacho', 'Menú del mediodía'],
  'Tiburón martillo': ['Mantarraya', 'Profundidad azul'],
  'Tortuga marina': ['Delfín', 'Costa protegida'],
  'Batido de chocolate': ['Granizado', 'Pajita en el vaso'],
  'Helado de vainilla': ['Sorbete', 'Paseo de tarde'],
  'Energía solar': ['Molino de viento', 'Tejado moderno'],
  Sonrisa: ['Guiño', 'Foto de grupo'],
  'Química orgánica': ['Biología', 'Laboratorio escolar'],
  'Freidora de aire': ['Horno', 'Cocina pequeña'],
  'Tortuga de agua': ['Pez dorado', 'Pecera en casa'],
  Biografía: ['Novela', 'Estantería de no ficción'],
  'Salsa boloñesa': ['Alioli', 'Plato de pasta'],
  'Tortilla de patatas': ['Empanada', 'Tapeo de bar'],
  'Croqueta de jamón': ['Pincho', 'Bandeja de calamares'],
  Ración: ['Menú', 'Bar de barrio'],
  'Bálsamo labial': ['Crema de manos', 'Neceser'],
  Peaje: ['Parking', 'Salida de autopista'],
  'Zona azul': ['Parking', 'Centro de la ciudad'],
  'Carril BUS': ['Rotonda', 'Avenida transitada'],
  'Puente levadizo': ['Túnel', 'Puerto con barcos'],
  'Llaves de casa': ['Mando del garaje', 'Bolsillo del abrigo'],
  'Gafas de sol': ['Gorra', 'Terraza en agosto'],
  'Auriculares inalámbricos': ['Altavoz', 'Viaje en metro'],
  'Panda rojo': ['Koala', 'Zoo sombreado'],
  'Lobo ártico': ['Oso polar', 'Tundra blanca'],
  'Zorro ártico': ['Foca', 'Nieve intacta'],
  'Lince ibérico': ['Águila', 'Parque natural'],
  'Iglesia románica': ['Castillo', 'Pueblo antiguo'],
  'Torre del homenaje': ['Muralla', 'Ruinas visitables'],
  'Café con leche': ['Infusión', 'Desayuno de terraza'],
  'Agua mineral': ['Zumo', 'Nevera del picnic'],
  'Salsa de soja': ['Wasabi', 'Pedido de sushi'],
  'Mostaza Dijon': ['Ketchup', 'Perrito en la feria'],
  'Aceite de oliva': ['Mantequilla', 'Ensalada de verano'],
  'Vinagre balsámico': ['Limón', 'Ensalada Caprese'],
  'Caldo de pollo': ['Sopa miso', 'Olla de domingo'],
  'Azúcar glas': ['Miel', 'Horneado casero'],
  'Chocolate negro': ['Regaliz', 'Caja de bombones'],
  'Coco rallado': ['Almendra', 'Bizcocho tropical'],
  'Semillas de chía': ['Avena', 'Bol de desayuno'],
  'Hamburguesa vegetal': ['Falafel', 'Local vegetariano'],
  'Leche de almendras': ['Zumo de avena', 'Café de especialidad'],
  'Yogur vegetal': ['Kéfir', 'Nevera del súper'],
  'Queso vegano': ['Hummus', 'Tabla de picoteo'],
  'Cama individual': ['Sofá cama', 'Habitación de invitados'],
  'Espejo de cuerpo entero': ['Perchero', 'Recibidor'],
  'Alfombra redonda': ['Cortina', 'Salón acogedor'],
  'Cojín decorativo': ['Manta', 'Sofá del salón'],
  'Lámpara de pie': ['Velas', 'Rincón de lectura'],
  'Planta artificial': ['Cuadro', 'Estantería'],
  'Reloj de pared': ['Calendario', 'Cocina familiar'],
  Violín: ['Flauta', 'Ensayo de tarde'],
};

/** Sustituciones genéricas cuando el farsante es un sinónimo/apodo. */
const SYNONYM_TO_SIBLING = {
  chucho: 'Lobo',
  minino: 'Tigre',
  leona: 'Tigre',
  cochino: 'Jabalí',
  cordero: 'Cabra',
  'oso pardo': 'Panda',
  ánade: 'Ganso',
  culebra: 'Lagarto',
  tarántula: 'Escorpión',
  marsopa: 'Ballena',
  cazón: 'Orca',
  frailecillo: 'Foca',
  'elefante asiático': 'Rinoceronte',
  'jirafa reticulada': 'Cebra',
  'espátula rosada': 'Pelícano',
  manchego: 'Mantequilla',
  yema: 'Tortilla',
  lechuga: 'Gazpacho',
  'patatas bravas': 'Nachos',
  'plátano canario': 'Kiwi',
  'aguacate fuerte': 'Oliva',
  turismo: 'Moto',
  sumergible: 'Submarino nuclear',
  misil: 'Satélite',
  docuserie: 'Podcast',
  'fútbol sala': 'Baloncesto',
  minigolf: 'Bolos',
  windsurf: 'Kitesurf',
  'hockey hierba': 'Lacrosse',
  'patinaje sobre hielo': 'Esquí',
  'pesca con mosca': 'Buceo',
};

/** Pistas ambiente por palabra cuando la actual es demasiado directa. */
const HINT_BY_WORD = {
  ...Object.fromEntries(Object.entries(OVERRIDES).filter(([, v]) => v).map(([k, v]) => [k, v[1]])),
};

function pickFarsante(normal, srcF, sharedF) {
  const override = OVERRIDES[normal] || COMPOUND_FIXES[normal];
  if (override) return override[0];

  const srcClose = tooClose(normal, srcF);
  const sharedClose = tooClose(normal, sharedF);

  if (!srcClose && !sharedClose) {
    const srcShare = tokens(normal)[0] === tokens(srcF)[0];
    const sharedShare = tokens(normal)[0] === tokens(sharedF)[0];
    if (srcShare && !sharedShare) return sharedF;
    if (!srcShare && sharedShare) return srcF;
    if (SYNONYM_TO_SIBLING[norm(srcF)]) return sharedF;
    return sharedF !== srcF ? sharedF : srcF;
  }
  if (srcClose && !sharedClose) return sharedF;
  if (!srcClose && sharedClose) return srcF;

  const syn = SYNONYM_TO_SIBLING[norm(srcF)] || SYNONYM_TO_SIBLING[norm(sharedF)];
  if (syn && !tooClose(normal, syn)) return syn;

  return sharedF;
}

function softenHint(normal, srcH, sharedH) {
  const override = OVERRIDES[normal] || COMPOUND_FIXES[normal];
  if (override) return override[1];
  if (HINT_BY_WORD[normal]) return HINT_BY_WORD[normal];

  const srcDirect = tooDirectHint(srcH);
  const sharedVague = tooVagueHint(sharedH);
  const sharedDirect = tooDirectHint(sharedH);

  if (!srcDirect && srcH.split(/\s+/).length <= 4) {
    return srcH;
  }

  if (!sharedDirect && !sharedVague) return sharedH;

  if (srcDirect) {
    if (!sharedVague && !sharedDirect) return sharedH;
    if (SOUND_HINT.test(srcH.trim()) || BODY_HINT.test(srcH.trim())) {
      return sharedVague ? 'Escena cotidiana' : sharedH;
    }
    const parts = srcH.trim().split(/\s+/);
    if (parts.length >= 3 && !SOUND_HINT.test(parts[0])) {
      if (!sharedVague) return sharedH;
      return parts.slice(0, 3).join(' ');
    }
    return sharedVague ? 'Escena familiar' : sharedH;
  }

  return sharedVague ? srcH : sharedH;
}

function improvePair(normal, srcF, srcH, sharedF, sharedH) {
  let farsante = pickFarsante(normal, srcF, sharedF);
  let hint = softenHint(normal, srcH, sharedH);

  if (tooClose(normal, farsante)) {
    const compound = COMPOUND_FIXES[normal];
    if (compound) {
      farsante = compound[0];
      hint = compound[1];
    } else {
      const syn = SYNONYM_TO_SIBLING[norm(farsante)];
      if (syn && !tooClose(normal, syn)) farsante = syn;
    }
  }

  if (norm(hint) === norm(normal) || norm(hint) === norm(farsante)) {
    hint = sharedH && !tooVagueHint(sharedH) ? sharedH : 'Ambiente cercano';
  }

  if (SOUND_HINT.test(hint.trim()) || BODY_HINT.test(hint.trim())) {
    const compound = COMPOUND_FIXES[normal] || OVERRIDES[normal];
    hint = compound ? compound[1] : tooVagueHint(sharedH) ? 'Ambiente cercano' : sharedH;
    if (SOUND_HINT.test(hint.trim()) || BODY_HINT.test(hint.trim())) {
      hint = 'Ambiente cercano';
    }
  }

  return [normal, farsante, hint];
}

function writeWordsFile(filePath, pairs, headerComment) {
  const body = pairs.map(([a, b, c]) => `  ['${esc(a)}', '${esc(b)}', '${esc(c)}'],`).join('\n');
  const content = `${headerComment}

export type WordPair = readonly [normal: string, farsante: string, hint: string];

export const WORD_PAIRS: readonly WordPair[] = [
${body}
];
`;
  fs.writeFileSync(filePath, content);
}

function improveAdult(filePath, outPath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const pairs = parsePairs(filePath);

  const adultOverrides = {
    Coño: ['Mierda', 'Taco de enfado'],
    Joder: ['Hostia', 'Tropiezo inesperado'],
    Mierda: ['Joder', 'Día chungo'],
    Cabrón: ['Gilipollas', 'Bronca entre colegas'],
    Puta: ['Zorra', 'Insulto de pelea'],
    Gilipollas: ['Imbécil', 'Discusión absurda'],
    Hostia: ['Joder', 'Susto fuerte'],
    Pollas: ['Huevos', 'Chiste de barra'],
    Cojones: ['Huevos', 'Valor temerario'],
    Tetas: ['Culo', 'Vestido ajustado'],
    Culo: ['Tetas', 'Vaqueros rotos'],
    Follar: ['Ligar', 'Noche larga'],
    Correrse: ['Acabar', 'Respiración agitada'],
    Mamada: ['Sexo oral', 'Habitación a oscuras'],
    Ligar: ['Follar', 'Bar de noche'],
    Resaca: ['Migraña', 'Mañana después de fiesta'],
    Porno: ['Lencería', 'Pestaña de incógnito'],
    'Baile erótico': ['Striptease', 'Local con luces rojas'],
    Orgasmo: ['Clímax', 'Sábanas revueltas'],
    Preservativo: ['Pastilla', 'Farmacia de guardia'],
    'Pastilla azul': ['Viagra', 'Bromas de farmacia'],
    'Sexo oral': ['Mamada', 'Confidencia entre amigos'],
    'Sexo anal': ['Sado', 'Límite atrevido'],
    Tanga: ['Hilo', 'Cajón de ropa interior'],
    Sujetador: ['Tanga', 'Probador de tienda'],
    Lencería: ['Picardías', 'Regalo envuelto'],
    Consolador: ['Vibrador', 'Cajón con llave'],
    Vibrador: ['Consolador', 'Pedido discreto'],
    Sado: ['Fetiche', 'Acuerdo en pareja'],
    Fetiche: ['Sado', 'Secreto compartido'],
    'Intercambio de parejas': ['Infidelidad', 'Fiesta privada'],
    Infidelidad: ['Cornudo', 'Mensaje borrado'],
    Cornudo: ['Infidelidad', 'Rumores de pareja'],
  };

  const improved = pairs.map(([n, f, h]) => {
    if (adultOverrides[n]) return [n, adultOverrides[n][0], adultOverrides[n][1]];
    let farsante = f;
    let hint = h;
    if (tooClose(n, f) || norm(n) === norm(f)) {
      // buscar otro del pack
      const other = pairs.find((p) => p[0] !== n && !tooClose(n, p[0]));
      farsante = other ? other[0] : `${f} extra`;
      if (tooClose(n, farsante)) farsante = 'Escándalo';
    }
    if (tooDirectHint(hint) || tooClose(n, hint) || hint.split(/\s+/).length >= 5) {
      hint = 'Ambiente picante';
    }
    // Evitar hints demasiado literales tipo "Sexo", "Genital"
    if (/^(sexo|genital|insulto|taco|excremento|cuerpo|fetiche|pareja|juguete|protecci[oó]n|internet|farmacia|deseo|noche|noche adultas)$/i.test(hint.trim())) {
      hint = 'Ambiente picante';
    }
    return [n, farsante, hint];
  });

  const importLine = filePath.includes('shared')
    ? `import type { WordPair } from './words.js';`
    : `import type { WordPair } from './words';`;

  const body = improved.map(([a, b, c]) => `  ['${esc(a)}', '${esc(b)}', '${esc(c)}'],`).join('\n');
  const content = `${importLine}

/**
 * Pack +18 para Mr White / Heads Up / Just One.
 * Solo se usa si el jugador activa «Versión adultos».
 * Farsante: mismo tono, palabra distinta (no un sinónimo casi idéntico).
 * Pista Mr White: vibe cercana, sin delatar el taco.
 */
export const ADULT_WORD_PAIRS: readonly WordPair[] = [
${body}
];

export const ADULT_WORDS: readonly string[] = ADULT_WORD_PAIRS.map(([w]) => w);
`;
  fs.writeFileSync(outPath, content);
  return improved;
}

function main() {
  const srcPath = path.join(root, 'src/data/words.ts');
  const sharedPath = path.join(root, 'shared/words.ts');
  const src = parsePairs(srcPath);
  const shared = parsePairs(sharedPath);
  const sharedByN = new Map(shared.map((p) => [p[0], p]));

  const improved = src.map(([n, f, h]) => {
    const s = sharedByN.get(n) || [n, f, h];
    return improvePair(n, f, h, s[1], s[2]);
  });

  // Garantizar unicidad farsante != normal
  let stillClose = 0;
  let stillDirect = 0;
  for (const [n, f, h] of improved) {
    if (tooClose(n, f)) stillClose++;
    if (tooDirectHint(h) || SOUND_HINT.test(h) || BODY_HINT.test(h)) stillDirect++;
  }
  console.log('pairs', improved.length, 'stillClose', stillClose, 'stillDirect', stillDirect);
  console.log('samples', improved.slice(0, 12));

  const header = `/**
 * Parejas de palabras para Mr White.
 * - Normales: primera palabra (también usan otros juegos la columna 1).
 * - Farsantes: segunda — misma categoría, claramente distinta (no sinónimo ni subespecie).
 * - Mr White (pista): tercera — ambiente/contexto relacionado de lejos; nada de sonidos ni rasgos delatores.
 */`;

  writeWordsFile(srcPath, improved, header);
  writeWordsFile(sharedPath, improved, header);

  const adultSrc = improveAdult(path.join(root, 'src/data/adultWords.ts'), path.join(root, 'src/data/adultWords.ts'));
  improveAdult(path.join(root, 'shared/adultWords.ts'), path.join(root, 'shared/adultWords.ts'));
  console.log('adult pairs', adultSrc.length);
}

main();
