import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { vibrateReveal } from '../../utils/game';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import {
  answerLabel,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PACK_OPTIONS,
  type BinaryPair,
  type PairAnswer,
} from './logic';
import { useCafeOTe } from './useCafeOTe';

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
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-black px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-md flex-col gap-6 text-center"
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

function AnswerButtons({
  pair,
  canWildcard,
  onAnswer,
}: {
  pair: BinaryPair;
  canWildcard: boolean;
  onAnswer: (answer: PairAnswer) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => onAnswer('left')}>
          {pair.left}
        </Button>
        <Button variant="secondary" onClick={() => onAnswer('right')}>
          {pair.right}
        </Button>
      </div>
      {canWildcard ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => onAnswer('both')}>
            Los dos
          </Button>
          <Button variant="ghost" onClick={() => onAnswer('neither')}>
            Ninguno
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PairAskPanel({
  pairs,
  canWildcard,
  onAnswer,
}: {
  pairs: BinaryPair[];
  canWildcard: boolean;
  onAnswer: (pair: BinaryPair, answer: PairAnswer) => void;
}) {
  const [active, setActive] = useState<BinaryPair | null>(null);

  if (active) {
    return (
      <Card>
        <p className="mb-1 text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          El pensador responde
        </p>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-semibold">
          ¿{active.left} o {active.right}?
        </h2>
        <AnswerButtons
          pair={active}
          canWildcard={canWildcard}
          onAnswer={(answer) => {
            onAnswer(active, answer);
            setActive(null);
          }}
        />
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setActive(null)}>
            Cancelar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mb-3 text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        Elige un par
      </p>
      <div className="flex flex-wrap gap-2">
        {pairs.map((pair) => (
          <button
            key={`${pair.left}-${pair.right}`}
            type="button"
            onClick={() => setActive(pair)}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left text-[length:var(--text-body-sm)] transition-colors hover:border-[var(--color-accent)]"
          >
            <span className="font-semibold">{pair.left}</span>
            <span className="text-[var(--color-text-muted)]"> · </span>
            <span className="font-semibold">{pair.right}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function CafeOTeApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useCafeOTe();
  const { state } = game;

  useEffect(() => {
    if (state.screen === 'thinkerReveal' && state.revealed) {
      vibrateReveal();
    }
  }, [state.screen, state.revealed]);

  if (state.screen === 'passToThinker' && game.thinker) {
    return (
      <ScreenShell screenKey="passToThinker" bleed>
        <Handoff
          title="Pasa el móvil a"
          recipient={game.thinker.name}
          detail="Verá la palabra secreta"
          warning={`Solo ${game.thinker.name} debe mirar. El resto, apartad la vista.`}
          buttonLabel={`Soy ${game.thinker.name}`}
          onConfirm={game.confirmThinker}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'names' && state.screen !== 'play'}
    >
      {state.screen === 'home' && (
        <GameHome
          title="Café o té"
          emoji="☕"
          tagline="Preguntas binarias, vibes y una palabra secreta en la mesa."
          steps={[
            'Un pensador ve la carta; el resto pregunta «¿café o té?».',
            'Las respuestas van al historial. Cuando lo tengáis, adivinad.',
            'Cooperáis: pocos fallos, más puntos.',
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
            description="5, 8 u 11."
            value={state.config.totalRounds}
            min={5}
            max={11}
            options={[5, 8, 11]}
            onChange={(totalRounds) => game.updateConfig({ totalRounds })}
          />
          <NumberStepper
            label="Preguntas máximas"
            description="Si se agotan sin acertar, la ronda se pierde."
            value={state.config.maxQuestions}
            min={8}
            max={15}
            options={[8, 10, 12, 15]}
            onChange={(maxQuestions) => game.updateConfig({ maxQuestions })}
          />
          <div>
            <p className="mb-2 text-[length:var(--text-body)] font-semibold">Pack de secretos</p>
            <p className="mb-3 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Qué tipo de carta ve el pensador.
            </p>
            <div className="flex flex-wrap gap-2">
              {PACK_OPTIONS.map((pack) => (
                <Button
                  key={pack.id}
                  variant={state.config.pack === pack.id ? 'primary' : 'secondary'}
                  onClick={() => game.updateConfig({ pack: pack.id })}
                >
                  {pack.label}
                </Button>
              ))}
            </div>
          </div>
          <Toggle
            label="Comodín (ambos / ninguno)"
            description="Una vez por ronda el pensador puede responder «los dos» o «ninguno»."
            checked={state.config.allowWildcard}
            onChange={(allowWildcard) => game.updateConfig({ allowWildcard })}
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

      {state.screen === 'roundIntro' && game.thinker && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Ronda {state.round} / {state.config.totalRounds}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Pensador: {game.thinker.name}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {game.thinker.name} verá la palabra. El resto preguntará pares y luego adivinará.
            </p>
            <p className="mt-4 text-[length:var(--text-body)]">
              Puntos:{' '}
              <span className="font-semibold text-[var(--color-accent)]">{state.score}</span>
            </p>
          </header>
          <Card>
            <div className="flex flex-col gap-3">
              <Button onClick={game.goPassToThinker}>Pasar al pensador</Button>
              <Button variant="ghost" onClick={game.goConfig}>
                Cambiar configuración
              </Button>
            </div>
          </Card>
        </div>
      )}

      {state.screen === 'thinkerReveal' && game.thinker && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Solo {game.thinker.name}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Tu palabra secreta
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Responde las preguntas como si fueras esto. No digas la palabra.
            </p>
          </header>
          <Card>
            {!state.revealed ? (
              <Button onClick={game.revealSecret}>Ver mi palabra</Button>
            ) : (
              <div className="flex flex-col gap-6">
                <p className="text-center font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--color-accent)] sm:text-5xl">
                  {state.secretWord}
                </p>
                <Button onClick={game.startTablePlay}>Listo · móvil al centro</Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {state.screen === 'play' && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Ronda {state.round} · {game.questionsLeft} preguntas
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Mesa abierta
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Preguntad pares. {game.thinker?.name ?? 'El pensador'} responde. Luego adivinad.
            </p>
          </header>

          <div className="flex gap-2">
            <Button
              variant={state.playMode === 'ask' ? 'primary' : 'secondary'}
              onClick={() => game.setPlayMode('ask')}
            >
              Preguntar
            </Button>
            <Button
              variant={state.playMode === 'guess' ? 'primary' : 'secondary'}
              onClick={() => game.setPlayMode('guess')}
            >
              Adivinar
            </Button>
          </div>

          {state.history.length > 0 ? (
            <Card padded={false}>
              <ul className="divide-y divide-[var(--color-border)]">
                {state.history.map((entry, index) => (
                  <li
                    key={`${entry.left}-${entry.right}-${index}`}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <span className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                      {entry.left} · {entry.right}
                    </span>
                    <span className="font-semibold text-[var(--color-accent)]">
                      {answerLabel(entry)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <p className="text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Aún no hay pistas. Empezad con un par.
            </p>
          )}

          {state.playMode === 'ask' ? (
            <>
              <PairAskPanel
                pairs={state.roundPairs.filter(
                  (pair) =>
                    !state.history.some(
                      (h) =>
                        h.left === pair.left &&
                        h.right === pair.right &&
                        (h.answer === 'left' || h.answer === 'right' || h.answer === 'both' || h.answer === 'neither'),
                    ),
                )}
                canWildcard={game.canWildcard}
                onAnswer={game.answerPreset}
              />
              <Card>
                <p className="mb-3 text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Par libre
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={state.customLeft}
                    onChange={(e) => game.setCustomLeft(e.target.value)}
                    maxLength={24}
                    autoComplete="off"
                    placeholder="Opción A"
                    className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                  <input
                    type="text"
                    value={state.customRight}
                    onChange={(e) => game.setCustomRight(e.target.value)}
                    maxLength={24}
                    autoComplete="off"
                    placeholder="Opción B"
                    className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                </div>
                <div className={`mt-4 ${game.customPairValid ? '' : 'pointer-events-none opacity-40'}`}>
                  <AnswerButtons
                    pair={{
                      left: state.customLeft.trim() || 'A',
                      right: state.customRight.trim() || 'B',
                    }}
                    canWildcard={game.canWildcard}
                    onAnswer={(answer) => {
                      if (!game.customPairValid) return;
                      game.submitCustomAnswer(answer);
                    }}
                  />
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <p className="mb-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                ¿Qué o quién es?
              </p>
              <input
                type="text"
                value={state.guessInput}
                onChange={(e) => game.setGuessInput(e.target.value)}
                maxLength={40}
                autoComplete="off"
                placeholder="Tu intento"
                className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-2xl outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
              />
              {state.missMessage ? (
                <p className="mt-3 text-[length:var(--text-body-sm)] text-[var(--color-danger)]">
                  {state.missMessage}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3">
                <Button onClick={game.submitGuess} disabled={!state.guessInput.trim()}>
                  Confirmar
                </Button>
                <Button variant="ghost" onClick={game.giveUp}>
                  Rendirse
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {state.screen === 'roundResult' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Fin de ronda
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold">
              {state.lastWon ? '¡Acertasteis!' : 'Se escapó'}
            </h1>
            <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              {state.secretWord}
            </p>
            <p className="mt-4 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.lastQuestions} pregunta{state.lastQuestions === 1 ? '' : 's'}
              {state.lastWon
                ? ` · +${state.lastPoints} punto${state.lastPoints === 1 ? '' : 's'}`
                : ''}
            </p>
            <p className="mt-2 text-[length:var(--text-body)]">
              Total:{' '}
              <span className="font-semibold text-[var(--color-accent)]">{state.score}</span>
            </p>
          </header>
          {state.history.length > 0 ? (
            <Card padded={false}>
              <ul className="divide-y divide-[var(--color-border)]">
                {state.history.map((entry, index) => (
                  <li
                    key={`res-${entry.left}-${entry.right}-${index}`}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <span className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                      {entry.left} · {entry.right}
                    </span>
                    <span className="font-semibold">{answerLabel(entry)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card>
            <Button onClick={game.nextRound}>
              {state.round >= state.config.totalRounds ? 'Ver resultado' : 'Siguiente ronda'}
            </Button>
          </Card>
        </div>
      )}

      {state.screen === 'matchEnd' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Partida terminada
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold">
              {state.score} punto{state.score === 1 ? '' : 's'}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.score >= state.config.totalRounds
                ? 'Mesa afinada. Casi telepáticos.'
                : state.score === 0
                  ? 'Hoy el café estaba muy cargado. Otra?'
                  : 'Buenas vibes. ¿Otra ronda?'}
            </p>
          </header>
          <Card>
            <div className="flex flex-col gap-3">
              <Button onClick={game.startMatch}>Jugar otra</Button>
              <Button variant="ghost" onClick={game.goHome}>
                Inicio
              </Button>
            </div>
          </Card>
        </div>
      )}
    </ScreenShell>
  );
}
