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
import { MAX_PLAYERS, MIN_PLAYERS } from './logic';
import { useJustOne } from './useJustOne';

export default function JustOneApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useJustOne();
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
      centered={
        state.screen !== 'names' &&
        state.screen !== 'clueEntry' &&
        state.screen !== 'clueReview'
      }
    >
      {state.screen === 'home' && (
        <GameHome
          title="Sin repetir"
          emoji="🧠"
          tagline="Una palabra, muchas pistas… y las repetidas se anulan."
          steps={[
            'Configura rondas y reglas de pistas duplicadas.',
            'El adivinador se aparta; el resto escribe una pista cada uno.',
            'Se tachan duplicados y el adivinador intenta acertar.',
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
            label="Rondas"
            description="5, 8, 11 o 13."
            value={state.config.totalRounds}
            min={5}
            max={13}
            options={[5, 8, 11, 13]}
            onChange={(totalRounds) => game.updateConfig({ totalRounds })}
          />
          <Toggle
            label="Anular pistas duplicadas"
            description="Si dos pistas son iguales (ignorando mayúsculas/acentos), ambas se eliminan."
            checked={state.config.removeDuplicates}
            onChange={(removeDuplicates) => game.updateConfig({ removeDuplicates })}
          />
          <Toggle
            label="Mostrar pistas anuladas"
            description="El adivinador ve las tachadas además de las válidas."
            checked={state.config.showInvalidClues}
            onChange={(showInvalidClues) => game.updateConfig({ showInvalidClues })}
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

      {state.screen === 'roundIntro' && game.guesser && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Ronda {state.round} / {state.config.totalRounds}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Adivina: {game.guesser.name}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {game.guesser.name} no debe mirar. El resto verá la palabra y escribirá pistas.
            </p>
            <p className="mt-4 text-[length:var(--text-body)]">
              Puntos: <span className="font-semibold text-[var(--color-accent)]">{state.score}</span>
            </p>
          </header>
          <Card>
            <div className="flex flex-col gap-3">
              <Button onClick={game.beginRound}>Empezar ronda</Button>
              <Button variant="ghost" onClick={game.goConfig}>
                Cambiar configuración
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'clueReveal' && game.currentClueGiver && (
        <ClueReveal
          playerName={game.currentClueGiver.name}
          step={state.clueStep}
          total={state.clueGiverOrder.length}
          secretWord={state.secretWord}
          revealed={state.revealed}
          onReveal={game.revealWord}
          onNext={() => {
            game.afterClueReveal();
          }}
        />
      )}

      {state.screen === 'clueEntry' && game.currentClueGiver && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Pista {state.clueStep + 1} / {state.clueGiverOrder.length}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.currentClueGiver.name}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Una sola palabra. No uses la secreta ni derivados obvios.
            </p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-accent)]">
              {state.secretWord}
            </p>
          </header>
          <Card>
            <input
              type="text"
              value={state.clues[state.clueStep] ?? ''}
              onChange={(e) => game.setClue(e.target.value)}
              maxLength={32}
              autoComplete="off"
              placeholder="Tu pista"
              className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-2xl outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <div className="mt-6">
              <Button onClick={game.submitClue} disabled={!(state.clues[state.clueStep] ?? '').trim()}>
                {state.clueStep >= state.clueGiverOrder.length - 1
                  ? 'Revisar pistas'
                  : 'Siguiente jugador'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'clueReview' && (
        <div className="flex flex-col gap-6">
          <header>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Pistas</h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Revisad antes de pasar el móvil al adivinador.
            </p>
          </header>
          <Card padded={false}>
            <ul className="divide-y divide-[var(--color-border)]">
              {game.evaluatedClues.map((clue, index) => (
                <li key={`${clue.text}-${index}`} className="flex items-center justify-between gap-3 px-5 py-4">
                  <span className={clue.valid ? 'font-semibold' : 'line-through text-[var(--color-text-muted)]'}>
                    {clue.text || '—'}
                  </span>
                  <span className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                    {clue.valid ? 'Válida' : 'Anulada'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Button onClick={game.goGuess}>Pasar al adivinador</Button>
        </div>
      )}

      {state.screen === 'guess' && game.guesser && (
        <div className="flex flex-col gap-6">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.guesser.name}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Estas son las pistas. ¿Cuál es la palabra?
            </p>
          </header>
          <Card>
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {game.evaluatedClues
                .filter((c) => c.valid || state.config.showInvalidClues)
                .map((clue, index) => (
                  <span
                    key={`${clue.text}-${index}`}
                    className={[
                      'rounded-xl border px-3 py-2 font-[family-name:var(--font-display)] text-xl font-semibold',
                      clue.valid
                        ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-text)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] line-through',
                    ].join(' ')}
                  >
                    {clue.text}
                  </span>
                ))}
              {game.evaluatedClues.every((c) => !c.valid) ? (
                <p className="text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                  No quedan pistas válidas. Podéis pasar.
                </p>
              ) : null}
            </div>
            <input
              type="text"
              value={state.guessInput}
              onChange={(e) => game.setGuessInput(e.target.value)}
              maxLength={40}
              autoComplete="off"
              placeholder="Tu respuesta"
              className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-2xl outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={game.submitGuess} disabled={!state.guessInput.trim()}>
                Confirmar
              </Button>
              <Button variant="ghost" onClick={game.skipGuess}>
                Pasar ronda
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'roundResult' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              {state.lastCorrect ? '¡Correcto!' : 'Fallaste'}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              La palabra era <span className="font-semibold text-[var(--color-text)]">{state.secretWord}</span>
            </p>
            <p className="mt-2 text-[length:var(--text-body)]">
              Marcador: {state.score} / {state.round}
            </p>
          </header>
          <Card>
            <Button onClick={game.nextRound}>
              {state.round >= state.config.totalRounds ? 'Ver resultado final' : 'Siguiente ronda'}
            </Button>
          </Card>
        </div>
      )}

      {state.screen === 'matchEnd' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              Fin de partida
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Habéis acertado{' '}
              <span className="font-semibold text-[var(--color-text)]">
                {state.score} de {state.config.totalRounds}
              </span>
            </p>
          </header>
          <Card>
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

function ClueReveal({
  playerName,
  step,
  total,
  secretWord,
  revealed,
  onReveal,
  onNext,
}: {
  playerName: string;
  step: number;
  total: number;
  secretWord: string;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (revealed) vibrateReveal();
  }, [revealed]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-center text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Pistero {step + 1} de {total}
      </p>
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">{playerName}</h1>
        <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
          {revealed ? 'Memoriza la palabra' : 'Solo tú debes ver la palabra'}
        </p>
      </header>
      <Card className="min-h-[260px] flex flex-col items-center justify-center text-center">
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
              <Button onClick={onReveal}>Ver la palabra</Button>
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Palabra secreta
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold">{secretWord}</h2>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      {revealed ? <Button onClick={onNext}>Escribir mi pista</Button> : null}
    </div>
  );
}
