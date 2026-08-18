import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { vibrateReveal } from '../../utils/game';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import {
  BOARD_SIZE,
  MAX_CLUE_COUNT,
  MAX_PLAYERS,
  MIN_CLUE_COUNT,
  MIN_PLAYERS,
  cardTone,
  remainingForTeam,
  teamLabel,
  type BoardCard,
  type CardKind,
  type CodigoSecretoPlayer,
  type TeamColor,
} from './logic';
import { useCodigoSecreto } from './useCodigoSecreto';

function teamChipClass(team: TeamColor): string {
  return team === 'red'
    ? 'border-red-300 bg-red-600/80 text-white'
    : 'border-sky-200 bg-blue-600/80 text-white';
}

function kindLabel(kind: CardKind): string {
  switch (kind) {
    case 'red':
      return 'Rojo';
    case 'blue':
      return 'Azul';
    case 'neutral':
      return 'Neutral';
    case 'assassin':
      return 'Veneno';
    default:
      return kind;
  }
}

function resultBucketLabel(kind: CardKind, activeTeam: TeamColor): string {
  if (kind === 'assassin') return 'Veneno';
  if (kind === 'neutral') return 'Neutrales';
  if (kind === activeTeam) return `Vuestras (${teamLabel(activeTeam)})`;
  return `Del rival (${teamLabel(kind)})`;
}

/** Tipografía según longitud: las cortas ganan tamaño; las largas siguen cabiendo. */
function wordTextClass(word: string, readable: boolean): string {
  const len = word.replace(/\s+/g, '').length;
  if (readable) {
    if (len <= 7) return 'text-[clamp(0.82rem,3.6vw,1.05rem)]';
    if (len <= 10) return 'text-[clamp(0.72rem,3.1vw,0.95rem)]';
    if (len <= 13) return 'text-[clamp(0.64rem,2.7vw,0.85rem)]';
    return 'text-[clamp(0.56rem,2.3vw,0.75rem)]';
  }
  if (len <= 7) return 'text-[clamp(0.76rem,3.4vw,1rem)]';
  if (len <= 10) return 'text-[clamp(0.68rem,3vw,0.9rem)]';
  if (len <= 13) return 'text-[clamp(0.6rem,2.55vw,0.8rem)]';
  return 'text-[clamp(0.52rem,2.15vw,0.7rem)]';
}

