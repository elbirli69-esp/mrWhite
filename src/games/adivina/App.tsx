import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Button } from '../../components/Button';
import { NumberStepper } from '../../components/NumberStepper';
import { ScreenShell } from '../../components/ScreenShell';
import { Toggle } from '../../components/Toggle';
import { useReadableMode } from '../../hooks/useReadableMode';
import { AdultModeToggle } from '../shared/AdultModeToggle';
import { ConfigShell } from '../shared/ConfigShell';
import { GameHome } from '../shared/GameHome';
import {
  KEYBOARD_ROWS,
  MAX_ATTEMPTS,
  MIN_ATTEMPTS,
  WORD_LENGTH,
  type LetterStatus,
} from './logic';
import { useAdivina } from './useAdivina';

function statusClass(status: LetterStatus): string {
  switch (status) {
    case 'correct':
      return 'bg-[#3d8b5c] border-[#3d8b5c] text-white';
    case 'present':
      return 'bg-[#c9a227] border-[#c9a227] text-[#0b0b0d]';
    case 'absent':
      return 'bg-[#3a3a40] border-[#3a3a40] text-[#a8a29e]';
    case 'tbd':
      return 'border-[var(--color-text)]/55 bg-[var(--color-surface-elevated)] text-[var(--color-text)]';
    default:
      return 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]';
  }
}

function Tile({
  letter,
  status,
  delay = 0,
  reveal = false,
}: {
  letter: string;
  status: LetterStatus;
  delay?: number;
  reveal?: boolean;
}) {
  return (
    <motion.div
      initial={reveal ? { rotateX: -90, opacity: 0.4 } : false}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={
        reveal
          ? { delay, duration: 0.38, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0.12 }
      }
      className={[
        'flex aspect-square w-full items-center justify-center rounded-xl border-2 font-[family-name:var(--font-display)] text-2xl font-bold uppercase sm:text-3xl',
        statusClass(status),
      ].join(' ')}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {letter || ''}
    </motion.div>
  );
}

