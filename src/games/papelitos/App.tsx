import { motion } from 'framer-motion';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import { categoriesForMode } from './data';
import {
  MAX_PACK_COUNT,
  MAX_PAPERS_PER_PLAYER,
  MAX_PLAYERS,
  MIN_PACK_COUNT,
  MIN_PAPERS_PER_PLAYER,
  MIN_PLAYERS,
  roundRules,
  roundTitle,
  teamLabel,
} from './logic';
import { usePapelitos } from './usePapelitos';

function Handoff({
  title,
  recipient,
  detail,
  warning,
  buttonLabel,
  onConfirm,
}: {
  title: string;
  recipient: string;
  detail?: string;
  warning: string;
  buttonLabel: string;
  onConfirm: () => void;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-black px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-md flex-col gap-5 text-center"
      >
        <p className="text-sm font-medium tracking-wide text-stone-400 uppercase">{title}</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
          {recipient}
        </h1>
        {detail ? <p className="text-lg text-stone-300">{detail}</p> : null}
        <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-4 text-left">
          <p className="text-[length:var(--text-body-sm)] leading-relaxed text-amber-100">{warning}</p>
        </div>
        <Button onClick={onConfirm}>{buttonLabel}</Button>
      </motion.div>
    </div>
  );
}

export default function PapelitosApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = usePapelitos();
  const { state } = game;
  const categories = categoriesForMode(state.config.adultMode);
  const nextWriter = state.players[state.writeIndex + 1] ?? null;

  if (state.screen === 'passWrite' && nextWriter) {
    return (
      <ScreenShell screenKey="passWrite" bleed>
        <Handoff
          title="Pasa el móvil a"
          recipient={nextWriter.name}
          detail={`Escribirá ${state.config.papersPerPlayer} papeles`}
          warning={`Solo ${nextWriter.name} debe mirar. El resto, apartad la vista.`}
          buttonLabel={`Soy ${nextWriter.name}`}
          onConfirm={game.confirmPassWrite}
        />
      </ScreenShell>
    );
  }

  if (state.screen === 'passTurn' && game.clueGiver) {
    return (
      <ScreenShell screenKey="passTurn" bleed>
        <Handoff
          title="Turno de pistas · pasa a"
          recipient={game.clueGiver.name}
          detail={`${teamLabel(state.activeTeam)} · ${roundTitle(game.roundKind)}`}
          warning={`Solo ${game.clueGiver.name} debe ver el papel. El equipo rival no mira la pantalla.`}
          buttonLabel={`Soy ${game.clueGiver.name} · ver papel`}
          onConfirm={game.confirmPassTurn}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'names' && state.screen !== 'write' && state.screen !== 'play'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="Bote de ideas"
          emoji="📝"
          tagline="Bote de papeles, tres rondas y el reloj en marcha."
          steps={[
            'Elige papeles de la mesa o un pack por categorías.',
            'Por equipos y a tiempo: describid, una palabra y mímica.',
            'Los mismos papeles se reutilizan. Gana quien más acierte.',
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
            description={`Entre ${MIN_PLAYERS} y ${MAX_PLAYERS}. Se parten en dos equipos.`}
            value={state.config.playerCount}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            onChange={(playerCount) => game.updateConfig({ playerCount })}
          />
          <NumberStepper
            label="Segundos por turno"
            description="30, 45, 60 o 90."
            value={state.config.turnSeconds}
            min={30}
            max={90}
            options={[30, 45, 60, 90]}
            onChange={(turnSeconds) => game.updateConfig({ turnSeconds })}
          />

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4">
            <p className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
              Origen de los papeles
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant={state.config.paperSource === 'pack' ? 'primary' : 'secondary'}
                onClick={() => game.updateConfig({ paperSource: 'pack' })}
              >
                Pack listo por categorías
              </Button>
              <Button
                variant={state.config.paperSource === 'table' ? 'primary' : 'secondary'}
                onClick={() => game.updateConfig({ paperSource: 'table' })}
              >
                Los escribe la mesa
              </Button>
            </div>
          </div>

          {state.config.paperSource === 'table' ? (
            <NumberStepper
              label="Papeles por jugador"
              description={`Cada persona escribe ${MIN_PAPERS_PER_PLAYER}–${MAX_PAPERS_PER_PLAYER}.`}
              value={state.config.papersPerPlayer}
              min={MIN_PAPERS_PER_PLAYER}
              max={MAX_PAPERS_PER_PLAYER}
              onChange={(papersPerPlayer) => game.updateConfig({ papersPerPlayer })}
            />
          ) : (
            <>
              <NumberStepper
                label="Papeles del pack"
                description={`Entre ${MIN_PACK_COUNT} y ${MAX_PACK_COUNT}.`}
                value={state.config.packCount}
                min={MIN_PACK_COUNT}
                max={MAX_PACK_COUNT}
                onChange={(packCount) => game.updateConfig({ packCount })}
              />
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4">
                <p className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
                  Categorías
                </p>
                <div className="flex flex-col gap-3">
                  {categories.map((cat) => (
                    <Toggle
                      key={cat.id}
                      label={cat.name}
                      description={`${cat.slips.length} papeles`}
                      checked={state.config.categoryIds.includes(cat.id)}
                      onChange={() => game.toggleCategory(cat.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <AdultModeToggle
            checked={state.config.adultMode}
            onChange={(adultMode) => game.updateConfig({ adultMode })}
          />
        </ConfigShell>
      )}

      {state.screen === 'names' && (
        <NamesPage
          names={state.playerNames}
          error={state.namesError}
          onChangeName={game.updatePlayerName}
          onContinue={game.startAfterNames}
          onBack={game.goConfig}
        />
      )}

      {state.screen === 'write' && game.writingPlayer && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-8">
          <header>
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {game.writingPlayer.name} · {state.writeIndex + 1}/{state.players.length}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Escribe tus papeles
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              Nombres, famosos, películas… lo que queráis. Sin repetir.
            </p>
          </header>
          <Card>
            <div className="flex flex-col gap-3">
              {(state.writeDrafts[game.writingPlayer.id] ?? []).map((value, index) => (
                <input
                  key={index}
                  value={value}
                  onChange={(e) => game.setWriteDraft(index, e.target.value)}
                  placeholder={`Papel ${index + 1}`}
                  className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
                />
              ))}
            </div>
            {state.writeError ? (
              <p className="mt-3 text-[length:var(--text-body-sm)] text-[var(--color-danger)]">
                {state.writeError}
              </p>
            ) : null}
            <div className="mt-5">
              <Button onClick={game.submitWrite}>Guardar papeles</Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'ready' && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Bote listo
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {state.allSlips.length} papeles · dos equipos · tres rondas
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {([0, 1] as const).map((team) => (
              <div
                key={team}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  {teamLabel(team)}
                </p>
                <ul className="mt-2 space-y-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                  {state.players
                    .filter((p) => p.team === team)
                    .map((p) => (
                      <li key={p.id}>{p.name}</li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          <Button onClick={game.beginRound}>Empezar ronda 1</Button>
          <Button variant="ghost" onClick={game.goConfig}>
            Cambiar configuración
          </Button>
        </div>
      )}

      {state.screen === 'roundIntro' && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 text-center">
          <header>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              {roundTitle(game.roundKind)}
            </h1>
            <p className="mt-3 text-[var(--color-text-muted)]">{roundRules(game.roundKind)}</p>
            <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Quedan {state.bowl.length} papeles en el bote.
            </p>
          </header>
          <Card>
            <p className="mb-4 text-[var(--color-text-muted)]">
              Empieza {teamLabel(state.activeTeam)}
              {game.clueGiver ? ` · da pistas ${game.clueGiver.name}` : ''}.
            </p>
            <Button onClick={game.startTurn}>Pasar el móvil al que da pistas</Button>
          </Card>
        </div>
      )}

      {state.screen === 'play' && state.currentSlip && game.clueGiver && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {teamLabel(state.activeTeam)} · {game.clueGiver.name}
            </p>
            <p
              className={[
                'font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums',
                state.secondsLeft <= 10 ? 'text-[var(--color-danger)]' : '',
              ].join(' ')}
            >
              {state.secondsLeft}s
            </p>
          </div>
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            {roundTitle(game.roundKind)} · quedan {state.bowl.length}
          </p>
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-10 text-center">
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">Papel</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
              {state.currentSlip.text}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={game.markCorrect}>Acertado</Button>
            <Button variant="secondary" onClick={game.markSkip}>
              Pasar papel
            </Button>
          </div>
          <p className="text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            Este turno: {state.turnCorrect} aciertos
            {state.turnSkipped ? ` · ${state.turnSkipped} pasados` : ''}
          </p>
        </div>
      )}

      {state.screen === 'turnEnd' && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 text-center">
          <header>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              {state.bowl.length === 0 ? 'Bote vacío' : 'Fin del turno'}
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {teamLabel(state.activeTeam)}: +{state.turnCorrect} en este turno
            </p>
          </header>
          <div className="grid grid-cols-2 gap-3">
            {([0, 1] as const).map((team) => (
              <div
                key={team}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4"
              >
                <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                  {teamLabel(team)}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
                  {state.scores[team]}
                </p>
              </div>
            ))}
          </div>
          <Button onClick={game.finishTurn}>
            {state.bowl.length === 0
              ? state.roundIndex >= 2
                ? 'Ver resultado final'
                : 'Siguiente ronda'
              : 'Siguiente equipo'}
          </Button>
        </div>
      )}

      {state.screen === 'matchEnd' && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 text-center">
          <header>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              {state.scores[0] === state.scores[1]
                ? 'Empate'
                : `Gana ${teamLabel(state.scores[0] > state.scores[1] ? 0 : 1)}`}
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {state.scores[0]} – {state.scores[1]}
            </p>
          </header>
          <Button onClick={game.newGame}>Nueva partida</Button>
          <Button variant="ghost" onClick={game.goConfig}>
            Cambiar configuración
          </Button>
          <Button variant="ghost" onClick={game.goHome}>
            Salir
          </Button>
        </div>
      )}
    </ScreenShell>
  );
}
