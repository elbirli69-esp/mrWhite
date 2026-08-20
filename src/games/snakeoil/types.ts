/** Tipos del motor Snake Oil (independientes de React y del proveedor de IA). */

export type GameMode = 'classic' | 'duel' | 'objection' | 'chaos';

/** MVP: solo practice. Multijugador llega después sobre el mismo engine. */
export type PlayMode = 'solo';

export interface CustomerBrief {
  id: string;
  /** Título corto p. ej. "Astronauta" */
  title: string;
  /** Necesidad / situación absurda completa */
  need: string;
  emoji: string;
}

export interface SnakeOilConfig {
  playMode: PlayMode;
  /** Modos de reglas (duelo/caos reservados; MVP usa classic u objection). */
  gameMode: GameMode;
  wordCount: 2 | 3;
  pitchSeconds: number;
  objectionSeconds: number;
  /** Si false, salta la fase de objeción. */
  enableObjection: boolean;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: SnakeOilConfig = {
  playMode: 'solo',
  gameMode: 'classic',
  wordCount: 3,
  pitchSeconds: 45,
  objectionSeconds: 20,
  enableObjection: true,
  adultMode: false,
};

export type Screen =
  | 'home'
  | 'config'
  | 'deal'
  | 'product'
  | 'pitch'
  | 'objection'
  | 'reply'
  | 'evaluating'
  | 'result';

export interface DimensionScores {
  persuasion: number;
  creativity: number;
  improvisation: number;
  coherence: number;
  humor: number;
  customerFit: number;
  objectionHandling: number;
  clarity: number;
  originality: number;
  fluency: number;
  wordUse: number;
}

export interface AiEvaluation {
  score: number;
  dimensions: DimensionScores;
  strengths: string[];
  weaknesses: string[];
  bestMoment: string;
  funnyComment: string;
  label: string;
}

export interface RoundDeal {
  customer: CustomerBrief;
  words: string[];
}

export interface RoundRecord {
  deal: RoundDeal;
  productName: string;
  pitchTranscript: string;
  objection: string;
  replyTranscript: string;
  evaluation: AiEvaluation | null;
}
