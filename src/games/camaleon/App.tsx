import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { PassPhonePage } from '../../pages/PassPhonePage';
import { vibrateReveal } from '../../utils/game';
import { ConfigShell } from '../shared/ConfigShell';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { GameHome } from '../shared/GameHome';
import { MAX_PLAYERS, MIN_PLAYERS, type CamaleonPlayer } from './logic';
import { useCamaleon } from './useCamaleon';

function WordGrid({
  words,
  highlightIndex,
}: {
  words: readonly string[];
  highlightIndex: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {words.map((word, index) => {
        const active = highlightIndex === index;
        return (
          <div
            key={`${word}-${index}`}
            className={[
              'rounded-xl border px-2 py-3 text-center text-[length:var(--text-body-sm)] font-semibold',
              active
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]',
            ].join(' ')}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
}

export default function CamaleonApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useCamaleon();
  const { state } = game;
  const starterName =
    state.players.find((p) => p.id === state.startingPlayerId)?.name ?? null;

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
      centered={state.screen !== 'play' && state.screen !== 'names' && state.screen !== 'clues'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="El Intruso"
          emoji="🦎"
          tagline="Todos conocen la palabra… excepto el intruso. Dad pistas y pilladlo."
          steps={[
            'Configura jugadores, intrusos y si hay fase de pistas.',
            'Cada persona ve el tablero o solo la categoría, en secreto.',
            'Pistas, voto y, si quieres, el intruso puede adivinar la palabra.',
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
            description={`Entre ${MIN_PLAYERS} y ${MAX_PLAYERS}`}
            value={state.config.playerCount}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            onChange={(playerCount) => game.updateConfig({ playerCount })}
          />
          <NumberStepper
            label="Camaleones"
            description="No conocen la palabra secreta."
            value={state.config.chameleonCount}
            min={1}
            max={Math.max(1, state.config.playerCount - 1)}
            onChange={(chameleonCount) => game.updateConfig({ chameleonCount })}
          />
          <Toggle
            label="Mostrar tablero de 16 palabras"
            description="Los que conocen la palabra ven todas las opciones resaltando la secreta."
            checked={state.config.showWordGrid}
            onChange={(showWordGrid) => game.updateConfig({ showWordGrid })}
          />
          <Toggle
            label="Fase de pistas"
            description="Antes de votar, cada jugador escribe en secreto una palabra relacionada. Luego se muestran todas y se vota al intruso."
            checked={state.config.cluePhase}
            onChange={(cluePhase) => game.updateConfig({ cluePhase })}
          />
          <Toggle
            label="El intruso puede adivinar"
            description="Si lo pilláis, aún puede ganar acertando la palabra secreta."
            checked={state.config.chameleonCanGuess}
            onChange={(chameleonCanGuess) => game.updateConfig({ chameleonCanGuess })}
          />
          <AdultModeToggle
            checked={state.config.adultMode}
            onChange={(adultMode) => game.updateConfig({ adultMode })}
          />
        </ConfigShell>
      )}

      {state.screen === 'names' && (
        <NamesPage
          names={state.playerNames}
          error={game.namesError}
          onChangeName={game.updatePlayerName}
          onContinue={game.startDeal}
          onBack={game.goConfig}
        />
      )}

      {state.screen === 'reveal' && game.currentPlayer && state.deal && (
        <RevealCamaleon
          player={game.currentPlayer}
          playerIndex={state.currentPlayerIndex}
          totalPlayers={state.players.length}
          revealed={state.revealed}
          categoryName={state.deal.categoryName}
          words={state.deal.words}
          secretWord={state.deal.secretWord}
          secretIndex={state.deal.secretIndex}
          showWordGrid={state.config.showWordGrid}
          onReveal={game.revealWord}
          onNext={game.passToNext}
        />
      )}

      {state.screen === 'ready' && (
        <ReadyBlock
          starterName={starterName}
          body={
            state.config.cluePhase
              ? 'Dad pistas de una palabra por turnos. Luego votad al intruso.'
              : 'Hablad con cuidado y votad a quién creéis que es el intruso.'
          }
          onBegin={game.beginPlay}
          onNewGame={game.startDeal}
          onChangeConfig={game.goConfig}
        />
      )}

      {state.screen === 'clues' && game.cluePlayer && (
        <CluesPhase
          key={game.cluePlayer.id}
          player={game.cluePlayer}
          index={state.clueIndex}
          total={state.players.length}
          onChange={game.setClue}
          onNext={game.nextClue}
        />
      )}

      {state.screen === 'play' && (
        <PlayCamaleon
          players={state.players}
          currentRound={state.currentRound}
          lastElimination={state.lastElimination}
          starterName={starterName}
          showClues={state.config.cluePhase}
          onEliminate={game.eliminatePlayer}
          onDismiss={game.clearLastElimination}
          onNewGame={game.startDeal}
          onChangeConfig={game.goConfig}
        />
      )}

      {state.screen === 'guess' && (
        <GuessPhase
          value={state.guessInput}
          onChange={game.setGuessInput}
          onSubmit={game.submitGuess}
          onSkip={game.skipGuess}
        />
      )}

      {state.screen === 'end' && (
        <EndBlock
          title={state.endTitle}
          subtitle={state.endSubtitle}
          onNewGame={game.startDeal}
          onChangeConfig={game.goConfig}
        />
      )}
    </ScreenShell>
  );
}

function RevealCamaleon({
  player,
  playerIndex,
  totalPlayers,
  revealed,
  categoryName,
  words,
  secretWord,
  secretIndex,
  showWordGrid,
  onReveal,
  onNext,
}: {
  player: CamaleonPlayer;
  playerIndex: number;
  totalPlayers: number;
  revealed: boolean;
  categoryName: string;
  words: readonly string[];
  secretWord: string;
  secretIndex: number;
  showWordGrid: boolean;
  onReveal: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (revealed) vibrateReveal();
  }, [revealed]);

  const isLast = playerIndex >= totalPlayers - 1;
  const isChameleon = player.role === 'chameleon';

  return (
    <div className="flex flex-col gap-6">
      <p className="tracking-wide-label text-center text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Jugador {playerIndex + 1} de {totalPlayers}
      </p>
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
          {player.name}
        </h1>
        <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
          {revealed ? 'Memoriza y oculta la pantalla' : 'Solo tú debes ver esto'}
        </p>
      </header>

      <Card className="min-h-[300px] flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
              className="flex w-full flex-col items-center gap-6"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-4xl">
                ?
              </div>
              <Button onClick={onReveal}>Ver mi rol</Button>
            </motion.div>
          ) : (
            <motion.div
              key="shown"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-full flex-col items-center gap-4"
            >
              {isChameleon ? (
                <>
                  <span className="text-5xl" aria-hidden>
                    🦎
                  </span>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
                    Eres el intruso
                  </h2>
                  <p className="max-w-xs text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                    Categoría: <span className="text-[var(--color-text)]">{categoryName}</span>.
                    Improvisa pistas sin conocer la palabra.
                  </p>
                  {showWordGrid ? (
                    <div className="mt-2 w-full">
                      <WordGrid words={words} highlightIndex={null} />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    {categoryName}
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-5xl font-semibold text-[var(--color-text)]">
                    {secretWord}
                  </h2>
                  {showWordGrid ? (
                    <div className="mt-4 w-full">
                      <WordGrid words={words} highlightIndex={secretIndex} />
                    </div>
                  ) : null}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {revealed ? (
        <Button onClick={onNext}>{isLast ? 'Finalizar reparto' : 'Pasar al siguiente jugador'}</Button>
      ) : null}
    </div>
  );
}

function ReadyBlock({
  starterName,
  body,
  onBegin,
  onNewGame,
  onChangeConfig,
}: {
  starterName: string | null;
  body: string;
  onBegin: () => void;
  onNewGame: () => void;
  onChangeConfig: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-4xl">
          Todos listos
        </h1>
        <p className="mt-3 text-2xl font-semibold text-[var(--color-accent)]">¡Empieza la partida!</p>
      </header>
      <Card>
        {starterName ? (
          <div className="mb-6 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 px-4 py-5 text-center">
            <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Empieza
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              {starterName}
            </p>
          </div>
        ) : null}
        <p className="mb-8 text-center text-[length:var(--text-body)] text-[var(--color-text-muted)]">{body}</p>
        <div className="flex flex-col gap-3">
          <Button onClick={onBegin}>Empezar</Button>
          <Button variant="secondary" onClick={onNewGame}>
            Nueva partida
          </Button>
          <Button variant="ghost" onClick={onChangeConfig}>
            Cambiar configuración
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CluesPhase({
  player,
  index,
  total,
  onChange,
  onNext,
}: {
  player: CamaleonPlayer;
  index: number;
  total: number;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  /** Estado local para que el teclado móvil no pierda el foco al actualizar el store. */
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft('');
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [player.id]);

  const commit = (value: string) => {
    setDraft(value);
    onChange(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Pista {index + 1} / {total}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
          {player.name}
        </h1>
        <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
          Cada jugador da <span className="text-[var(--color-text)]">una sola palabra</span> ligada
          a la secreta (sin decirla). El intruso improvisa. Luego veréis todas las pistas y votaréis.
        </p>
      </header>
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.45)] sm:p-8">
        <label className="flex flex-col gap-2">
          <span className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-text-muted)]">
            Tu pista (una palabra)
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            enterKeyHint="done"
            value={draft}
            onChange={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) onNext();
            }}
            maxLength={32}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Ej. bigotes"
            className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/50 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
          />
        </label>
        <div className="mt-6">
          <Button onClick={onNext} disabled={!draft.trim()}>
            {index >= total - 1 ? 'Ir a la votación' : 'Pasar al siguiente'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlayCamaleon({
  players,
  currentRound,
  lastElimination,
  starterName,
  showClues,
  onEliminate,
  onDismiss,
  onNewGame,
  onChangeConfig,
}: {
  players: CamaleonPlayer[];
  currentRound: number;
  lastElimination: { playerName: string; role: string; round: number } | null;
  starterName: string | null;
  showClues: boolean;
  onEliminate: (id: number) => void;
  onDismiss: () => void;
  onNewGame: () => void;
  onChangeConfig: () => void;
}) {
  const alive = players.filter((p) => p.eliminatedRound === null);
  const canEliminate = alive.length > 1 && alive.some((p) => p.role === 'chameleon');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Ronda {currentRound}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">Votación</h1>
        <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
          Eliminad a quien creáis que es el intruso.
        </p>
        {starterName ? (
          <p className="mt-3 text-[length:var(--text-body)]">
            Empezó: <span className="font-semibold text-[var(--color-accent)]">{starterName}</span>
          </p>
        ) : null}
      </header>

      {lastElimination ? (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {lastElimination.playerName}:{' '}
            {lastElimination.role === 'chameleon' ? 'era el intruso' : 'era inocente'}
          </p>
          <button type="button" onClick={onDismiss} className="mt-3 min-h-11 underline-offset-2 hover:underline">
            Cerrar
          </button>
        </div>
      ) : null}

      {showClues ? (
        <Card padded={false}>
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Pistas</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="font-semibold">{p.name}</span>
                <span className="text-[var(--color-accent)]">{p.clue || '—'}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card padded={false}>
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            En juego ({alive.length})
          </h2>
        </div>
        <ul className="divide-y divide-[var(--color-border)]">
          {alive.map((player) => (
            <li
              key={player.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {player.name}
              </span>
              {canEliminate ? (
                <Button fullWidth={false} variant="danger" className="sm:min-w-[11rem]" onClick={() => onEliminate(player.id)}>
                  Acusar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-3 pb-4">
        <Button variant="secondary" onClick={onNewGame}>
          Nueva partida
        </Button>
        <Button variant="ghost" onClick={onChangeConfig}>
          Cambiar configuración
        </Button>
      </div>
    </div>
  );
}

function GuessPhase({
  value,
  onChange,
  onSubmit,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Adivina la palabra</h1>
        <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
          El intruso acusado puede intentar salvarse.
        </p>
      </header>
      <Card>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={40}
          autoComplete="off"
          placeholder="Palabra secreta"
          className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-2xl outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={onSubmit} disabled={!value.trim()}>
            Confirmar
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            No adivinar
          </Button>
        </div>
      </Card>
    </div>
  );
}

function EndBlock({
  title,
  subtitle,
  onNewGame,
  onChangeConfig,
}: {
  title: string;
  subtitle: string;
  onNewGame: () => void;
  onChangeConfig: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">{subtitle}</p>
      </header>
      <Card>
        <div className="flex flex-col gap-3">
          <Button onClick={onNewGame}>Nueva partida</Button>
          <Button variant="ghost" onClick={onChangeConfig}>
            Cambiar configuración
          </Button>
        </div>
      </Card>
    </div>
  );
}
