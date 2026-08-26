export interface HubVisual {
  /** Ruta pública en `/hub/*.jpg` (Unsplash, ver `public/hub/CREDITS.md`). */
  image: string;
  imageAlt: string;
  tag: string;
}

/** Decoración visual por tono de juego (clase CSS `hub-card--{tone}`). */
export const hubVisuals: Record<string, HubVisual> = {
  white: {
    image: '/hub/white.jpg',
    imageAlt: 'Máscaras y misterio en una fiesta',
    tag: 'Impostores',
  },
  camaleon: {
    image: '/hub/camaleon.jpg',
    imageAlt: 'Camaleón entre hojas verdes',
    tag: 'Impostores',
  },
  spyfall: {
    image: '/hub/spyfall.jpg',
    imageAlt: 'Mapa del mundo iluminado',
    tag: 'Impostores',
  },
  fakeartist: {
    image: '/hub/fakeartist.jpg',
    imageAlt: 'Paleta de pintura y pinceles',
    tag: 'Impostores',
  },
  codigosecreto: {
    image: '/hub/codigosecreto.jpg',
    imageAlt: 'Tablero de juego de mesa',
    tag: 'Tablero',
  },
  headsup: {
    image: '/hub/headsup.jpg',
    imageAlt: 'Persona usando el móvil',
    tag: 'Pistas',
  },
  justone: {
    image: '/hub/justone.jpg',
    imageAlt: 'Cuaderno abierto con bolígrafo',
    tag: 'Pistas',
  },
  cafeote: {
    image: '/hub/cafeote.jpg',
    imageAlt: 'Tazas de café sobre la mesa',
    tag: 'Pistas',
  },
  unanimo: {
    image: '/hub/unanimo.jpg',
    imageAlt: 'Grupo de amigos al aire libre',
    tag: 'Pistas',
  },
  papelitos: {
    image: '/hub/papelitos.jpg',
    imageAlt: 'Escritorio con cuaderno y bolígrafo',
    tag: 'Pistas',
  },
  hablaya: {
    image: '/hub/hablaya.jpg',
    imageAlt: 'Micrófono de estudio',
    tag: 'Hablar',
  },
  adivina: {
    image: '/hub/adivina.jpg',
    imageAlt: 'Bloques de letras de madera',
    tag: 'Solo',
  },
  snakeoil: {
    image: '/hub/snakeoil.jpg',
    imageAlt: 'Equipo en una reunión de trabajo',
    tag: 'Hablar',
  },
  calm: {
    image: '/hub/calm.jpg',
    imageAlt: 'Persona meditando al amanecer',
    tag: 'Utilidad',
  },
  bulardo: {
    image: '/hub/bulardo.jpg',
    imageAlt: 'Periódico sobre la mesa',
    tag: 'Utilidad',
  },
};

const defaultVisual: HubVisual = {
  image: '/hub/default.jpg',
  imageAlt: 'Mando de videojuegos',
  tag: 'Juego',
};

export function hubVisualFor(tone: string): HubVisual {
  return hubVisuals[tone] ?? defaultVisual;
}
