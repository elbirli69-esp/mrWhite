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
    imageAlt: 'Amigos riéndose juntos en una partida',
    tag: 'Impostores',
  },
  camaleon: {
    image: '/hub/camaleon.jpg',
    imageAlt: 'Camaleón escondido entre las hojas',
    tag: 'Impostores',
  },
  spyfall: {
    image: '/hub/spyfall.jpg',
    imageAlt: 'Vista desde la ventana de un avión',
    tag: 'Impostores',
  },
  fakeartist: {
    image: '/hub/fakeartist.jpg',
    imageAlt: 'Manos pintando y dibujando en grupo',
    tag: 'Impostores',
  },
  codigosecreto: {
    image: '/hub/codigosecreto.jpg',
    imageAlt: 'Partida de tablero con fichas y cartas',
    tag: 'Tablero',
  },
  headsup: {
    image: '/hub/headsup.jpg',
    imageAlt: 'Equipo celebrando y riendo en la oficina',
    tag: 'Pistas',
  },
  justone: {
    image: '/hub/justone.jpg',
    imageAlt: 'Post-its de colores con pistas escritas',
    tag: 'Pistas',
  },
  cafeote: {
    image: '/hub/cafeote.jpg',
    imageAlt: 'Cartel luminoso de cafetería con ambiente de bar',
    tag: 'Pistas',
  },
  unanimo: {
    image: '/hub/unanimo.jpg',
    imageAlt: 'Choque de puños entre compañeros de equipo',
    tag: 'Pistas',
  },
  papelitos: {
    image: '/hub/papelitos.jpg',
    imageAlt: 'Notas adhesivas listas para el bote',
    tag: 'Pistas',
  },
  hablaya: {
    image: '/hub/hablaya.jpg',
    imageAlt: 'Manos al aire en un concierto con micrófono',
    tag: 'Hablar',
  },
  adivina: {
    image: '/hub/adivina.jpg',
    imageAlt: 'Letras de madera formando palabras',
    tag: 'Solo',
  },
  snakeoil: {
    image: '/hub/snakeoil.jpg',
    imageAlt: 'Vendedor haciendo un pitch con gestos teatrales',
    tag: 'Hablar',
  },
  calm: {
    image: '/hub/calm.jpg',
    imageAlt: 'Persona haciendo yoga al aire libre',
    tag: 'Utilidad',
  },
  bulardo: {
    image: '/hub/bulardo.jpg',
    imageAlt: 'Montón de periódicos y titulares',
    tag: 'Utilidad',
  },
};

const defaultVisual: HubVisual = {
  image: '/hub/default.jpg',
  imageAlt: 'Mando de videojuegos iluminado',
  tag: 'Juego',
};

export function hubVisualFor(tone: string): HubVisual {
  return hubVisuals[tone] ?? defaultVisual;
}
