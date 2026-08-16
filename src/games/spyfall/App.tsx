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
import { ConfigShell } from '../shared/ConfigShell';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { GameHome } from '../shared/GameHome';
import { MAX_PLAYERS, MIN_PLAYERS, type SpyfallPlayer } from './logic';
import { useSpyfall } from './useSpyfall';

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SpyfallApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useSpyfall();
  const { state } = game;
  const starterName = state.players.find((p) => p.id === state.startingPlayerId)?.name ?? null;

  if (state.screen === 'pass') {
    return (
      <ScreenShell screenKey="pass" bleed>
        <PassPhonePage />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'play' && state.screen !== 'names'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="Spyfall"
          emoji="🕵️"
          tagline="Un lugar secreto, preguntas incómodas y alguien que no está ahí."
          steps={[
            'Configura espías, roles y temporizador.',
            'Cada civil ve el lugar (y su rol); el espía improvisa.',
            'Preguntad, votad… o dejad que el espía adivine el sitio.',
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
            label="Espías"
            description="No conocen el lugar."
            value={state.config.spyCount}
            min={1}
            max={Math.max(1, state.config.playerCount - 1)}
            onChange={(spyCount) => game.updateConfig({ spyCount })}
          />
          <Toggle
            label="Asignar roles en el lugar"
            description="Cada civil recibe un oficio típico (médico, piloto…)."
            checked={state.config.assignRoles}
            onChange={(assignRoles) => game.updateConfig({ assignRoles })}
          />
          <Toggle
            label="Lista de lugares para espías"
            description="Los espías ven todos los lugares posibles al revelar."
            checked={state.config.spiesSeeLocations}
            onChange={(spiesSeeLocations) => game.updateConfig({ spiesSeeLocations })}
          />
          <NumberStepper
            label="Temporizador (min)"
            description="0 = sin tiempo. Opciones: 0, 5, 6, 8, 10."
            value={state.config.timerMinutes}
            min={0}
            max={10}
            options={[0, 5, 6, 8, 10]}
            onChange={(timerMinutes) => game.updateConfig({ timerMinutes })}
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
        <RevealSpyfall
          player={game.currentPlayer}
          playerIndex={state.currentPlayerIndex}
          totalPlayers={state.players.length}
          revealed={state.revealed}
          locationName={state.deal.locationName}
          locationNames={game.locationNames}
          spiesSeeLocations={state.config.spiesSeeLocations}
          onReveal={game.revealWord}
          onNext={game.passToNext}
        />
      )}

      {state.screen === 'ready' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-4xl">
              Todos listos
            </h1>
            <p className="mt-3 text-2xl font-semibold text-[var(--color-accent)]">¡A preguntar!</p>
          </header>
          <Card>
            {starterName ? (
              <div className="mb-6 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 px-4 py-5 text-center">
                <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Empieza preguntando
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
                  {starterName}
                </p>
              </div>
            ) : null}
            <p className="mb-8 text-center text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Haced preguntas sobre el lugar sin delataros. Luego votad al espía.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={game.beginPlay}>Empezar</Button>
              <Button variant="secondary" onClick={game.startDeal}>
                Nueva partida
              </Button>
              <Button variant="ghost" onClick={game.goConfig}>
                Cambiar configuración
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'play' && (
        <div className="flex flex-col gap-6">
          <header>
            <div className="flex items-center justify-between gap-3">
              <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                Ronda {state.currentRound}
              </p>
              {state.secondsLeft !== null ? (
                <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                  {formatTime(state.secondsLeft)}
                </p>
              ) : null}
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">Spyfall</h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Preguntad y eliminad sospechosos, o el espía puede declarar que adivinó el lugar.
            </p>
          </header>

          {state.lastElimination ? (
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {state.lastElimination.playerName}:{' '}
                {state.lastElimination.role === 'spy' ? 'era Espía' : 'era Civil'}
              </p>
              <button
                type="button"
                onClick={game.clearLastElimination}
                className="mt-3 min-h-11 underline-offset-2 hover:underline"
              >
                Cerrar
              </button>
            </div>
          ) : null}

          <Card padded={false}>
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">En juego</h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {state.players
                .filter((p) => p.eliminatedRound === null)
                .map((player) => (
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
                      onClick={() => game.eliminatePlayer(player.id)}
                    >
                      Acusar
                    </Button>
                  </li>
                ))}
            </ul>
          </Card>

          <div className="flex flex-col gap-3 pb-4">
            <Button variant="secondary" onClick={game.spyWinsByGuess}>
              El espía adivinó el lugar
            </Button>
            <Button variant="ghost" onClick={game.startDeal}>
              Nueva partida
            </Button>
            <Button variant="ghost" onClick={game.goConfig}>
              Cambiar configuración
            </Button>
          </div>
        </div>
      )}

      {state.screen === 'end' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)] sm:text-4xl">
              {state.endTitle}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.endSubtitle}
            </p>
          </header>
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

function RevealSpyfall({
  player,
  playerIndex,
  totalPlayers,
  revealed,
  locationName,
  locationNames,
  spiesSeeLocations,
  onReveal,
  onNext,
}: {
  player: SpyfallPlayer;
  playerIndex: number;
  totalPlayers: number;
  revealed: boolean;
  locationName: string;
  locationNames: string[];
  spiesSeeLocations: boolean;
  onReveal: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (revealed) vibrateReveal();
  }, [revealed]);

  const isLast = playerIndex >= totalPlayers - 1;
  const isSpy = player.role === 'spy';

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
      <Card className="min-h-[300px] flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="h"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full flex-col items-center gap-6"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-border)] text-4xl">
                ?
              </div>
              <Button onClick={onReveal}>Ver mi rol</Button>
            </motion.div>
          ) : (
            <motion.div
              key="s"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-full flex-col items-center gap-3"
            >
              {isSpy ? (
                <>
                  <span className="text-5xl" aria-hidden>
                    🕵️
                  </span>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
                    Eres el Espía
                  </h2>
                  <p className="max-w-xs text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                    No conoces el lugar. Averígualo con preguntas… o blufa.
                  </p>
                  {spiesSeeLocations ? (
                    <div className="mt-3 grid w-full grid-cols-2 gap-2 text-left">
                      {locationNames.map((name) => (
                        <div
                          key={name}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[length:var(--text-body-sm)]"
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Lugar
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold">{locationName}</h2>
                  {player.locationRole ? (
                    <>
                      <p className="mt-3 text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        Tu rol
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-accent)]">
                        {player.locationRole}
                      </p>
                    </>
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
