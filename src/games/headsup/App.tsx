import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';
import { useHeadsUp } from './useHeadsUp';

export default function HeadsUpApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useHeadsUp();
  const { state } = game;

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'names' && state.screen !== 'lobby' && state.screen !== 'play'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="Heads Up"
          emoji="📱"
          tagline="La palabra en la frente, el resto da pistas, el reloj corre."
          steps={[
            'Configura duración, skips y puntuación.',
            'Elige quién sostiene el móvil cada turno.',
            'Acierto o paso hasta que suene el tiempo.',
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
            label="Segundos por ronda"
            description="30, 45, 60 o 90."
            value={state.config.roundSeconds}
            min={30}
            max={90}
            options={[30, 45, 60, 90]}
            onChange={(roundSeconds) => game.updateConfig({ roundSeconds })}
          />
          <Toggle
            label="Permitir pasar"
            description="Botón para saltar una palabra sin sumar punto."
            checked={state.config.allowSkip}
            onChange={(allowSkip) => game.updateConfig({ allowSkip })}
          />
          <NumberStepper
            label="Puntos para ganar"
            description="0 = se juega un número fijo de turnos."
            value={state.config.winScore}
            min={0}
            max={50}
            onChange={(winScore) => game.updateConfig({ winScore })}
          />
          <NumberStepper
            label="Turnos del partido"
            description="Solo cuenta si puntos para ganar es 0."
            value={state.config.roundsPerMatch}
            min={1}
            max={30}
            onChange={(roundsPerMatch) => game.updateConfig({ roundsPerMatch })}
          />
        </ConfigShell>
      )}

      {state.screen === 'names' && (
        <NamesPage
          names={state.playerNames}
          error={game.namesError}
          onChangeName={game.updatePlayerName}
          onContinue={game.goLobby}
          onBack={game.goConfig}
        />
      )}

      {state.screen === 'lobby' && game.activePlayer && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Turno
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.activePlayer.name}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Coloca el móvil en la frente. Los demás dan pistas sin decir la palabra.
            </p>
          </header>

          <Card padded={false}>
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Marcador</h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {state.players.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-4">
                  <span className="font-semibold">{p.name}</span>
                  <span className="font-[family-name:var(--font-display)] text-xl text-[var(--color-accent)]">
                    {p.score}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex flex-col gap-3">
            <Button onClick={game.startRound}>Empezar ronda ({state.config.roundSeconds}s)</Button>
            <Button variant="ghost" onClick={game.goConfig}>
              Cambiar configuración
            </Button>
          </div>
        </div>
      )}

      {state.screen === 'play' && (
        <div className="flex min-h-[70dvh] flex-col gap-6">
          <div className="flex items-center justify-between">
            <p className="text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {game.activePlayer?.name}
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
              {state.secondsLeft}
            </p>
          </div>

          <Card className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Palabra
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold leading-tight sm:text-6xl">
              {game.currentWord}
            </h1>
            <p className="mt-6 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Aciertos {state.roundCorrect}
              {state.config.allowSkip ? ` · Pases ${state.roundSkipped}` : ''}
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button onClick={game.markCorrect}>¡Correcto!</Button>
            {state.config.allowSkip ? (
              <Button variant="secondary" onClick={game.markSkip}>
                Pasar
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {state.screen === 'roundEnd' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Fin de ronda</h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {game.activePlayer?.name} suma{' '}
              <span className="font-semibold text-[var(--color-accent)]">{state.roundCorrect}</span> puntos.
            </p>
          </header>
          <Card>
            <ul className="mb-6 space-y-3">
              {state.players.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="font-semibold text-[var(--color-accent)]">{p.score}</span>
                </li>
              ))}
            </ul>
            <Button onClick={game.nextTurn}>Siguiente jugador</Button>
          </Card>
        </div>
      )}

      {state.screen === 'matchEnd' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              {state.winnerIds.length > 1 ? 'Empate' : 'Ganador'}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.players
                .filter((p) => state.winnerIds.includes(p.id))
                .map((p) => p.name)
                .join(', ')}
            </p>
          </header>
          <Card>
            <ul className="mb-6 space-y-3">
              {[...state.players]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.name}</span>
                    <span className="font-semibold text-[var(--color-accent)]">{p.score}</span>
                  </li>
                ))}
            </ul>
            <div className="flex flex-col gap-3">
              <Button onClick={game.rematch}>Otra partida</Button>
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
