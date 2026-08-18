import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { PassPhonePage } from '../../pages/PassPhonePage';
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
    ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
    : 'border-sky-400/40 bg-sky-500/20 text-sky-100';
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
      return 'Asesino';
    default:
      return kind;
  }
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
  selectedId = null,
  onSelect,
  readable = false,
}: {
  cards: readonly BoardCard[];
  showKey: boolean;
  interactive: boolean;
  selectedId?: number | null;
  onSelect?: (cardId: number) => void;
  readable?: boolean;
}) {
  return (
    <div
      className="-mx-1 grid grid-cols-5 gap-1 sm:-mx-0 sm:gap-1.5"
      role="group"
      aria-label="Tablero de Código Secreto"
    >
      {cards.map((card) => {
        const canTap = interactive && !card.revealed && onSelect;
        const selected = selectedId === card.id;
        return (
          <button
            key={card.id}
            type="button"
            disabled={!canTap}
            onClick={() => onSelect?.(card.id)}
            aria-pressed={interactive ? selected : undefined}
            className={[
              'flex aspect-[5/6] w-full items-center justify-center rounded-lg border px-0.5 py-1 text-center font-semibold leading-snug tracking-tight break-words hyphens-auto sm:rounded-xl',
              wordTextClass(card.word, readable),
              cardTone(card.kind, card.revealed, showKey),
              selected
                ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-bg)] scale-[1.03] z-[1]'
                : '',
              canTap
                ? 'transition-transform active:scale-[0.97] hover:brightness-110'
                : 'cursor-default',
            ].join(' ')}
          >
            {card.word}
          </button>
        );
      })}
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
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  useEffect(() => {
    if (state.screen === 'reveal' && state.revealed) vibrateReveal();
  }, [state.screen, state.revealed]);

  useEffect(() => {
    setSelectedCardId(null);
  }, [state.screen, state.guessesLeft, state.activeTeam, state.clue?.word]);

  const selectedCard =
    selectedCardId !== null
      ? (state.deal?.cards.find((card) => card.id === selectedCardId) ?? null)
      : null;

  if (state.screen === 'pass' || state.screen === 'passClue') {
    return (
      <ScreenShell screenKey={state.screen} bleed>
        <PassPhonePage />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'names' && state.screen !== 'guess' && state.screen !== 'clue'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="Código Secreto"
          emoji="🔐"
          tagline="Pistas de una palabra, un número del 1 al 5 y un tablero de 25."
          steps={[
            'Formad dos equipos. Cada uno tiene un jefe de espías.',
            'El jefe da una pista y cuántas palabras (1–5) hay que tocar.',
            'Si tocáis el asesino, perdéis. Completad vuestras palabras para ganar.',
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
                    Solo {game.currentPlayer.name} debe mirar.
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
                      ? 'Listos'
                      : 'Siguiente jugador'}
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
              Empiezan los {teamLabel(state.deal.startingTeam)}. Pasad el móvil a su jefe de espías.
            </p>
          </header>
          <TeamList players={state.players} />
          <div className="flex flex-col gap-3">
            <Button onClick={game.beginPlay}>Empezar partida</Button>
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
              Mapa de colores abajo. Una palabra + número (1–5).
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
              <Button onClick={game.submitClue}>Dar pista</Button>
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
              Quedan {state.guessesLeft} toque{state.guessesLeft === 1 ? '' : 's'}. Elegid carta y
              confirmad.
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
              Última: «{state.lastGuessWord}»
              {state.lastGuessKind ? ` · ${kindLabel(state.lastGuessKind)}` : ''}
            </p>
          ) : null}

          <WordBoard
            cards={state.deal.cards}
            showKey={false}
            interactive
            selectedId={selectedCardId}
            onSelect={(id) => setSelectedCardId((prev) => (prev === id ? null : id))}
            readable={readableMode}
          />

          {selectedCard ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <p className="text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                ¿Revelar esta carta?
              </p>
              <p className="mt-1 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                {selectedCard.word}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    game.guessCard(selectedCard.id);
                    setSelectedCardId(null);
                  }}
                >
                  Confirmar
                </Button>
                <Button variant="ghost" onClick={() => setSelectedCardId(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={game.endTurnEarly}>
              Pasar turno
            </Button>
          )}
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
