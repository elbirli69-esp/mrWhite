export interface HubVisual {
  emoji: string;
  tag: string;
}

/** Decoración visual por tono de juego (clase CSS `hub-choice--{tone}`). */
export const hubVisuals: Record<string, HubVisual> = {
  white: { emoji: '🕵️', tag: 'Impostores' },
  camaleon: { emoji: '🦎', tag: 'Impostores' },
  spyfall: { emoji: '🌍', tag: 'Impostores' },
  fakeartist: { emoji: '🎨', tag: 'Impostores' },
  codigosecreto: { emoji: '🎯', tag: 'Tablero' },
  headsup: { emoji: '📱', tag: 'Pistas' },
  justone: { emoji: '✍️', tag: 'Pistas' },
  cafeote: { emoji: '☕', tag: 'Pistas' },
  unanimo: { emoji: '🤝', tag: 'Pistas' },
  papelitos: { emoji: '📝', tag: 'Pistas' },
  hablaya: { emoji: '🎤', tag: 'Hablar' },
  adivina: { emoji: '🔤', tag: 'Solo' },
  snakeoil: { emoji: '💨', tag: 'Hablar' },
  calm: { emoji: '🧘', tag: 'Utilidad' },
  bulardo: { emoji: '📰', tag: 'Utilidad' },
};

export function hubVisualFor(tone: string): HubVisual {
  return hubVisuals[tone] ?? { emoji: '🎲', tag: 'Juego' };
}
