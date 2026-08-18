import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { NamesPage } from '../../pages/NamesPage';
import { PassPhonePage } from '../../pages/PassPhonePage';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import {
  AI_WEIGHT_OPTIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROUNDS_OPTIONS,
  SECONDS_OPTIONS,
  type EvalMode,
  type TopicMode,
} from './logic';
import { useHablaYa } from './useHablaYa';
import { useWhisperPreload } from './useWhisperPreload';
import { WhisperDownloadBanner } from './WhisperDownloadBanner';
import { HABLAYA_WHISPER_BUILD } from './whisperLocal';

export default function HablaYaApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useHablaYa();
  const { state } = game;
  const [customDraft, setCustomDraft] = useState('');
  const whisper = useWhisperPreload(true);

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
        state.screen !== 'pick' &&
        state.screen !== 'review' &&
        state.screen !== 'config'
      }
    >
      {state.screen === 'home' && (
        <GameHome
          title="Habla ya"
          emoji="🎙️"
          tagline="Elige categoría, habla contra reloj y que te puntúen la mesa… y la IA."
          steps={[
            'Primero se descarga Whisper en el dispositivo (base/small; solo la primera vez).',
            'Configura tiempo, rondas, serio/inventado y cómo se puntúa.',
            'Hablas: Whisper transcribe en vivo y, al terminar, DeepSeek puntúa al momento.',
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
                : 'Configurar partida'
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
      )}
      {state.screen === 'home' ? (
        <p className="mt-4 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Build {HABLAYA_WHISPER_BUILD} · si ves mensajes viejos, cierra la pestaña y vuelve a entrar
        </p>
      ) : null}

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
            label="Segundos por turno"
            description="Tiempo para hablar sin parar."
            value={state.config.secondsPerTurn}
            min={30}
            max={90}
            options={[...SECONDS_OPTIONS]}
            onChange={(secondsPerTurn) => game.updateConfig({ secondsPerTurn })}
          />
          <NumberStepper
            label="Rondas"
            description="1 ronda = un turno por jugador. Por defecto 1."
            value={state.config.rounds}
            min={1}
            max={5}
            options={[...ROUNDS_OPTIONS]}
            onChange={(rounds) => game.updateConfig({ rounds })}
          />

          <ModePicker
            label="Tipo de tema"
            value={state.config.topicMode}
            options={[
              { id: 'serious', title: 'Serio', desc: 'Premia acierto, claridad y relevancia.' },
              {
                id: 'invented',
                title: 'Inventado',
                desc: 'Premia inventiva, coherencia y fantasía.',
              },
            ]}
            onChange={(topicMode) => game.updateConfig({ topicMode: topicMode as TopicMode })}
          />

          <ModePicker
            label="Evaluación"
            value={state.config.evalMode}
            options={[
              { id: 'both', title: 'IA + votos', desc: 'Media configurable entre ambos.' },
              { id: 'ai', title: 'Solo IA', desc: 'Nota automática tras el audio.' },
              { id: 'votes', title: 'Solo votos', desc: 'La mesa puntúa 0–10 (offline).' },
            ]}
            onChange={(evalMode) => game.updateConfig({ evalMode: evalMode as EvalMode })}
          />

          {state.config.evalMode === 'both' ? (
            <NumberStepper
              label="Peso de la IA en la media"
              description={`${state.config.aiWeight}% IA · ${100 - state.config.aiWeight}% votos de la mesa`}
              value={state.config.aiWeight}
              min={0}
              max={100}
              options={[...AI_WEIGHT_OPTIONS]}
              onChange={(aiWeight) => game.updateConfig({ aiWeight })}
            />
          ) : null}

          <Toggle
            label="Categorías del pack"
            description="Lista base en castellano. Desactívalo si solo quieres las de la mesa."
            checked={state.config.useBuiltInCategories}
            onChange={(useBuiltInCategories) => game.updateConfig({ useBuiltInCategories })}
          />

          <AdultModeToggle
            checked={state.config.adultMode}
            onChange={(adultMode) => game.updateConfig({ adultMode })}
          />

          <div>
            <p className="text-[length:var(--text-body)] font-semibold text-[var(--color-text)]">
              Categorías custom
            </p>
            <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              Las de la mesa. Cada categoría solo se usa una vez en la partida.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                maxLength={48}
                placeholder="Ej. IKEA, Tortilla, El ex…"
                className="h-[var(--touch-min)] min-w-0 flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 outline-none focus:border-[var(--color-accent)]"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const label = customDraft.trim();
                  if (!label) return;
                  if (state.config.customCategories.some((c) => c.toLowerCase() === label.toLowerCase())) {
                    setCustomDraft('');
                    return;
                  }
                  game.updateConfig({
                    customCategories: [...state.config.customCategories, label],
                  });
                  setCustomDraft('');
                }}
              />
              <Button
                fullWidth={false}
                className="shrink-0 px-4"
                onClick={() => {
                  const label = customDraft.trim();
                  if (!label) return;
                  if (state.config.customCategories.some((c) => c.toLowerCase() === label.toLowerCase())) {
                    setCustomDraft('');
                    return;
                  }
                  game.updateConfig({
                    customCategories: [...state.config.customCategories, label],
                  });
                  setCustomDraft('');
                }}
              >
                Añadir
              </Button>
            </div>
            {state.config.customCategories.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {state.config.customCategories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]"
                      onClick={() =>
                        game.updateConfig({
                          customCategories: state.config.customCategories.filter((c) => c !== cat),
                        })
                      }
                    >
                      {cat} ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </ConfigShell>
      )}

      {state.screen === 'names' && (
        <NamesPage
          names={state.playerNames}
          error={game.namesError}
          onChangeName={game.updatePlayerName}
          onContinue={game.beginMatch}
          onBack={game.goConfig}
        />
      )}

      {state.screen === 'pick' && game.currentPlayer && (
        <div className="flex flex-col gap-5">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Ronda {state.round}/{state.config.rounds} · turno de
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.currentPlayer.name}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Elige una categoría. Modo{' '}
              {state.config.topicMode === 'invented' ? 'inventado' : 'serio'}. Quedan{' '}
              {game.availableCategories.length}.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {game.availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => game.selectCategory(cat)}
                className="min-h-[var(--touch-min)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left font-[family-name:var(--font-display)] text-lg font-semibold transition-colors hover:border-[var(--color-accent)]"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.screen === 'record' && game.currentPlayer && (
        <div className="flex flex-col gap-6">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              {state.selectedCategory}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.currentPlayer.name}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.config.topicMode === 'invented'
                ? 'Inventa sin miedo. Se premia la imaginación.'
                : 'Habla en serio de lo que sepas.'}
            </p>
          </header>

          <Card className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="font-[family-name:var(--font-display)] text-6xl font-semibold tabular-nums">
              {state.secondsLeft}
            </p>
            <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {state.recording
                ? state.transcript.trim()
                  ? 'Transcribiendo en vivo…'
                  : 'Grabando… Whisper irá escribiendo en unos segundos'
                : 'Pulsa para empezar a grabar'}
            </p>
            {state.recording && state.transcript.trim() ? (
              <p className="max-h-32 overflow-y-auto px-3 text-left text-[length:var(--text-body-sm)] text-[var(--color-text)]">
                {state.transcript}
              </p>
            ) : null}
            {state.aiError ? (
              <p className="text-[length:var(--text-body-sm)] text-[var(--color-danger)]">{state.aiError}</p>
            ) : null}
          </Card>

          {!state.recording ? (
            <Button onClick={() => void game.startRecording()}>Empezar a hablar</Button>
          ) : (
            <Button variant="danger" onClick={() => void game.finishRecording()}>
              Terminar ya
            </Button>
          )}
        </div>
      )}

      {state.screen === 'review' && game.currentPlayer && (
        <div className="flex flex-col gap-5">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              {state.selectedCategory}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Escuchad a {game.currentPlayer.name}
            </h1>
          </header>

          <Card>
            {state.audioUrl ? (
              <audio controls src={state.audioUrl} className="w-full" />
            ) : (
              <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                Sin audio disponible.
              </p>
            )}

            {state.config.evalMode !== 'votes' ? (
              <div className="mt-4">
                <p className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-text)]">
                  Transcripción (Whisper local)
                </p>
                <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                  {state.aiLoading
                    ? state.aiStatus || 'Al terminar se envía a DeepSeek…'
                    : state.needsTranscript
                      ? 'Whisper local no sacó texto. Reintentad, o escuchad el audio y escribid un resumen a mano.'
                      : state.aiScore != null
                        ? 'Ya puntuado. Puedes corregir el texto y re-puntuar si hace falta.'
                        : 'Puedes corregir el texto y re-puntuar.'}
                </p>
                <textarea
                  value={state.transcript}
                  onChange={(e) => game.setTranscript(e.target.value)}
                  rows={5}
                  disabled={state.aiLoading && !state.transcript.trim()}
                  autoFocus={state.needsTranscript}
                  placeholder={
                    state.aiLoading && !state.transcript.trim()
                      ? 'Cerrando la transcripción en vivo…'
                      : state.aiLoading
                        ? 'Texto listo · puntuando con DeepSeek…'
                        : 'Aquí debería aparecer lo que se ha dicho del tema…'
                  }
                  className="mt-3 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[length:var(--text-body)] outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
                />
                {state.aiError && !state.aiLoading ? (
                  <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-danger)]">
                    {state.aiError}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => void game.requestAiScore()} disabled={state.aiLoading}>
                    {state.aiLoading
                      ? state.aiStatus || 'Procesando…'
                      : state.needsTranscript && !state.transcript.trim()
                        ? 'Reintentar Whisper local'
                        : 'Re-puntuar'}
                  </Button>
                  {state.config.evalMode === 'both' ? (
                    <Button variant="ghost" onClick={game.skipAi} disabled={state.aiLoading}>
                      Saltar IA
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>

          {state.config.evalMode !== 'votes' ? (
            <Card>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">Nota IA</p>
              {state.aiLoading ? (
                <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                  {state.aiStatus || 'Procesando…'}
                  {state.transcript.trim()
                    ? ' · Texto en vivo listo; DeepSeek está puntuando.'
                    : ' · Cerrando Whisper en vivo, luego DeepSeek.'}
                </p>
              ) : state.aiScore != null ? (
                <>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--color-accent)]">
                    {state.aiScore}
                    <span className="text-lg text-[var(--color-text-muted)]"> / 10</span>
                  </p>
                  {state.aiFeedback ? (
                    <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                      {state.aiFeedback}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                  {state.needsTranscript
                    ? 'Aún no hay nota.'
                    : state.aiError || 'Sin nota de IA todavía.'}
                </p>
              )}
            </Card>
          ) : null}

          {state.config.evalMode !== 'ai' ? (
            <Card padded={false}>
              <div className="px-5 py-4">
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  Votos de la mesa (0–10)
                </p>
                <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                  {state.aiLoading
                    ? 'Podéis ir votando mientras llega la nota de la IA.'
                    : 'No vota quien habló.'}
                </p>
              </div>
              <ul className="divide-y divide-[var(--color-border)]">
                {state.players
                  .filter((p) => p.id !== game.currentPlayer!.id)
                  .map((voter) => (
                    <li key={voter.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                      <span className="min-w-[7rem] font-[family-name:var(--font-display)] text-lg font-semibold">
                        {voter.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: 11 }, (_, score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => game.setVote(voter.id, score)}
                            className={[
                              'h-10 w-10 rounded-xl border text-sm font-semibold',
                              state.votes[voter.id] === score
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                                : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                            ].join(' ')}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}

          <Button onClick={game.confirmReview} disabled={!game.canConfirmReview}>
            Confirmar nota del turno
          </Button>
        </div>
      )}

      {state.screen === 'turnResult' && game.currentPlayer && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.currentPlayer.name}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {state.selectedCategory}
            </p>
            <p className="mt-6 font-[family-name:var(--font-display)] text-6xl font-semibold text-[var(--color-accent)]">
              {state.lastFinalScore}
            </p>
            <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              nota del turno · total {game.currentPlayer.score}
            </p>
          </header>
          <Button onClick={game.nextTurn}>Siguiente</Button>
        </div>
      )}

      {state.screen === 'matchEnd' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              Fin de la partida
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Gana quien más haya sumado.
            </p>
          </header>
          <Card padded={false}>
            <ol className="divide-y divide-[var(--color-border)]">
              {game.ranked.map((player, index) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
                    {index + 1}. {player.name}
                  </span>
                  <span className="text-[length:var(--text-body)] font-semibold text-[var(--color-accent)]">
                    {player.score}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <div className="flex flex-col gap-3">
            <Button onClick={game.beginMatch}>Otra partida</Button>
            <Button variant="ghost" onClick={game.goConfig}>
              Cambiar configuración
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

function ModePicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; title: string; desc: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[length:var(--text-body)] font-semibold text-[var(--color-text)]">{label}</p>
      <div className="mt-3 flex flex-col gap-2">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={[
                'rounded-2xl border px-4 py-3 text-left transition-colors',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)]',
              ].join(' ')}
            >
              <span className="block font-[family-name:var(--font-display)] text-lg font-semibold">
                {opt.title}
              </span>
              <span className="mt-1 block text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
