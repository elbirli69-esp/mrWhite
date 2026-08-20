import { motion } from 'framer-motion';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import { WhisperDownloadBanner } from '../hablaya/WhisperDownloadBanner';
import { useWhisperPreload } from '../hablaya/useWhisperPreload';
import {
  OBJECTION_SECONDS_OPTIONS,
  PITCH_SECONDS_OPTIONS,
  WORD_COUNT_OPTIONS,
  customerHeadline,
} from './engine';
import type { AiEvaluation, DimensionScores } from './types';
import { useSnakeOil } from './useSnakeOil';

const DIM_LABELS: Array<{ key: keyof DimensionScores; label: string }> = [
  { key: 'persuasion', label: 'Persuasión' },
  { key: 'creativity', label: 'Creatividad' },
  { key: 'improvisation', label: 'Improvisación' },
  { key: 'coherence', label: 'Coherencia' },
  { key: 'humor', label: 'Humor' },
  { key: 'customerFit', label: 'Adaptación al cliente' },
  { key: 'objectionHandling', label: 'Objeciones' },
  { key: 'clarity', label: 'Claridad' },
  { key: 'originality', label: 'Originalidad' },
  { key: 'fluency', label: 'Fluidez' },
  { key: 'wordUse', label: 'Uso de palabras' },
];

function MicPulse({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="relative inline-flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
    </span>
  );
}

function ScoreHero({ evaluation }: { evaluation: AiEvaluation }) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="text-center"
    >
      <p className="font-[family-name:var(--font-display)] text-7xl font-bold tabular-nums text-[var(--color-accent)] sm:text-8xl">
        {evaluation.score}
        <span className="text-3xl text-[var(--color-text-muted)]">/100</span>
      </p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">
        {evaluation.label}
      </p>
      <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
        {evaluation.funnyComment}
      </p>
    </motion.div>
  );
}

