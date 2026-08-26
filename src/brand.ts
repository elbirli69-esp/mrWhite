import type { ComponentType } from 'react';

/** Marca paraguas de la app (hub, PWA, tiendas). */
export const APP_BRAND = 'Mesa Móvil';

export interface PartyGameRoute {
  /** Ruta canónica (pública). */
  path: string;
  /** Rutas antiguas que redirigen a `path`. */
  legacyPaths: readonly string[];
  app: string;
  title: string;
  hubName: string;
  hubLine: string;
  hubCta: string;
  tone: string;
  group: 'impostores' | 'tablero' | 'pistas' | 'hablar' | 'solo';
  loader: () => Promise<{ default: ComponentType }>;
}

export const partyGames: readonly PartyGameRoute[] = [
  {
    path: '/impostor',
    legacyPaths: ['/mrwhite'],
    app: 'impostor',
    title: 'El Impostor',
    hubName: 'El Impostor',
    hubLine: 'Impostores, palabras secretas y el móvil que pasa.',
    hubCta: 'Jugar',
    tone: 'white',
    group: 'impostores',
    loader: () => import('./App'),
  },
  {
    path: '/intruso',
    legacyPaths: ['/camaleon'],
    app: 'intruso',
    title: 'El Intruso',
    hubName: 'El Intruso',
    hubLine: 'Tablero, pistas de una palabra y alguien que no la conoce.',
    hubCta: 'Jugar',
    tone: 'camaleon',
    group: 'impostores',
    loader: () => import('./games/camaleon/App'),
  },
  {
    path: '/lugar-secreto',
    legacyPaths: ['/spyfall'],
    app: 'lugar-secreto',
    title: '¿Dónde estamos?',
    hubName: '¿Dónde estamos?',
    hubLine: 'Un lugar secreto, preguntas y espías improvisando.',
    hubCta: 'Jugar',
    tone: 'spyfall',
    group: 'impostores',
    loader: () => import('./games/spyfall/App'),
  },
  {
    path: '/trazo-falso',
    legacyPaths: ['/fakeartist'],
    app: 'trazo-falso',
    title: 'Trazo falso',
    hubName: 'Trazo falso',
    hubLine: 'Dibujo colectivo y un impostor que no conoce la palabra.',
    hubCta: 'Jugar',
    tone: 'fakeartist',
    group: 'impostores',
    loader: () => import('./games/fakeartist/App'),
  },
  {
    path: '/pista-numero',
    legacyPaths: ['/codigosecreto'],
    app: 'pista-numero',
    title: 'Pista y número',
    hubName: 'Pista y número',
    hubLine: 'Dos equipos, pista + número (1–5) y un tablero de 25.',
    hubCta: 'Jugar',
    tone: 'codigosecreto',
    group: 'tablero',
    loader: () => import('./games/codigosecreto/App'),
  },
  {
    path: '/en-la-frente',
    legacyPaths: ['/headsup'],
    app: 'en-la-frente',
    title: 'En la frente',
    hubName: 'En la frente',
    hubLine: 'Palabra en la frente, pistas del resto y reloj en marcha.',
    hubCta: 'Jugar',
    tone: 'headsup',
    group: 'pistas',
    loader: () => import('./games/headsup/App'),
  },
  {
    path: '/sin-repetir',
    legacyPaths: ['/justone'],
    app: 'sin-repetir',
    title: 'Sin repetir',
    hubName: 'Sin repetir',
    hubLine: 'Una palabra, pistas únicas y el adivinador al margen.',
    hubCta: 'Jugar',
    tone: 'justone',
    group: 'pistas',
    loader: () => import('./games/justone/App'),
  },
  {
    path: '/cafe-o-te',
    legacyPaths: ['/cafeote'],
    app: 'cafe-o-te',
    title: 'Café o té',
    hubName: 'Café o té',
    hubLine: 'Pares binarios, vibes y una palabra secreta en la mesa.',
    hubCta: 'Jugar',
    tone: 'cafeote',
    group: 'pistas',
    loader: () => import('./games/cafeote/App'),
  },
  {
    path: '/todos-igual',
    legacyPaths: ['/unanimo'],
    app: 'todos-igual',
    title: 'Todos igual',
    hubName: 'Todos igual',
    hubLine: 'Coincide con el grupo, no intentes ser el más original.',
    hubCta: 'Jugar',
    tone: 'unanimo',
    group: 'pistas',
    loader: () => import('./games/unanimo/App'),
  },
  {
    path: '/bote',
    legacyPaths: ['/papelitos'],
    app: 'bote',
    title: 'Bote de ideas',
    hubName: 'Bote de ideas',
    hubLine: 'Bote, tres rondas: describir, una palabra y mímica.',
    hubCta: 'Jugar',
    tone: 'papelitos',
    group: 'pistas',
    loader: () => import('./games/papelitos/App'),
  },
  {
    path: '/habla-ya',
    legacyPaths: ['/hablaya'],
    app: 'habla-ya',
    title: 'Habla ya',
    hubName: 'Habla ya',
    hubLine: 'Categoría, micrófono, votos de la mesa y nota de la IA.',
    hubCta: 'Jugar',
    tone: 'hablaya',
    group: 'hablar',
    loader: () => import('./games/hablaya/App'),
  },
  {
    path: '/cinco-letras',
    legacyPaths: ['/adivina'],
    app: 'cinco-letras',
    title: 'Cinco letras',
    hubName: 'Cinco letras',
    hubLine: 'Cinco letras, seis intentos. Palabra del día… cuando te apetezca.',
    hubCta: 'Jugar',
    tone: 'adivina',
    group: 'solo',
    loader: () => import('./games/adivina/App'),
  },
  {
    path: '/vende-humo',
    legacyPaths: ['/snakeoil'],
    app: 'vende-humo',
    title: 'Vende humo',
    hubName: 'Vende humo',
    hubLine: 'Pitch + objeción: vende absurdo y la IA te puntúa de 0 a 100.',
    hubCta: 'Jugar',
    tone: 'snakeoil',
    group: 'hablar',
    loader: () => import('./games/snakeoil/App'),
  },
] as const;

const routeByPath = new Map<string, PartyGameRoute>();
for (const game of partyGames) {
  routeByPath.set(game.path, game);
  for (const legacy of game.legacyPaths) {
    routeByPath.set(legacy, game);
  }
}

export function resolvePartyRoute(path: string): PartyGameRoute | undefined {
  return routeByPath.get(path);
}

/** Si la ruta es legada, devuelve la canónica para redirigir. */
export function canonicalPartyPath(path: string): string | null {
  const game = routeByPath.get(path);
  if (!game || game.path === path) return null;
  return game.path;
}

export const PWA_DESCRIPTION =
  'El Impostor, El Intruso, Pista y número, Bote de ideas, Café o té, Cinco letras, Vende humo, ¿Dónde estamos?, En la frente, Sin repetir y más.';

/** Rol impostor sin palabra (antes Mr White). */
export const IMPOSTOR_ROLE_LABEL = 'el impostor';
export const IMPOSTOR_ROLE_LABEL_TITLE = 'El impostor';
