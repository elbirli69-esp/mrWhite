/** Tipos del motor Snake Oil — preparados para multijugador sin acoplar a React/IA. */

export type PlayMode = 'solo';
/** classic/duel/chaos reservados para mesa; objection implica fase de negociación. */
export type GameMode = 'classic' | 'duel' | 'objection' | 'chaos';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type MatchFormat = 'quick' | 'full';

export interface Customer {
  id: string;
  name: string;
  description: string;
  personality: string;
  need: string;
  secretConcern: string;
  patience: number;
  skepticism: number;
  humor: number;
  emoji: string;
  /** Tags para emparejar palabras interesantes (no obligatorias). */
  tags: string[];
}

/** @deprecated alias de compat — usar Customer */
export type CustomerBrief = Customer;

export interface WordCard {
  word: string;
  tags: string[];
}

export type ObjectionKind =
  | 'price'
  | 'doubt'
  | 'logic'
  | 'fear'
  | 'comparison'
  | 'time'
  | 'trust'
  | 'identity'
  | 'side_effect'
  | 'absurd_literal'
  | 'contradiction'
  | 'status'
  | 'practicality'
  | 'emotion'
  | 'rival'
  | 'legality'
  | 'comfort'
  | 'surprise'
  | 'morality'
  | 'patience';

export interface ObjectionType {
  id: ObjectionKind;
  label: string;
  promptHint: string;
  minDifficulty: Difficulty;
}

export type TwistEventKind =
  | 'bad_news'
  | 'plot_twist'
  | 'price_shock'
  | 'angry_customer'
  | 'competitor'
  | 'time_pressure'
  | 'witness'
  | 'bug'
  | 'viral'
  | 'boss'
  | 'allergy'
  | 'shipping'
  | 'warranty'
  | 'moral'
  | 'memory'
  | 'language'
  | 'power'
  | 'rain'
  | 'mirror'
  | 'hungry'
  | 'lost_wallet'
  | 'influencer'
  | 'science'
  | 'curse'
  | 'gift'
  | 'countdown'
  | 'sibling'
  | 'review'
  | 'upgrade'
  | 'silence';

export interface TwistEvent {
  id: string;
  kind: TwistEventKind;
  title: string;
  body: string;
  /** Segundos sugeridos para reaccionar (el formato puede recortar). */
  reactionSeconds: number;
  minDifficulty: Difficulty;
}

export interface Player {
  id: string;
  name: string;
  /** Índice en mesa futura; en solo siempre 0. */
  seat: number;
}

export interface Product {
  name: string;
  words: string[];
}

export interface Pitch {
  transcript: string;
  durationSec: number;
}

export interface Objection {
  text: string;
  kind: ObjectionKind | 'freeform';
  turn: 1 | 2;
}

export interface ConversationTurn {
  role: 'player_pitch' | 'customer' | 'player_reply' | 'event' | 'player_event_reply';
  text: string;
}

export interface DimensionScores {
  persuasion: number;
  creativity: number;
  improvisation: number;
  coherence: number;
  humor: number;
  /** Adaptación al personaje (antes customerFit). */
  adaptation: number;
  defense: number;
}

export type BadgeId =
  | 'nato_seller'
  | 'improv_mind'
  | 'absurd_works'
  | 'actor'
  | 'no_escape'
  | 'nonsense'
  | 'combo_king'
  | 'closer'
  | 'poet'
  | 'survivor';

export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
}

export interface AiEvaluation {
  score: number;
  dimensions: DimensionScores;
  customerBuyProbability: number;
  strengths: string[];
  weaknesses: string[];
  bestMoment: string;
  funnyComment: string;
  customerVerdict: string;
  label: string;
  badges: BadgeId[];
  /** Estilo dominante que la IA considera ganador esta ronda. */
  winningStyle: 'persuasion' | 'creativity' | 'humor' | 'improvisation' | 'defense' | 'balanced';
}

export interface RoundDeal {
  customer: Customer;
  words: string[];
  event: TwistEvent | null;
  /** Si el formato completo fuerza segunda objeción por dificultad. */
  forceSecondObjection: boolean;
}

export interface Round {
  id: string;
  playerId: string;
  deal: RoundDeal;
  product: Product;
  pitch: Pitch | null;
  objections: Objection[];
  replies: string[];
  eventReply: string;
  conversation: ConversationTurn[];
  evaluation: AiEvaluation | null;
  comboBefore: number;
  comboAfter: number;
}

export interface Score {
  ai: number;
  humanVotesAvg: number | null;
  combined: number;
  comboMultiplier: number;
}

export interface SnakeOilConfig {
  playMode: PlayMode;
  gameMode: GameMode;
  difficulty: Difficulty;
  format: MatchFormat;
  wordCount: 2 | 3;
  pitchSeconds: number;
  replySeconds: number;
  enableObjection: boolean;
  adultMode: boolean;
}

export const DEFAULT_CONFIG: SnakeOilConfig = {
  playMode: 'solo',
  gameMode: 'objection',
  difficulty: 'normal',
  format: 'full',
  wordCount: 3,
  pitchSeconds: 60,
  replySeconds: 20,
  enableObjection: true,
  adultMode: false,
};

export type Screen =
  | 'home'
  | 'config'
  | 'deal'
  | 'product'
  | 'pitch'
  | 'customer'
  | 'reply'
  | 'event'
  | 'event_reply'
  | 'evaluating'
  | 'result'
  | 'badge_toast';

export interface PersistentStats {
  gamesPlayed: number;
  bestScore: number;
  totalScore: number;
  bestPersuasion: number;
  bestCreativity: number;
  bestImprovisation: number;
  bestHumor: number;
  bestBuyProbability: number;
  bestCombo: number;
  currentStreak: number;
  bestStreak: number;
  badges: BadgeId[];
  customersBeaten: string[];
}

export interface GameState {
  screen: Screen;
  config: SnakeOilConfig;
  players: Player[];
  activePlayerId: string;
  round: Round | null;
  stats: PersistentStats;
  combo: number;
  /** Insignias desbloqueadas en la ronda actual (mid-game). */
  liveBadges: Badge[];
  statusMessage: string | null;
  error: string | null;
  recording: boolean;
  secondsLeft: number;
  showAnalysis: boolean;
}
