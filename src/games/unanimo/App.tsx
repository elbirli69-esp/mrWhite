import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { PassPhonePage } from '../../pages/PassPhonePage';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';
import { useUnanimo } from './useUnanimo';

export default function UnanimoApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useUnanimo();
  const { state } = game;

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
      centered={state.screen !== 'names' && state.screen !== 'entry' && state.screen !== 'results'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="Unánimo"
          emoji="🤝"
          tagline="No gana quien es más original: gana quien piensa como el grupo."
          steps={[
            'Sale un tema central.',
            'Cada uno escribe en secreto varias palabras asociadas.',
            'Sumáis puntos si coincidís con la mayoría.',
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
            label="Palabras por jugador"
            description="5, 6, 7, 8 o 10."
            value={state.config.wordsPerPlayer}
            min={5}
            max={10}
            options={[5, 6, 7, 8, 10]}
            onChange={(wordsPerPlayer) => game.updateConfig({ wordsPerPlayer })}
          />
          <NumberStepper
            label="Rondas"
            description="3, 5, 7 o 10."
            value={state.config.totalRounds}
            min={3}
            max={10}
            options={[3, 5, 7, 10]}
            onChange={(totalRounds) => game.updateConfig({ totalRounds })}
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
          onContinue={game.startMatch}
          onBack={game.goConfig}
        />
      )}

      {state.screen === 'roundIntro' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Ronda {state.round} / {state.config.totalRounds}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Tema
            </h1>
            <p className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold text-[var(--color-accent)]">
              {state.theme}
            </p>
            <p className="mt-4 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Escribid {state.config.wordsPerPlayer} palabras relacionadas. Buscad coincidencias, no
              rarezas.
            </p>
          </header>
          <Card>
            <Button onClick={game.beginEntry}>Empezar a escribir</Button>
          </Card>
        </div>
      )}

      {state.screen === 'entry' && game.currentEntryPlayer && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              {game.currentEntryPlayer.name} · {state.entryStep + 1}/{state.entryOrder.length}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Tema: {state.theme}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.config.wordsPerPlayer} palabras asociadas. En secreto.
            </p>
          </header>
          <Card>
            <div className="flex flex-col gap-3">
              {game.currentDraft.map((word, index) => (
                <input
                  key={index}
                  type="text"
                  value={word}
                  onChange={(e) => game.setDraftWord(index, e.target.value)}
                  maxLength={28}
                  autoComplete="off"
                  placeholder={`Palabra ${index + 1}`}
                  className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-xl outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
              ))}
            </div>
            <div className="mt-6">
              <Button
                onClick={game.submitEntry}
                disabled={game.currentDraft.some((w) => !w.trim())}
              >
                {state.entryStep >= state.entryOrder.length - 1
                  ? 'Ver resultados'
                  : 'Pasar al siguiente'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'results' && (
        <div className="flex flex-col gap-6">
          <header>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Coincidencias
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Tema «{state.theme}». Mayoría = 3 pts · 2+ = 1 pt · solo = 0.
            </p>
          </header>

          <Card padded={false}>
            <ul className="divide-y divide-[var(--color-border)]">
              {state.lastStats.slice(0, 20).map((stat) => (
                <li key={stat.word.toLowerCase()} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold">{stat.word}</p>
                    <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                      {stat.count} jugador{stat.count === 1 ? '' : 'es'}
                    </p>
                  </div>
                  <span className="font-[family-name:var(--font-display)] text-xl text-[var(--color-accent)]">
                    +{stat.points}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padded={false}>
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Puntos de la ronda
              </h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {state.players.map((p) => (
                <li key={p.id} className="flex justify-between px-5 py-4">
                  <span>{p.name}</span>
                  <span className="text-[var(--color-accent)]">
                    +{state.lastRoundPoints[p.id] ?? 0} · total {p.score}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Button onClick={game.nextRound}>
            {state.round >= state.config.totalRounds ? 'Ver ranking final' : 'Siguiente ronda'}
          </Button>
        </div>
      )}

      {state.screen === 'matchEnd' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              Ranking
            </h1>
          </header>
          <Card>
            <ul className="mb-6 space-y-3">
              {[...state.players]
                .sort((a, b) => b.score - a.score)
                .map((p, index) => (
                  <li key={p.id} className="flex justify-between">
                    <span>
                      {index + 1}. {p.name}
                    </span>
                    <span className="font-semibold text-[var(--color-accent)]">{p.score}</span>
                  </li>
                ))}
            </ul>
            <div className="flex flex-col gap-3">
              <Button onClick={game.startMatch}>Otra partida</Button>
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
