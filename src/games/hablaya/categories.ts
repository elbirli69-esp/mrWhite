/** Categorías base y +18 para Habla ya. */

export const BASE_CATEGORIES: readonly string[] = [
  'Historia de España',
  'Cine español',
  'Series de televisión',
  'Fútbol',
  'Cocina casera',
  'Viajes',
  'Animales',
  'Tecnología',
  'Música',
  'Videojuegos',
  'Literatura',
  'Ciencia cotidiana',
  'Geografía',
  'Moda',
  'Internet y redes',
  'Trabajo de oficina',
  'Infancia',
  'Vacaciones de verano',
  'Comida basura',
  'Superhéroes',
  'Mitología',
  'Espacio',
  'Coches',
  'Salud y deporte',
  'Política light',
  'Arte',
  'Humor',
  'Misterios',
  'Naturaleza',
  'Fiestas populares',
];

export const ADULT_CATEGORIES: readonly string[] = [
  'Ligues y apps',
  'Resacas legendarias',
  'Despedidas de soltero/a',
  'Torpezas en la cama',
  'Puticlubes y afters',
  'Fetiches (sin detalles extremos)',
  'Celos y ex',
  'Sexting',
  'Borracheras de madrugada',
  'Mentiras piadosas de pareja',
];

export function buildCategoryPool(options: {
  useBuiltIn: boolean;
  adultMode: boolean;
  custom: string[];
}): string[] {
  const pool: string[] = [];
  const seen = new Set<string>();

  const add = (label: string) => {
    const trimmed = label.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;
    const key = trimmed.toLocaleLowerCase('es');
    if (seen.has(key)) return;
    seen.add(key);
    pool.push(trimmed);
  };

  if (options.useBuiltIn) {
    for (const c of BASE_CATEGORIES) add(c);
    if (options.adultMode) {
      for (const c of ADULT_CATEGORIES) add(c);
    }
  }

  for (const c of options.custom) add(c);
  return pool;
}
