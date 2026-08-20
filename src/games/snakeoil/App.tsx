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
import { WhisperDownloadBanner } from '../hablaya/WhisperDownloadBanner';
import { useWhisperPreload } from '../hablaya/useWhisperPreload';
import { HABLAYA_WHISPER_BUILD } from '../hablaya/whisperLocal';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  SECONDS_OPTIONS,
  productLabel,
  type JudgeMode,
} from './logic';
import { useSnakeOil } from './useSnakeOil';

export default function SnakeOilApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useSnakeOil();
  const { state } = game;
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
        state.screen !== 'build' &&
        state.screen !== 'review' &&
        state.screen !== 'pickWinner' &&
        state.screen !== 'config'
      }
    >
      {state.screen === 'home' && (
        <GameHome
          title="Snake Oil"
          emoji="🐍"
          tagline="Inventa un producto absurdo y véndeselo al cliente. La IA puntúa el pitch."
          steps={[
            'Whisper se descarga en el móvil (solo la primera vez).',
            'El cliente tiene un rol; los demás juntan 2 cartas y hacen el pitch.',
            'DeepSeek nota el discurso; el cliente (o la IA) elige el mejor.',
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
          Build {HABLAYA_WHISPER_BUILD} · misma pila de voz que Habla ya
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
            label="Segundos por pitch"
            description="Tiempo para vender el invento."
            value={state.config.secondsPerPitch}
            min={30}
            max={60}
            options={[...SECONDS_OPTIONS]}
            onChange={(secondsPerPitch) => game.updateConfig({ secondsPerPitch })}
          />
          <ModePicker
            label="Quién decide el ganador"
            value={state.config.judgeMode}
            options={[
              {
                id: 'both',
                title: 'Cliente + nota IA',
                desc: 'La IA puntúa cada pitch; el cliente elige con esa info.',
              },
              {
                id: 'ai',
                title: 'Solo IA',
                desc: 'Gana automáticamente la nota más alta.',
              },
              {
                id: 'customer',
                title: 'Solo cliente',
                desc: 'Clásico: el cliente elige sin IA (offline).',
              },
            ]}
            onChange={(judgeMode) => game.updateConfig({ judgeMode: judgeMode as JudgeMode })}
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
          onContinue={game.beginMatch}
          onBack={game.goConfig}
        />
      )}

      {state.screen === 'customerReveal' && game.customer && (
        <div className="flex flex-col gap-8 text-center">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Cliente · ronda {state.customersDone + 1}/{state.players.length}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.customer.name}
            </h1>
            <p className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--color-accent)] sm:text-5xl">
              {state.customerRole}
            </p>
            <p className="mt-4 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Los demás preparan un invento de 2 palabras y lo venden.
            </p>
          </header>
          <Button onClick={game.continueAfterCustomerReveal}>Pasar al primer vendedor</Button>
        </div>
      )}

      {state.screen === 'build' && game.currentSeller && (
        <div className="flex flex-col gap-5">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Vendedor · cliente: {state.customerRole}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {game.currentSeller.name}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Elige exactamente 2 cartas para tu producto.
            </p>
          </header>

          {state.selected.length === 2 ? (
            <Card className="text-center">
              <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">Tu invento</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
                {productLabel(state.selected[0]!, state.selected[1]!)}
              </p>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {game.currentSeller.hand.map((word) => {
              const active = state.selected.includes(word);
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => game.toggleWord(word)}
                  className={[
                    'min-h-[var(--touch-min)] rounded-2xl border px-3 py-3 font-[family-name:var(--font-display)] text-lg font-semibold transition-colors',
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {word}
                </button>
              );
            })}
          </div>

          <Button onClick={game.confirmProduct} disabled={state.selected.length !== 2}>
            Listo para el pitch
          </Button>
        </div>
      )}

      {state.screen === 'pitch' && game.currentSeller && (
        <div className="flex flex-col gap-6">
          <header className="text-center">
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Vende a {state.customerRole}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {productLabel(state.selected[0] ?? '', state.selected[1] ?? '')}
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              {game.currentSeller.name} · convence sin vergüenza
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
                  : 'Grabando…'
                : 'Pulsa para empezar el pitch'}
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
            <Button onClick={() => void game.startRecording()}>Empezar pitch</Button>
          ) : (
            <Button variant="danger" onClick={() => void game.finishRecording()}>
              Terminar ya
            </Button>
          )}
        </div>
      )}

      {state.screen === 'review' && game.currentSeller && (
        <div className="flex flex-col gap-5">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              {productLabel(state.selected[0] ?? '', state.selected[1] ?? '')}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              Pitch de {game.currentSeller.name}
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

            {game.wantsAi ? (
              <div className="mt-4">
                <p className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-text)]">
                  Transcripción (Whisper local)
                </p>
                <textarea
                  value={state.transcript}
                  onChange={(e) => game.setTranscript(e.target.value)}
                  rows={4}
                  disabled={state.aiLoading && !state.transcript.trim()}
                  placeholder="Aquí debería aparecer el pitch…"
                  className="mt-3 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[length:var(--text-body)] outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
                />
                {state.aiError && !state.aiLoading ? (
                  <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-danger)]">
                    {state.aiError}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => void game.requestAiScore()} disabled={state.aiLoading}>
                    {state.aiLoading ? state.aiStatus || 'Procesando…' : 'Re-puntuar'}
                  </Button>
                  {state.config.judgeMode === 'both' ? (
                    <Button variant="ghost" onClick={game.skipAi} disabled={state.aiLoading}>
                      Saltar IA
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>

          {game.wantsAi ? (
            <Card>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">Nota IA</p>
              {state.aiLoading ? (
                <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                  {state.aiStatus || 'Procesando…'}
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
                  {state.aiError || 'Sin nota todavía.'}
                </p>
              )}
            </Card>
          ) : null}

          <Button onClick={game.confirmPitchReview} disabled={!game.canConfirmReview}>
            {state.sellerStep + 1 < state.sellerOrder.length
              ? 'Siguiente vendedor'
              : 'Ver pitches / elegir'}
          </Button>
        </div>
      )}

      {state.screen === 'pickWinner' && game.customer && (
        <div className="flex flex-col gap-5">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Decide {game.customer.name}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
              ¿Quién vende mejor a {state.customerRole}?
            </h1>
          </header>

          <ul className="flex flex-col gap-3">
            {state.pitches.map((pitch) => {
              const seller = state.players.find((p) => p.id === pitch.playerId);
              return (
                <li key={pitch.playerId}>
                  <Card>
                    <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                      {seller?.name ?? 'Vendedor'}
                    </p>
                    <p className="mt-1 text-lg text-[var(--color-accent)]">{pitch.product}</p>
                    {pitch.aiScore != null ? (
                      <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                        IA: {pitch.aiScore}/10
                        {pitch.aiFeedback ? ` · ${pitch.aiFeedback}` : ''}
                      </p>
                    ) : null}
                    {pitch.audioUrl ? (
                      <audio controls src={pitch.audioUrl} className="mt-3 w-full" />
                    ) : null}
                    <div className="mt-4">
                      <Button onClick={() => game.pickWinner(pitch.playerId)}>Elegir este</Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {state.screen === 'roundResult' && (
        <div className="flex flex-col gap-8 text-center">
          <header>
            <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Vendido
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {state.players.find((p) => p.id === state.winnerId)?.name ?? 'Nadie'}
            </h1>
            <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              se lleva a {state.customerRole}
            </p>
            {(() => {
              const pitch = state.pitches.find((p) => p.playerId === state.winnerId);
              return pitch ? (
                <p className="mt-6 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-accent)]">
                  {pitch.product}
                </p>
              ) : null;
            })()}
          </header>
          <Button onClick={game.nextRound}>
            {state.customersDone + 1 >= state.players.length ? 'Ver ranking' : 'Siguiente cliente'}
          </Button>
        </div>
      )}

      {state.screen === 'matchEnd' && (
        <div className="flex flex-col gap-8">
          <header className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
              Fin de la partida
            </h1>
            <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              Gana quien más clientes haya convencido.
            </p>
          </header>
          <Card padded={false}>
            <ol className="divide-y divide-[var(--color-border)]">
              {game.ranked.map((player, index) => (
                <li key={player.id} className="flex items-center justify-between gap-3 px-5 py-4">
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
