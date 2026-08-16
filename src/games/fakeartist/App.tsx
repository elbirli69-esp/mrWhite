import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { PassPhonePage } from '../../pages/PassPhonePage';
import { vibrateReveal } from '../../utils/game';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import { DrawCanvas } from './DrawCanvas';
import { MAX_PLAYERS, MIN_PLAYERS, type FakeArtistPlayer } from './logic';
import { useFakeArtist } from './useFakeArtist';

export default function FakeArtistApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useFakeArtist();
  const { state } = game;

  if (state.screen === 'pass') {
    return (
      <ScreenShell screenKey="pass" bleed>
        <PassPhonePage />
      </ScreenShell>
    );
  }

  if (state.screen === 'draw' && game.currentDrawer) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-[#111114] text-[var(--color-text)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Trazo {state.strokeIndex + 1}/{state.strokeOrder.length}
            </p>
            <h1 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold leading-tight">
              {game.currentDrawer.name}
            </h1>
          </div>
          <p className="shrink-0 text-right text-[length:var(--text-body-sm)] text-white/55">
            Un trazo continuo
          </p>
        </header>

        <div className="min-h-0 flex-1">
          <DrawCanvas
            strokes={state.strokes}
            currentPoints={state.currentPoints}
            onChangeCurrent={game.setCurrentPoints}
            enabled
          />
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[var(--color-bg)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <Button onClick={game.commitStroke} disabled={state.currentPoints.length < 2}>
            Confirmar trazo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'names' && state.screen !== 'vote'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="Fake Artist"
          emoji="🎨"
          tagline="Un dibujo colectivo… y alguien que no sabe qué se está pintando."
          steps={[
            'Configura artistas falsos y trazos por persona.',
            'Todos ven la palabra menos el falso.',
            'Un trazo cada uno, votad y (opcional) que el falso adivine.',
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
            label="Artistas falsos"
            description="No conocen la palabra y deben disimular con el trazo."
            value={state.config.fakerCount}
            min={1}
            max={Math.max(1, state.config.playerCount - 1)}
            onChange={(fakerCount) => game.updateConfig({ fakerCount })}
          />
          <NumberStepper
            label="Trazos por jugador"
            description="1, 2 o 3 pasadas por persona."
            value={state.config.strokesPerPlayer}
            min={1}
            max={3}
            options={[1, 2, 3]}
            onChange={(strokesPerPlayer) => game.updateConfig({ strokesPerPlayer })}
          />
          <Toggle
            label="El falso puede adivinar"
            description="Si lo pilláis, aún puede ganar acertando la palabra."
            checked={state.config.fakeCanGuess}
            onChange={(fakeCanGuess) => game.updateConfig({ fakeCanGuess })}
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

      {state.screen === 'reveal' && game.currentPlayer && (
        <RevealFake
          player={game.currentPlayer}
          playerIndex={state.currentPlayerIndex}
          totalPlayers={state.players.length}
          revealed={state.revealed}
          secretWord={state.secretWord}
          onReveal={game.revealWord}
          onNext={game.passToNext}
        />
      )}

      {state.screen === 'ready' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Dejad el móvil en el centro
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Cada uno añade un solo trazo cuando le toque. Sin levantar el dedo hasta terminar el
              trazo.
            </p>
          </header>
          <Card>
            <div className="flex flex-col gap-3">
              <Button onClick={game.beginDraw}>Empezar a dibujar</Button>
              <Button variant="ghost" onClick={game.goConfig}>
                Cambiar configuración
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'vote' && (
        <div className="flex flex-col gap-4">
          <header>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              ¿Quién es el falso?
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Mirad el dibujo y acusad.
            </p>
          </header>
          <div className="h-[min(78dvh,100%)] w-full overflow-hidden rounded-2xl">
            <DrawCanvas
              strokes={state.strokes}
              currentPoints={[]}
              onChangeCurrent={() => undefined}
              enabled={false}
            />
          </div>
          <Card padded={false}>
            <ul className="divide-y divide-[var(--color-border)]">
              {state.players.map((player) => (
                <li
                  key={player.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
                    {player.name}
                  </span>
                  <Button
                    fullWidth={false}
                    variant="danger"
                    className="sm:min-w-[11rem]"
                    onClick={() => game.accuse(player.id)}
                  >
                    Acusar
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {state.screen === 'guess' && (
        <div className="flex flex-col gap-6">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Adivina la palabra
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              El artista falso puede salvarse.
            </p>
          </header>
          <Card>
            <input
              type="text"
              value={state.guessInput}
              onChange={(e) => game.setGuessInput(e.target.value)}
              maxLength={40}
              autoComplete="off"
              placeholder="Palabra secreta"
              className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-2xl outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={game.submitGuess} disabled={!state.guessInput.trim()}>
                Confirmar
              </Button>
              <Button variant="ghost" onClick={game.skipGuess}>
                No adivinar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'end' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              {state.endTitle}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.endSubtitle}
            </p>
          </header>
          <div className="mx-auto h-[min(70dvh,100%)] w-full overflow-hidden rounded-2xl">
            <DrawCanvas
              strokes={state.strokes}
              currentPoints={[]}
              onChangeCurrent={() => undefined}
              enabled={false}
            />
          </div>
          <Card>
            <div className="flex flex-col gap-3">
              <Button onClick={game.startDeal}>Nueva partida</Button>
              <Button variant="ghost" onClick={game.goConfig}>
                Cambiar configuración
              </Button>
            </div>
          </Card>
        </div>
      )}
    </ScreenShell>
  );
}

function RevealFake({
  player,
  playerIndex,
  totalPlayers,
  revealed,
  secretWord,
  onReveal,
  onNext,
}: {
  player: FakeArtistPlayer;
  playerIndex: number;
  totalPlayers: number;
  revealed: boolean;
  secretWord: string;
  onReveal: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (revealed) vibrateReveal();
  }, [revealed]);

  const isLast = playerIndex >= totalPlayers - 1;
  const isFaker = player.role === 'faker';

  return (
    <div className="flex flex-col gap-6">
      <p className="text-center text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Jugador {playerIndex + 1} de {totalPlayers}
      </p>
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">{player.name}</h1>
        <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
          {revealed ? 'Memoriza y oculta la pantalla' : 'Solo tú debes ver esto'}
        </p>
      </header>
      <Card className="min-h-[280px] flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="h"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-border)] text-4xl">
                ?
              </div>
              <Button onClick={onReveal}>Ver mi rol</Button>
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
              {isFaker ? (
                <>
                  <span className="text-5xl" aria-hidden>
                    🎨
                  </span>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
                    Eres el artista falso
                  </h2>
                  <p className="mt-3 max-w-xs text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                    No tienes palabra. Improvisa trazos que parezcan del tema.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Palabra
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold">
                    {secretWord}
                  </h2>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      {revealed ? (
        <Button onClick={onNext}>{isLast ? 'Finalizar reparto' : 'Pasar al siguiente'}</Button>
      ) : null}
    </div>
  );
}