function Board({
  rows,
  current,
  maxAttempts,
  shakeToken,
}: {
  rows: ReturnType<typeof useAdivina>['state']['rows'];
  current: string;
  maxAttempts: number;
  shakeToken: number;
}) {
  const emptyRows = Math.max(0, maxAttempts - rows.length - 1);
  const showCurrent = rows.length < maxAttempts;

  return (
    <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-2">
      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}-${row.word}`} className="grid grid-cols-5 gap-2">
          {row.letters.map((cell, i) => (
            <Tile
              key={`${rowIndex}-${i}`}
              letter={cell.letter}
              status={cell.status}
              reveal
              delay={i * 0.08}
            />
          ))}
        </div>
      ))}

      {showCurrent ? (
        <motion.div
          key={shakeToken}
          animate={shakeToken > 0 ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-5 gap-2"
        >
          {Array.from({ length: WORD_LENGTH }, (_, i) => (
            <Tile
              key={`cur-${i}`}
              letter={current[i] ?? ''}
              status={current[i] ? 'tbd' : 'empty'}
            />
          ))}
        </motion.div>
      ) : null}

      {Array.from({ length: emptyRows }, (_, r) => (
        <div key={`empty-${r}`} className="grid grid-cols-5 gap-2">
          {Array.from({ length: WORD_LENGTH }, (_, i) => (
            <Tile key={`e-${r}-${i}`} letter="" status="empty" />
          ))}
        </div>
      ))}
    </div>
  );
}

function Keyboard({
  statuses,
  onLetter,
  onEnter,
  onBackspace,
  disabled,
}: {
  statuses: Record<string, LetterStatus>;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
      {KEYBOARD_ROWS.map((row) => (
        <div key={row.join('-')} className="flex justify-center gap-1.5">
          {row.map((key) => {
            const isWide = key === 'ENTER' || key === '⌫';
            const status = !isWide ? (statuses[key] ?? 'empty') : 'empty';
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (key === 'ENTER') onEnter();
                  else if (key === '⌫') onBackspace();
                  else onLetter(key);
                }}
                className={[
                  'min-h-12 rounded-lg border font-semibold uppercase transition-colors active:scale-[0.97]',
                  isWide ? 'min-w-[3.4rem] px-2 text-xs sm:min-w-[4.2rem]' : 'w-8 flex-1 text-sm sm:w-9',
                  statusClass(status === 'empty' ? 'empty' : status),
                  disabled ? 'opacity-50' : '',
                ].join(' ')}
              >
                {key === 'ENTER' ? 'Enviar' : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function StatsPanel({
  stats,
  maxAttempts,
}: {
  stats: ReturnType<typeof useAdivina>['state']['stats'];
  maxAttempts: number;
}) {
  const winRate = stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
  const maxBar = Math.max(1, ...stats.distribution);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
      <p className="mb-3 text-center text-[length:var(--text-body-sm)] font-semibold tracking-wide text-[var(--color-text-muted)]">
        Estadísticas
      </p>
      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Jugadas', value: stats.played },
          { label: '% victorias', value: winRate },
          { label: 'Racha', value: stats.currentStreak },
          { label: 'Máx.', value: stats.maxStreak },
        ].map((item) => (
          <div key={item.label}>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: maxAttempts }, (_, i) => {
          const count = stats.distribution[i] ?? 0;
          const width = `${Math.max(8, (count / maxBar) * 100)}%`;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-[var(--color-text-muted)]">{i + 1}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-[var(--color-bg)]">
                <div
                  className="flex h-full items-center justify-end rounded bg-[var(--color-accent)] px-2 text-xs font-bold text-[var(--color-bg)]"
                  style={{ width }}
                >
                  {count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdivinaApp() {
  const { readableMode, setReadableMode } = useReadableMode();
  const game = useAdivina();
  const { state } = game;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (state.screen !== 'play' || state.won !== null) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        game.submitGuess();
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        game.backspace();
        return;
      }
      if (/^[a-zA-ZñÑ]$/.test(event.key)) {
        event.preventDefault();
        game.typeLetter(event.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game.backspace, game.submitGuess, game.typeLetter, state.screen, state.won]);

  if (state.screen === 'play' || state.screen === 'result') {
    return (
      <ScreenShell screenKey={state.screen} centered={false}>
        <div className="flex min-h-[min(100dvh,52rem)] flex-col gap-5 pb-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={game.goHome}
              className="min-h-11 text-[length:var(--text-body-sm)] font-medium text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-accent)] hover:underline"
            >
              ← Salir
            </button>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Cinco letras
            </h1>
            <span className="min-w-14 text-right text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {state.rows.length}/{state.config.maxAttempts}
            </span>
          </header>

          <AnimatePresence mode="wait">
            {state.statusMessage ? (
              <motion.p
                key={state.statusMessage}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-[length:var(--text-body-sm)] font-semibold text-[var(--color-accent)]"
                role="status"
              >
                {state.statusMessage}
              </motion.p>
            ) : (
              <p className="h-5 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                {state.config.hardMode ? 'Modo difícil' : '5 letras · sin pistas'}
              </p>
            )}
          </AnimatePresence>

          <Board
            rows={state.rows}
            current={state.screen === 'play' ? state.current : ''}
            maxAttempts={state.config.maxAttempts}
            shakeToken={state.shakeToken}
          />

          {state.screen === 'result' ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-auto flex flex-col gap-4"
            >
              <StatsPanel stats={state.stats} maxAttempts={state.config.maxAttempts} />
              <Button onClick={game.playAgain}>Otra partida</Button>
              <Button variant="ghost" onClick={game.goHome}>
                Volver al inicio
              </Button>
            </motion.div>
          ) : (
            <div className="mt-auto">
              <Keyboard
                statuses={game.keyStatuses}
                onLetter={game.typeLetter}
                onEnter={game.submitGuess}
                onBackspace={game.backspace}
                disabled={state.won !== null}
              />
            </div>
          )}
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell screenKey={state.screen}>
      {state.screen === 'home' && (
        <GameHome
          title="Cinco letras"
          emoji="🔤"
          tagline="Una palabra de 5 letras. Seis intentos. Juegas tú solo."
          steps={[
            'Elige intentos y si quieres modo difícil.',
            'Escribe con el teclado: verde acierto, amarillo cerca.',
            'Acumula rachas y mira tus estadísticas.',
          ]}
          readableMode={readableMode}
          onReadableModeChange={setReadableMode}
          onStart={game.goConfig}
          startLabel="Configurar"
        />
      )}

      {state.screen === 'config' && (
        <ConfigShell
          title="Configuración"
          description="Partida en solitario. La config se guarda en este dispositivo."
          error={game.configValidation.error}
          canContinue={game.configValidation.valid}
          continueLabel="Empezar"
          onBack={game.goHome}
          onContinue={game.startGame}
        >
          <NumberStepper
            label="Intentos"
            description={`${MIN_ATTEMPTS}–${MAX_ATTEMPTS}. Clásico: 6.`}
            value={state.config.maxAttempts}
            min={MIN_ATTEMPTS}
            max={MAX_ATTEMPTS}
            options={[5, 6, 7, 8]}
            onChange={(maxAttempts) => game.updateConfig({ maxAttempts })}
          />
          <Toggle
            label="Modo difícil"
            description="Debes reutilizar las letras verdes y amarillas reveladas."
            checked={state.config.hardMode}
            onChange={(hardMode) => game.updateConfig({ hardMode })}
          />
          <AdultModeToggle
            checked={state.config.adultMode}
            onChange={(adultMode) => game.updateConfig({ adultMode })}
          />
          <StatsPanel stats={state.stats} maxAttempts={state.config.maxAttempts} />
        </ConfigShell>
      )}
    </ScreenShell>
  );
}
