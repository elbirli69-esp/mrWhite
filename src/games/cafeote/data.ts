/** Pares binarios y secretos para Café o té. */

export type SecretPackId = 'famosos' | 'cosas' | 'mix';

export interface BinaryPair {
  left: string;
  right: string;
}

export const BINARY_PAIRS: readonly BinaryPair[] = [
  { left: 'Café', right: 'Té' },
  { left: 'Playa', right: 'Montaña' },
  { left: 'Día', right: 'Noche' },
  { left: 'Dulce', right: 'Salado' },
  { left: 'Frío', right: 'Calor' },
  { left: 'Perro', right: 'Gato' },
  { left: 'Libro', right: 'Película' },
  { left: 'Ciudad', right: 'Pueblo' },
  { left: 'Caos', right: 'Orden' },
  { left: 'Mañana', right: 'Fiesta' },
  { left: 'Silencio', right: 'Ruido' },
  { left: 'Mar', right: 'Piscina' },
  { left: 'Rojo', right: 'Azul' },
  { left: 'Verano', right: 'Invierno' },
  { left: 'Risueño', right: 'Serio' },
  { left: 'Aventura', right: 'Sofá' },
  { left: 'Pizza', right: 'Sushi' },
  { left: 'Tren', right: 'Avión' },
  { left: 'Música', right: 'Podcast' },
  { left: 'Campo', right: 'Asfalto' },
  { left: 'Minimal', right: 'Barroco' },
  { left: 'Sol', right: 'Lluvia' },
  { left: 'Temprano', right: 'Tarde' },
  { left: 'Caramelo', right: 'Amargo' },
  { left: 'Rápido', right: 'Lento' },
  { left: 'Clásico', right: 'Moderno' },
  { left: 'Interior', right: 'Exterior' },
  { left: 'Solo', right: 'Grupo' },
  { left: 'Arte', right: 'Ciencia' },
  { left: 'Comedia', right: 'Drama' },
  { left: 'Lujo', right: 'Sencillez' },
  { left: 'Nostalgia', right: 'Futuro' },
  { left: 'Fuego', right: 'Agua' },
  { left: 'Blanco', right: 'Negro' },
  { left: 'Suave', right: 'Fuerte' },
  { left: 'Corto', right: 'Largo' },
  { left: 'Natural', right: 'Artificial' },
  { left: 'Tradición', right: 'Novedad' },
  { left: 'Calma', right: 'Adrenalina' },
  { left: 'Local', right: 'Viaje' },
];

export const ADULT_BINARY_PAIRS: readonly BinaryPair[] = [
  { left: 'Inocente', right: 'Pícaro' },
  { left: 'Cita', right: 'Lío' },
  { left: 'Beso', right: 'Bronca' },
  { left: 'Ligero', right: 'Intenso' },
  { left: 'Discreto', right: 'Escándalo' },
  { left: 'Mimos', right: 'Drama' },
  { left: 'Amigos', right: 'Enemigos' },
  { left: 'Secreto', right: 'Chisme' },
];

export const FAMOUS_SECRETS: readonly string[] = [
  'Bad Bunny',
  'Rosalía',
  'Messi',
  'Shakira',
  'Ibai',
  'AuronPlay',
  'Taylor Swift',
  'Beyoncé',
  'Pedro Sánchez',
  'Penélope Cruz',
  'The Rock',
  'Zendaya',
  'Adele',
  'Elon Musk',
  'Quevedo',
  'Aitana',
  'Nadal',
  'Cristina Pedroche',
  'Belén Esteban',
  'Dua Lipa',
  'Billie Eilish',
  'Tom Cruise',
  'Leonardo DiCaprio',
  'Margot Robbie',
  'Harry Potter',
  'Darth Vader',
  'Shrek',
  'Spider-Man',
  'Mickey Mouse',
  'Santa Claus',
  'Frida Kahlo',
  'Picasso',
  'Cleopatra',
  'Napoleón',
  'Einstein',
  'Oprah',
  'Ronaldo',
  'Piqué',
  'Bad Gyal',
  'C. Tangana',
];

export const THING_SECRETS: readonly string[] = [
  'Guitarra',
  'Sillón',
  'Helado',
  'Paraguas',
  'Biblioteca',
  'Volcán',
  'Cactus',
  'Reloj',
  'Globo',
  'Tren',
  'Chocolate',
  'Aurora boreal',
  'Karaoke',
  'Tienda de campaña',
  'Fuego artificial',
  'Máquina de escribir',
  'Submarino',
  'Pastel de cumpleaños',
  'Farola',
  'Puente',
  'Nube',
  'Sandalia',
  'Telescopio',
  'Mermelada',
  'Trompetas',
  'Escalera mecánica',
  'Pijama',
  'Mapa',
  'Bocadillo',
  'Linterna',
  'Catedral',
  'Tiburón',
  'Globo terráqueo',
  'Semaforo',
  'Hamaca',
  'Cámara de fotos',
  'Cafetera',
  'Trompo',
  'Acuario',
  'Patinete',
];

export const ADULT_FAMOUS_SECRETS: readonly string[] = [
  'Madonna',
  'Rihanna',
  'Bad Bunny',
  'Cardi B',
  'Pedro Almodóvar',
  'Marilyn Monroe',
  'James Bond',
  'Harley Quinn',
  'Deadpool',
  'Catwoman',
  'Drácula',
  'Venus de Milo',
  'Cupido',
  'Dioniso',
  'Cleopatra',
];

export const ADULT_THING_SECRETS: readonly string[] = [
  'Lencería',
  'Champán',
  'Tacones',
  'Masaje',
  'Hotel',
  'Oscuridad',
  'Perfume',
  'Juego de mesa picante',
  'Beso robado',
  'Mensaje borrado',
  'Cita a ciegas',
  'Confesión',
  'Celos',
  'Fiesta sorpresa',
  'Canción dedicada',
];

export function pairsForMode(adultMode: boolean): readonly BinaryPair[] {
  if (!adultMode) return BINARY_PAIRS;
  return [...BINARY_PAIRS, ...ADULT_BINARY_PAIRS];
}

export function secretsForPack(pack: SecretPackId, adultMode: boolean): readonly string[] {
  const famosos = adultMode ? [...FAMOUS_SECRETS, ...ADULT_FAMOUS_SECRETS] : FAMOUS_SECRETS;
  const cosas = adultMode ? [...THING_SECRETS, ...ADULT_THING_SECRETS] : THING_SECRETS;
  if (pack === 'famosos') return famosos;
  if (pack === 'cosas') return cosas;
  return [...famosos, ...cosas];
}

export const PACK_OPTIONS: readonly { id: SecretPackId; label: string }[] = [
  { id: 'famosos', label: 'Famosos' },
  { id: 'cosas', label: 'Cosas' },
  { id: 'mix', label: 'Mix' },
];
