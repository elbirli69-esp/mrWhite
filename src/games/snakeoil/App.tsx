import { AnimatePresence, motion } from 'framer-motion';
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
  BADGE_CATALOG,
  PRIMARY_DIMS,
  WORD_COUNT_OPTIONS,
  customerHeadline,
  difficultyLabel,
} from './engine';
import type { AiEvaluation, Badge, Difficulty, MatchFormat } from './types';
import { useSnakeOil } from './useSnakeOil';

function MicPulse({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="relative inline-flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
    </span>
  );
}

function ComboBanner({ combo }: { combo: number }) {
  if (combo < 2) return null;
  return (
    <motion.p
      initial={{ y: -8, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      className="text-center font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-accent)]"
    >
      🔥 COMBO ×{combo}
    </motion.p>
  );
}

function LiveBadges({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <AnimatePresence>
        {badges.map((b) => (
          <motion.span
            key={b.id}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 px-3 py-1 text-sm font-semibold"
          >
            {b.emoji} {b.title}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function DimBar({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.45 }}
          className="h-full rounded-full bg-[var(--color-accent)]"
        />
      </div>
      <span className="w-8 text-right font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function ResultCard({
  evaluation,
  productName,
  showAnalysis,
  onToggleAnalysis,
  combo,
}: {
  evaluation: AiEvaluation;
  productName: string;
  showAnalysis: boolean;
  onToggleAnalysis: () => void;
  combo: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="text-center"
      >
        <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          🧪 Resultado del experimento
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{productName}</h2>
        <p className="mt-4 font-[family-name:var(--font-display)] text-7xl font-bold tabular-nums text-[var(--color-accent)] sm:text-8xl">
          {evaluation.score}
          <span className="text-3xl text-[var(--color-text-muted)]">/100</span>
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">
          {evaluation.label}
        </p>
        <p className="mx-auto mt-3 max-w-md text-[length:var(--text-body)] text-[var(--color-text-muted)]">
          {evaluation.funnyComment}
        </p>
        <ComboBanner combo={combo} />
      </motion.div>

      <Card>
        <p className="mb-3 text-center text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          💰 Probabilidad de compra
        </p>
        <p className="text-center font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums">
          {evaluation.customerBuyProbability}
          <span className="text-2xl text-[var(--color-text-muted)]">%</span>
        </p>
      </Card>

      <ul className="flex flex-col gap-2">
        {PRIMARY_DIMS.map(({ key, label }) => (
          <DimBar key={key} label={label} value={evaluation.dimensions[key]} />
        ))}
      </ul>

      {evaluation.badges.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {evaluation.badges.map((id) => {
            const b = BADGE_CATALOG[id];
            if (!b) return null;
            return (
              <span
                key={id}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
                title={b.description}
              >
                {b.emoji} {b.title}
              </span>
            );
          })}
        </div>
      ) : null}

      <Card>
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold">🎤 Mejor momento</p>
        <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
          {evaluation.bestMoment}
        </p>
        <p className="mt-5 font-[family-name:var(--font-display)] text-lg font-semibold">
          🤖 Veredicto del cliente
        </p>
        <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-accent)]">
          “{evaluation.customerVerdict}”
        </p>
      </Card>

      <Button variant="ghost" onClick={onToggleAnalysis}>
        {showAnalysis ? 'Ocultar análisis' : 'Ver análisis'}
      </Button>

      {showAnalysis ? (
        <Card>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold">Lo bueno</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            {evaluation.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold">
            Para la próxima
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            {evaluation.weaknesses.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-4 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            Estilo ganador: {evaluation.winningStyle}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function FormatButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold">{title}</p>
      <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">{subtitle}</p>
    </button>
  );
}

function DifficultyRow({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) {
  const opts: Difficulty[] = ['easy', 'normal', 'hard'];
  return (
    <div className="flex gap-2">
      {opts.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`min-h-[var(--touch-min)] flex-1 rounded-xl border px-2 font-semibold ${
            value === d
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
              : 'border-[var(--color-border)]'
          }`}
        >
          {difficultyLabel(d)}
        </button>
      ))}
    </div>
  );
}

export default function SnakeOilApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useSnakeOil();
  const { state } = game;
  const whisper = useWhisperPreload(true);
  const deal = state.round?.deal;
  const productName = state.round?.product.name ?? '';
  const avg =
    state.stats.gamesPlayed > 0
      ? Math.round(state.stats.totalScore / state.stats.gamesPlayed)
      : 0;

  return (
    <ScreenShell
      screenKey={state.screen}
      centered={state.screen !== 'config' && state.screen !== 'result'}
    >
      {state.screen === 'home' && (
        <div className="flex flex-col gap-6">
          <GameHome
            title="Snake Oil"
            emoji="🐍"
            tagline="Vende un invento absurdo a un cliente imposible. Improvisa. Cierra. Otra partida."
            steps={[
              'Whisper se descarga la primera vez.',
              'Elige modo rápido o completo y una dificultad.',
              'Pitch → cliente en personaje → objeciones, giros y nota con probabilidad de compra.',
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
                  : 'Jugar'
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

          {state.stats.gamesPlayed > 0 ? (
            <Card>
              <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold">{state.stats.currentStreak || '—'}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">🔥 Racha</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{state.stats.bestScore}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">🏆 Mejor</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{state.stats.bestPersuasion}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">💰 Vendedor</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{state.stats.bestImprovisation}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">🧠 Impro</p>
                </div>
              </div>
              <p className="mt-3 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                {state.stats.gamesPlayed} partidas · media {avg} · combo máx ×{state.stats.bestCombo || 1}
              </p>
            </Card>
          ) : null}
          <ComboBanner combo={state.combo} />
        </div>
      )}

      {state.screen === 'config' && (
        <ConfigShell
          title="Prepara la venta"
          description="Solitario por ahora. El motor ya separa Player / Round / Evaluation para multi más adelante."
          error={game.configValidation.error}
          canContinue={game.configValidation.valid}
          continueLabel="Empezar"
          onBack={game.goHome}
          onContinue={game.startRound}
        >
          <div className="flex flex-col gap-2">
            <p className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-text-muted)]">
              Formato
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <FormatButton
                active={state.config.format === 'quick'}
                title="⚡ Partida rápida"
                subtitle="~3 min · pitch 30s · objeción · resultado"
                onClick={() => game.updateConfig({ format: 'quick' as MatchFormat })}
              />
              <FormatButton
                active={state.config.format === 'full'}
                title="🎤 Modo completo"
                subtitle="Pitch 60s · objeción · evento · resultado"
                onClick={() => game.updateConfig({ format: 'full' as MatchFormat })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-text-muted)]">
              Dificultad
            </p>
            <DifficultyRow
              value={state.config.difficulty}
              onChange={(difficulty) => game.updateConfig({ difficulty })}
            />
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {state.config.difficulty === 'easy' && 'Cliente comprensivo. Objeciones sencillas.'}
              {state.config.difficulty === 'normal' && 'Cliente escéptico. Preguntas razonables.'}
              {state.config.difficulty === 'hard' &&
                'Cliente exigente. Contradicciones y giros inesperados.'}
            </p>
          </div>

          <NumberStepper
            label="Palabras"
            description="2 o 3 piezas para inventar el producto."
            value={state.config.wordCount}
            min={2}
            max={3}
            options={[...WORD_COUNT_OPTIONS]}
            onChange={(wordCount) => game.updateConfig({ wordCount: wordCount as 2 | 3 })}
          />

          {state.config.format === 'full' ? (
            <Toggle
              label="Fase de objeción"
              description="Si la apagas, solo pitch + nota (menos diversión)."
              checked={state.config.enableObjection}
              onChange={(enableObjection) => game.updateConfig({ enableObjection })}
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
          <ComboBanner combo={state.combo} />
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Cliente
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
              {customerHeadline(deal.customer)}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {deal.customer.description}
            </p>
            <p className="mx-auto mt-3 max-w-md text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Necesidad: {deal.customer.need}
            </p>
            <p className="mx-auto mt-2 max-w-md text-[length:var(--text-body-sm)] italic text-[var(--color-text-muted)]">
              {deal.customer.personality}
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
            value={productName}
            onChange={(e) => game.setProductName(e.target.value)}
            maxLength={80}
            className="min-h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 font-[family-name:var(--font-display)] text-xl font-semibold outline-none focus:border-[var(--color-accent)]"
          />
          <Button onClick={game.goPitch} disabled={!productName.trim()}>
            Hablar con el cliente
          </Button>
        </div>
      )}

      {state.screen === 'pitch' && deal && (
        <div className="flex flex-col gap-6 text-center">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              {customerHeadline(deal.customer)}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
              {productName}
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
              {state.recording ? 'VENDIENDO…' : 'Listo cuando tú lo estés'}
            </p>
            {state.recording && game.liveTranscript ? (
              <p className="max-h-28 overflow-y-auto px-2 text-left text-[length:var(--text-body-sm)]">
                {game.liveTranscript}
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
            transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
            className="h-12 w-12 rounded-full border-4 border-[var(--color-accent)] border-t-transparent"
          />
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {state.statusMessage || 'Negociando…'}
          </p>
          <LiveBadges badges={state.liveBadges} />
        </div>
      )}

      {state.screen === 'customer' && deal && (
        <div className="flex flex-col gap-8 text-center">
          <LiveBadges badges={state.liveBadges} />
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              {customerHeadline(deal.customer)}
              {state.objectionTurn === 2 ? ' · segunda ronda' : ''}
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug sm:text-3xl">
              “{state.currentObjection}”
            </h1>
          </header>
          {state.error ? (
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              (Objeción de reserva)
            </p>
          ) : null}
          <Button onClick={game.beginReply}>Responder ({state.config.replySeconds}s)</Button>
        </div>
      )}

      {state.screen === 'reply' && (
        <div className="flex flex-col gap-6 text-center">
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            “{state.currentObjection}”
          </p>
          <Card className="flex flex-col items-center gap-3 py-10">
            <p className="font-[family-name:var(--font-display)] text-7xl font-bold tabular-nums">
              {state.secondsLeft}
            </p>
            <p className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              <MicPulse active={state.recording} />
              {state.recording ? 'NEGOCIANDO…' : 'Tu turno'}
            </p>
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

      {state.screen === 'event' && deal?.event && (
        <div className="flex flex-col gap-8 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold">
              {deal.event.title}
            </p>
            <p className="mx-auto mt-4 max-w-md text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {deal.event.body}
            </p>
          </motion.div>
          <LiveBadges badges={state.liveBadges} />
          <Button onClick={game.beginEventReply}>
            Reaccionar ({deal.event.reactionSeconds}s)
          </Button>
        </div>
      )}

      {state.screen === 'event_reply' && (
        <div className="flex flex-col gap-6 text-center">
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            {deal?.event?.title}
          </p>
          <Card className="flex flex-col items-center gap-3 py-10">
            <p className="font-[family-name:var(--font-display)] text-7xl font-bold tabular-nums">
              {state.secondsLeft}
            </p>
            <p className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              <MicPulse active={state.recording} />
              {state.recording ? 'IMPROVISANDO…' : 'Giro de guion'}
            </p>
          </Card>
          {!state.recording ? (
            <Button onClick={() => void game.startRecording()}>🎙️ Hablar</Button>
          ) : (
            <Button variant="danger" onClick={game.stopRecording}>
              Listo
            </Button>
          )}
        </div>
      )}

      {state.screen === 'result' && (
        <div className="flex flex-col gap-8 pb-6">
          {state.round?.evaluation ? (
            <ResultCard
              evaluation={state.round.evaluation}
              productName={productName}
              showAnalysis={state.showAnalysis}
              onToggleAnalysis={game.toggleAnalysis}
              combo={state.round.comboAfter}
            />
          ) : (
            <Card>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                Sin nota esta vez
              </p>
              <p className="mt-2 text-[var(--color-danger)]">{state.error || 'Error desconocido'}</p>
            </Card>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={game.startRound}>Otra partida</Button>
            <Button variant="ghost" onClick={game.goConfig}>
              Cambiar modo
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