export default function SnakeOilApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useSnakeOil();
  const { state } = game;
  const whisper = useWhisperPreload(true);
  const deal = state.deal;

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'config' && state.screen !== 'result'}
    >
      {state.screen === 'home' && (
        <>
          <GameHome
            title="Snake Oil"
            emoji="🐍"
            tagline="Inventa un producto absurdo, véndelo al micrófono y que el jurado-IA te ponga nota de concurso."
            steps={[
              'Whisper se descarga en el móvil (solo la primera vez).',
              'Recibes un cliente imposible y 2–3 palabras al azar.',
              'Pitch + objeción: la IA puntúa persuasión, humor e improvisación.',
            ]}
            readableMode={readableMode}
            onReadableModeChange={setReadableMode}
            onStart={game.goConfig}
            startDisabled={!whisper.ready}
            startLabel={
              whisper.status === 'loading'
                ? 'Espera: descargando Whisper…'
                : whisper.status === 'error'
                  ? 'Whisper no está listo'
                  : 'Configurar y jugar'
            }
            banner={
              <WhisperDownloadBanner
                status={whisper.status}
                progress={whisper.progress}
                message={whisper.message}
                error={whisper.error}
                onRetry={whisper.retry}
              />
            }
          />
          {state.stats.rounds > 0 ? (
            <p className="mt-4 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Rondas: {state.stats.rounds} · Mejor: {state.stats.bestScore}/100 · Media:{' '}
              {Math.round(state.stats.totalScore / state.stats.rounds)}
            </p>
          ) : null}
        </>
      )}

      {state.screen === 'config' && (
        <ConfigShell
          title="Modo solitario"
          description="MVP: tú vendes, la IA es cliente y jurado. El multijugador llega después sobre el mismo motor."
          error={game.configValidation.error}
          canContinue={game.configValidation.valid}
          continueLabel="Empezar ronda"
          onBack={game.goHome}
          onContinue={game.startRound}
        >
          <NumberStepper
            label="Palabras"
            description="2 o 3 piezas para inventar el producto."
            value={state.config.wordCount}
            min={2}
            max={3}
            options={[...WORD_COUNT_OPTIONS]}
            onChange={(wordCount) => game.updateConfig({ wordCount: wordCount as 2 | 3 })}
          />
          <NumberStepper
            label="Segundos de pitch"
            description="Tiempo para vender."
            value={state.config.pitchSeconds}
            min={45}
            max={60}
            options={[...PITCH_SECONDS_OPTIONS]}
            onChange={(pitchSeconds) => game.updateConfig({ pitchSeconds })}
          />
          <Toggle
            label="Fase de objeción"
            description="La IA te planta una pregunta y tienes 15–20 s para responder."
            checked={state.config.enableObjection}
            onChange={(enableObjection) => game.updateConfig({ enableObjection })}
          />
          {state.config.enableObjection ? (
            <NumberStepper
              label="Segundos de respuesta"
              description="Contra-reloj tras la objeción."
              value={state.config.objectionSeconds}
              min={15}
              max={20}
              options={[...OBJECTION_SECONDS_OPTIONS]}
              onChange={(objectionSeconds) => game.updateConfig({ objectionSeconds })}
            />
          ) : null}
          <AdultModeToggle
            checked={state.config.adultMode}
            onChange={(adultMode) => game.updateConfig({ adultMode })}
          />
        </ConfigShell>
      )}

      {state.screen === 'deal' && deal && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Cliente
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
              {customerHeadline(deal.customer)}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {deal.customer.need}
            </p>
          </header>

          <div>
            <p className="mb-3 text-center text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Tus palabras
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {deal.words.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.08 * i }}
                  className="rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 px-4 py-3 font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-[var(--color-accent)]"
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </div>

          <Button onClick={game.goProduct}>Inventar producto</Button>
        </div>
      )}

      {state.screen === 'product' && deal && (
        <div className="flex flex-col gap-6">
          <header>
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {customerHeadline(deal.customer)}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Nombra tu invento
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Combina {deal.words.join(' · ')}. Luego, al micrófono.
            </p>
          </header>
          <input
            type="text"
            value={state.productName}
            onChange={(e) => game.setProductName(e.target.value)}
            maxLength={80}
            className="min-h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 font-[family-name:var(--font-display)] text-xl font-semibold outline-none focus:border-[var(--color-accent)]"
          />
          <Button onClick={game.goPitch} disabled={!state.productName.trim()}>
            Subir al escenario
          </Button>
        </div>
      )}

      {state.screen === 'pitch' && deal && (
        <div className="flex flex-col gap-6 text-center">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Cliente · {customerHeadline(deal.customer)}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
              {state.productName}
            </h1>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {deal.words.map((w) => (
                <span
                  key={w}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm uppercase tracking-wide text-[var(--color-text-muted)]"
                >
                  {w}
                </span>
              ))}
            </div>
          </header>

          <Card className="flex flex-col items-center gap-3 py-10">
            <p className="font-[family-name:var(--font-display)] text-7xl font-bold tabular-nums">
              {state.secondsLeft}
            </p>
            <p className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              <MicPulse active={state.recording} />
              {state.recording ? 'HABLANDO…' : 'Listo cuando tú lo estés'}
            </p>
            {state.recording && state.pitchTranscript ? (
              <p className="max-h-28 overflow-y-auto px-2 text-left text-[length:var(--text-body-sm)] text-[var(--color-text)]">
                {state.pitchTranscript}
              </p>
            ) : null}
          </Card>

          {state.error ? (
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-danger)]">{state.error}</p>
          ) : null}

          {!state.recording ? (
            <Button onClick={() => void game.startRecording()}>🎙️ Empezar pitch</Button>
          ) : (
            <Button variant="danger" onClick={game.stopRecording}>
              Terminar ya
            </Button>
          )}
        </div>
      )}

      {state.screen === 'evaluating' && (
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="h-12 w-12 rounded-full border-4 border-[var(--color-accent)] border-t-transparent"
          />
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {state.statusMessage || 'Analizando…'}
          </p>
        </div>
      )}

      {state.screen === 'objection' && (
        <div className="flex flex-col gap-8 text-center">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Objeción del cliente
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug sm:text-3xl">
              “{state.objection}”
            </h1>
          </header>
          {state.error ? (
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              (Objeción de reserva · {state.error})
            </p>
          ) : null}
          <Button onClick={game.beginReply}>Responder ({state.config.objectionSeconds}s)</Button>
        </div>
      )}

      {state.screen === 'reply' && (
        <div className="flex flex-col gap-6 text-center">
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            “{state.objection}”
          </p>
          <Card className="flex flex-col items-center gap-3 py-10">
            <p className="font-[family-name:var(--font-display)] text-7xl font-bold tabular-nums">
              {state.secondsLeft}
            </p>
            <p className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              <MicPulse active={state.recording} />
              {state.recording ? 'DEFENDIENDO…' : 'Contraataque'}
            </p>
            {state.recording && state.replyTranscript ? (
              <p className="max-h-24 overflow-y-auto px-2 text-left text-[length:var(--text-body-sm)]">
                {state.replyTranscript}
              </p>
            ) : null}
          </Card>
          {!state.recording ? (
            <Button onClick={() => void game.startRecording()}>🎙️ Responder</Button>
          ) : (
            <Button variant="danger" onClick={game.stopRecording}>
              Listo
            </Button>
          )}
        </div>
      )}

      {state.screen === 'result' && (
        <div className="flex flex-col gap-8 pb-6">
          {state.evaluation ? (
            <>
              <ScoreHero evaluation={state.evaluation} />

              <Card>
                <p className="mb-4 font-[family-name:var(--font-display)] text-xl font-semibold">
                  Desglose
                </p>
                <ul className="flex flex-col gap-2">
                  {DIM_LABELS.map(({ key, label }) => {
                    const value = state.evaluation!.dimensions[key];
                    return (
                      <li key={key} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                          {label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full rounded-full bg-[var(--color-accent)]"
                          />
                        </div>
                        <span className="w-10 text-right font-semibold tabular-nums">{value}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Card>
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  Lo que ha funcionado
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                  {state.evaluation.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                {state.evaluation.bestMoment ? (
                  <p className="mt-4 text-[length:var(--text-body)] text-[var(--color-accent)]">
                    Mejor momento: {state.evaluation.bestMoment}
                  </p>
                ) : null}
                <p className="mt-6 font-[family-name:var(--font-display)] text-xl font-semibold">
                  Para el próximo pitch
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                  {state.evaluation.weaknesses.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Card>
            </>
          ) : (
            <Card>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                Sin nota esta vez
              </p>
              <p className="mt-2 text-[var(--color-danger)]">{state.error || 'Error desconocido'}</p>
            </Card>
          )}

          {state.stats.rounds > 0 ? (
            <Card>
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Estadísticas de la sesión
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold">{state.stats.bestScore}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Mejor venta</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{state.stats.bestCreativity}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Creatividad</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{state.stats.bestImprovisation}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Impro</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{state.stats.bestObjection}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Objeciones</p>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="flex flex-col gap-3">
            <Button onClick={game.startRound}>Otra ronda</Button>
            <Button variant="ghost" onClick={game.goConfig}>
              Configuración
            </Button>
            <Button variant="ghost" onClick={game.goHome}>
              Inicio
            </Button>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