function ScoreBoard({
  cards,
  startingTeam,
  activeTeam,
  compact = false,
}: {
  cards: readonly BoardCard[];
  startingTeam: TeamColor;
  activeTeam: TeamColor;
  compact?: boolean;
}) {
  const redNeed = remainingForTeam(cards, 'red');
  const blueNeed = remainingForTeam(cards, 'blue');
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['red', 'blue'] as const).map((team) => {
        const need = team === 'red' ? redNeed : blueNeed;
        const total = team === startingTeam ? 9 : 8;
        const active = activeTeam === team;
        return (
          <div
            key={team}
            className={[
              'rounded-2xl border',
              compact ? 'px-2.5 py-2' : 'px-3 py-3',
              teamChipClass(team),
              active ? 'ring-2 ring-[var(--color-accent)]/50' : '',
            ].join(' ')}
          >
            <p className={`opacity-80 ${compact ? 'text-xs' : 'text-[length:var(--text-body-sm)]'}`}>
              {teamLabel(team)}
              {team === startingTeam ? ' · empiezan' : ''}
              {active ? ' · turno' : ''}
            </p>
            <p
              className={[
                'font-[family-name:var(--font-display)] font-semibold',
                compact ? 'mt-0.5 text-xl' : 'mt-1 text-2xl',
              ].join(' ')}
            >
              {need}
              <span className="text-base font-medium opacity-70"> / {total}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

function WordBoard({
  cards,
  showKey,
  interactive,
  selectedIds = [],
  maxSelectable = 0,
  onToggle,
  readable = false,
}: {
  cards: readonly BoardCard[];
  showKey: boolean;
  interactive: boolean;
  selectedIds?: readonly number[];
  maxSelectable?: number;
  onToggle?: (cardId: number) => void;
  readable?: boolean;
}) {
  const selectedSet = new Set(selectedIds);
  return (
    <div
      className="-mx-1 grid grid-cols-5 gap-1 sm:-mx-0 sm:gap-1.5"
      role="group"
      aria-label="Tablero de Código Secreto"
    >
      {cards.map((card) => {
        const selected = selectedSet.has(card.id);
        const atCap = selectedIds.length >= maxSelectable && !selected;
        const canTap = interactive && !card.revealed && onToggle && !atCap;
        const canDeselect = interactive && !card.revealed && onToggle && selected;
        return (
          <button
            key={card.id}
            type="button"
            disabled={!canTap && !canDeselect}
            onClick={() => onToggle?.(card.id)}
            aria-pressed={interactive ? selected : undefined}
            className={[
              'relative flex aspect-[5/6] w-full items-center justify-center rounded-lg border px-0.5 py-1 text-center font-semibold leading-snug tracking-tight break-words hyphens-auto sm:rounded-xl',
              wordTextClass(card.word, readable),
              cardTone(card.kind, card.revealed, showKey),
              selected
                ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-bg)] scale-[1.03] z-[1]'
                : '',
              canTap || canDeselect
                ? 'transition-transform active:scale-[0.97] hover:brightness-110'
                : 'cursor-default',
              atCap && !selected ? 'opacity-55' : '',
            ].join(' ')}
          >
            {selected ? (
              <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[0.65rem] font-bold text-[var(--color-bg)]">
                {selectedIds.indexOf(card.id) + 1}
              </span>
            ) : null}
            {(card.revealed || showKey) && card.kind === 'assassin' ? (
              <span className="absolute right-0.5 top-0.5 rounded bg-black px-1 text-[0.55rem] font-bold tracking-wide text-yellow-300">
                ☠
              </span>
            ) : null}
            <span
              className={
                (card.revealed || showKey) && card.kind === 'assassin' ? 'font-black' : undefined
              }
            >
              {card.word}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HandoffScreen({
  title,
  recipient,
  roleLine,
  warning,
  buttonLabel,
  contextLine,
  onConfirm,
}: {
  title: string;
  recipient: string;
  roleLine?: string;
  warning: string;
  buttonLabel: string;
  contextLine?: string;
  onConfirm: () => void;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-black px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex w-full max-w-md flex-col gap-6 text-center"
      >
        <p className="text-sm font-medium tracking-wide text-stone-400 uppercase">{title}</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {recipient}
        </h1>
        {roleLine ? <p className="text-lg text-stone-300">{roleLine}</p> : null}
        {contextLine ? <p className="text-[length:var(--text-body-sm)] text-stone-400">{contextLine}</p> : null}
        <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-4 text-left">
          <p className="text-[length:var(--text-body-sm)] leading-relaxed text-amber-100">{warning}</p>
        </div>
        <Button onClick={onConfirm}>{buttonLabel}</Button>
      </motion.div>
    </div>
  );
}

function TeamList({ players }: { players: readonly CodigoSecretoPlayer[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['red', 'blue'] as const).map((team) => (
        <div key={team} className={`rounded-2xl border px-4 py-3 ${teamChipClass(team)}`}>
          <p className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            {teamLabel(team)}
          </p>
          <ul className="space-y-1 text-[length:var(--text-body-sm)]">
            {players
              .filter((p) => p.team === team)
              .map((p) => (
                <li key={p.id}>
                  {p.name}
                  {p.isSpymaster ? ' · jefe de espías' : ''}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function CodigoSecretoApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useCodigoSecreto();
  const { state } = game;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (state.screen === 'reveal' && state.revealed) vibrateReveal();
  }, [state.screen, state.revealed]);

  useEffect(() => {
    setSelectedIds([]);
  }, [state.screen, state.guessesLeft, state.activeTeam, state.clue?.word]);

  const selectedCards =
    state.deal?.cards.filter((card) => selectedIds.includes(card.id) && !card.revealed) ?? [];

  if (state.screen === 'pass' && game.nextRevealPlayer) {
    const next = game.nextRevealPlayer;
    return (
      <ScreenShell screenKey="pass" bleed>
        <HandoffScreen
          title="Pasa el móvil a"
          recipient={next.name}
          roleLine={`Jugador ${state.currentPlayerIndex + 2} de ${state.players.length}`}
          warning={`Solo ${next.name} debe mirar la pantalla. El resto, apartad la vista hasta que diga «listo».`}
          buttonLabel={`Soy ${next.name}`}
          onConfirm={game.confirmHandoff}
        />
      </ScreenShell>
    );
  }

  if (state.screen === 'passClue' && game.activeSpymaster) {
    const spy = game.activeSpymaster;
    const context =
      state.lastGuessWord != null
        ? `Última carta: «${state.lastGuessWord}»${state.lastGuessKind ? ` · ${kindLabel(state.lastGuessKind)}` : ''}. Turno de los ${teamLabel(state.activeTeam)}.`
        : `Empieza el turno de los ${teamLabel(state.activeTeam)}.`;
    return (
      <ScreenShell screenKey="passClue" bleed>
        <HandoffScreen
          title="Pasa el móvil a"
          recipient={spy.name}
          roleLine={`Jefe de espías · ${teamLabel(spy.team)}`}
          contextLine={context}
          warning={`No pulses todavía. Entrégaselo a ${spy.name}. En la siguiente pantalla sale el mapa de colores: si lo mira otra persona, se rompe la partida.`}
          buttonLabel={`Soy ${spy.name} · ver mapa`}
          onConfirm={game.confirmHandoff}
        />
      </ScreenShell>
    );
  }

  if (state.screen === 'passGuess' && state.clue) {
    return (
      <ScreenShell screenKey="passGuess" bleed>
        <HandoffScreen
          title="Ahora pásalo a la mesa"
          recipient={`Agentes · ${teamLabel(state.activeTeam)}`}
          roleLine={`Pista: «${state.clue.word}» · ${state.clue.count}`}
          contextLine={
            game.activeSpymaster
              ? `${game.activeSpymaster.name} (jefe) no debe tocar el móvil al adivinar.`
              : undefined
          }
          warning="El mapa de colores ya no se muestra. Dad el móvil a quien vaya a tocar las cartas. El jefe de espías puede mirar de lejos, pero no la pantalla de cerca. Ojo con el veneno."
          buttonLabel="Abrir tablero para adivinar"
          onConfirm={game.confirmHandoff}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={
        state.screen !== 'names' &&
        state.screen !== 'guess' &&
        state.screen !== 'guessResult' &&
        state.screen !== 'clue'
      }
    >
      {state.screen === 'home' && (
        <GameHome
          title="Código Secreto"
          emoji="🔐"
          tagline="Pistas de una palabra, un número del 1 al 5 y un tablero de 25."
          steps={[
            'Formad dos equipos. Cada uno tiene un jefe de espías.',
            'El jefe da una pista y cuántas palabras (1–5) hay que tocar.',
            'Si tocáis el veneno, perdéis. Completad vuestras palabras para ganar.',
          ]}
          readableMode={readableMode}
          onReadableModeChange={setReadableMode}
          onStart={game.goConfig}
        />
      )}

      {state.screen === 'config' && (
        <ConfigShell
          error={game.configValidation.error}
          canContinue={game.configValidation.valid}
          onBack={game.goHome}
          onContinue={game.goNames}
        >
          <NumberStepper
            label="Jugadores"
            description={`Entre ${MIN_PLAYERS} y ${MAX_PLAYERS}. Se parten en rojos y azules.`}
            value={state.config.playerCount}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            onChange={(playerCount) => game.updateConfig({ playerCount })}
          />
          <AdultModeToggle
            checked={state.config.adultMode}
            onChange={(adultMode) => game.updateConfig({ adultMode })}
          />
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            Tablero fijo de {BOARD_SIZE} palabras (5×5). El equipo que empieza tiene 9; el otro, 8.
            Cada pista lleva un número del {MIN_CLUE_COUNT} al {MAX_CLUE_COUNT}.
          </p>
        </ConfigShell>
      )}

      {state.screen === 'names' && (
        <NamesPage
          names={state.playerNames}
          error={state.namesError}
          onChangeName={game.updatePlayerName}
          onContinue={game.startDeal}
          onBack={game.goConfig}
        />
      )}

      {state.screen === 'reveal' && game.currentPlayer && (
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {game.currentPlayer.name} · {state.currentPlayerIndex + 1}/{state.players.length}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Tu rol
            </h1>
          </header>

          <Card>
            <AnimatePresence mode="wait">
              {!state.revealed ? (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-4"
                >
                  <p className="text-center text-[var(--color-text-muted)]">
                    Apartad la vista. Solo {game.currentPlayer.name} debe mirar y pulsar.
                  </p>
                  <Button onClick={game.revealRole}>Ver mi equipo</Button>
                </motion.div>
              ) : (
                <motion.div
                  key="shown"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-5"
                >
                  <div
                    className={`rounded-2xl border px-4 py-5 text-center ${teamChipClass(game.currentPlayer.team)}`}
                  >
                    <p className="text-[length:var(--text-body-sm)] opacity-80">Equipo</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
                      {teamLabel(game.currentPlayer.team)}
                    </p>
                    <p className="mt-3 text-[length:var(--text-body)]">
                      {game.currentPlayer.isSpymaster
                        ? 'Eres el jefe de espías: darás las pistas.'
                        : 'Eres agente de campo: tocáis las cartas.'}
                    </p>
                  </div>
                  <Button onClick={game.passToNext}>
                    {state.currentPlayerIndex >= state.players.length - 1
                      ? 'Listos · ver equipos'
                      : 'Ocultar y pasar el móvil'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      )}

      {state.screen === 'ready' && state.deal && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Equipos listos
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Empiezan los {teamLabel(state.deal.startingTeam)}. Al continuar, el móvil irá al jefe
              de espías de ese equipo (mapa de colores). No lo mires si no eres tú.
            </p>
          </header>
          <TeamList players={state.players} />
          <div className="flex flex-col gap-3">
            <Button onClick={game.beginPlay}>
              Pasar al jefe de {teamLabel(state.deal.startingTeam)}
            </Button>
            <Button variant="ghost" onClick={game.goConfig}>
              Cambiar configuración
            </Button>
          </div>
        </div>
      )}

      {state.screen === 'clue' && state.deal && game.activeSpymaster && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-8">
          <header>
            <p className={`inline-flex rounded-full border px-3 py-1 text-sm ${teamChipClass(state.activeTeam)}`}>
              Turno {teamLabel(state.activeTeam)}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold sm:text-3xl">
              Pista de {game.activeSpymaster.name}
            </h1>
            <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Solo {game.activeSpymaster.name} debe mirar este mapa. El resto, apartados.
            </p>
          </header>

          <ScoreBoard
            cards={state.deal.cards}
            startingTeam={state.deal.startingTeam}
            activeTeam={state.activeTeam}
            compact
          />

          <WordBoard cards={state.deal.cards} showKey interactive={false} readable={readableMode} />

          <Card>
            <label className="mb-2 block text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Palabra pista
            </label>
            <input
              value={state.clueDraft}
              onChange={(e) => game.setClueDraft(e.target.value)}
              placeholder="Una sola palabra"
              className="mb-4 h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <NumberStepper
              label="Palabras a adivinar"
              description="Cuántas cartas del tablero enlaza esta pista (1–5)."
              value={state.clueCount}
              min={MIN_CLUE_COUNT}
              max={MAX_CLUE_COUNT}
              onChange={game.setClueCount}
            />
            {state.clueError ? (
              <p className="mt-3 text-[length:var(--text-body-sm)] text-[var(--color-danger)]">
                {state.clueError}
              </p>
            ) : null}
            <div className="mt-5">
              <Button onClick={game.submitClue}>Dar pista y pasar a la mesa</Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'guess' && state.deal && state.clue && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`inline-flex rounded-full border px-3 py-1 text-sm ${teamChipClass(state.activeTeam)}`}>
                {teamLabel(state.activeTeam)}
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold sm:text-2xl">
                «{state.clue.word}» · {state.clue.count}
              </p>
            </div>
            <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Marcad hasta {state.guessesLeft} carta{state.guessesLeft === 1 ? '' : 's'} (en orden) y
              reveladlas. Si falláis, acaba el turno.
            </p>
          </header>

          <ScoreBoard
            cards={state.deal.cards}
            startingTeam={state.deal.startingTeam}
            activeTeam={state.activeTeam}
            compact
          />

          {state.lastGuessWord ? (
            <p className="text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Última revelada: «{state.lastGuessWord}»
              {state.lastGuessKind ? ` · ${kindLabel(state.lastGuessKind)}` : ''}
              {state.guessesLeft > 0 ? ` · aún podéis marcar ${state.guessesLeft}` : ''}
            </p>
          ) : null}

          <WordBoard
            cards={state.deal.cards}
            showKey={false}
            interactive={state.guessesLeft > 0}
            selectedIds={selectedIds}
            maxSelectable={state.guessesLeft}
            onToggle={(id) => {
              setSelectedIds((prev) => {
                if (prev.includes(id)) return prev.filter((x) => x !== id);
                if (prev.length >= state.guessesLeft) return prev;
                return [...prev, id];
              });
            }}
            readable={readableMode}
          />

          {selectedCards.length > 0 ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <p className="text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                {selectedCards.length} de {state.guessesLeft} seleccionada
                {selectedCards.length === 1 ? '' : 's'}
              </p>
              <p className="mt-2 text-center font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight leading-snug">
                {selectedCards.map((card) => card.word).join(' · ')}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    game.guessCards(selectedIds);
                    setSelectedIds([]);
                  }}
                >
                  Revelar {selectedCards.length} carta{selectedCards.length === 1 ? '' : 's'}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedIds([])}>
                  Quitar selección
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                Tocad las cartas del tablero para marcarlas. No hace falta usar las {state.guessesLeft}.
              </p>
              <Button variant="ghost" onClick={game.endTurnEarly}>
                Dejar de adivinar · pasar turno
              </Button>
            </div>
          )}
        </div>
      )}

      {state.screen === 'guessResult' && state.deal && state.guessResult && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              {state.guessResult.next.type === 'assassin'
                ? '¡Veneno!'
                : state.guessResult.next.type === 'win'
                  ? '¡Victoria!'
                  : 'Resultado'}
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {state.guessResult.next.type === 'assassin'
                ? `Tocasteis el veneno. Ganan los ${teamLabel(state.guessResult.next.winner)}.`
                : state.guessResult.next.type === 'win'
                  ? `Completasteis el tablero. Ganan los ${teamLabel(state.guessResult.next.winner)}.`
                  : state.guessResult.next.type === 'endTurn'
                    ? 'Esta ronda de pistas termina. Pasará el turno.'
                    : `Acertasteis. Aún podéis marcar ${state.guessResult.guessesLeft} más.`}
            </p>
          </header>

          <div className="flex flex-col gap-3">
            {(['own', 'rival', 'neutral', 'assassin'] as const).map((bucket) => {
              const items = state.guessResult!.items.filter((item) => {
                if (bucket === 'assassin') return item.kind === 'assassin';
                if (bucket === 'neutral') return item.kind === 'neutral';
                if (bucket === 'own') return item.kind === state.guessResult!.activeTeam;
                return item.kind === 'red' || item.kind === 'blue'
                  ? item.kind !== state.guessResult!.activeTeam
                  : false;
              });
              if (items.length === 0) return null;
              const sampleKind = items[0]!.kind;
              return (
                <div
                  key={bucket}
                  className={[
                    'rounded-2xl border px-4 py-3',
                    bucket === 'assassin'
                      ? 'border-yellow-300 bg-yellow-400/15'
                      : bucket === 'own'
                        ? teamChipClass(state.guessResult!.activeTeam)
                        : bucket === 'rival'
                          ? teamChipClass(
                              state.guessResult!.activeTeam === 'red' ? 'blue' : 'red',
                            )
                          : 'border-stone-400/40 bg-stone-500/15 text-stone-100',
                  ].join(' ')}
                >
                  <p className="text-[length:var(--text-body-sm)] font-semibold opacity-90">
                    {resultBucketLabel(sampleKind, state.guessResult!.activeTeam)}
                    {bucket === 'assassin' ? ' · fin de partida' : ''}
                  </p>
                  <ul className="mt-2 space-y-1 font-[family-name:var(--font-display)] text-xl font-semibold">
                    {items.map((item) => (
                      <li key={`${item.word}-${item.kind}`}>
                        {bucket === 'assassin' ? '☠ ' : ''}
                        {item.word}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <WordBoard cards={state.deal.cards} showKey interactive={false} readable={readableMode} />

          <Button onClick={game.dismissGuessResult}>
            {state.guessResult.next.type === 'continue'
              ? 'Seguir adivinando'
              : state.guessResult.next.type === 'endTurn'
                ? 'Pasar al otro equipo'
                : 'Ver final'}
          </Button>
        </div>
      )}

      {state.screen === 'end' && state.deal && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              {state.endTitle}
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">{state.endSubtitle}</p>
          </header>

          <WordBoard cards={state.deal.cards} showKey interactive={false} readable={readableMode} />

          <div className="flex flex-col gap-3">
            <Button onClick={game.newGame}>Nueva partida</Button>
            <Button variant="ghost" onClick={game.goConfig}>
              Cambiar configuración
            </Button>
            <Button variant="ghost" onClick={game.goHome}>
              Salir
            </Button>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
