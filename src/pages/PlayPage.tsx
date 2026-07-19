import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import type { EliminationResult, Player } from '../types/game';
import { eliminationMessage, roleLabel } from '../types/game';

interface PlayPageProps {
  players: Player[];
  currentRound: number;
  lastElimination: EliminationResult | null;
  word: string | null;
  onEliminate: (playerId: number) => void;
  onDismissResult: () => void;
  onNewGame: () => void;
  onChangeConfig: () => void;
}

export function PlayPage({
  players,
  currentRound,
  lastElimination,
  word,
  onEliminate,
  onDismissResult,
  onNewGame,
  onChangeConfig,
}: PlayPageProps) {
  const alive = players.filter((p) => p.eliminatedRound === null);
  const eliminated = players
    .filter((p) => p.eliminatedRound !== null)
    .sort((a, b) => (a.eliminatedRound ?? 0) - (b.eliminatedRound ?? 0));

  const mrWhiteAlive = alive.some((p) => p.role === 'mrWhite');
  const allMrWhiteOut = players.some((p) => p.role === 'mrWhite') && !mrWhiteAlive;
  const canEliminate = alive.length > 1 && mrWhiteAlive;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Ronda {currentRound}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Eliminaciones
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Votad y eliminad a un sospechoso. Se revelará su rol al instante.
        </p>
      </header>

      <AnimatePresence>
        {lastElimination ? (
          <motion.div
            key={`${lastElimination.playerId}-${lastElimination.round}`}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            role="status"
            className={[
              'rounded-3xl border px-5 py-4',
              lastElimination.role === 'mrWhite'
                ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15'
                : lastElimination.role === 'farsante'
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]',
            ].join(' ')}
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Ronda {lastElimination.round}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
              {eliminationMessage(lastElimination.playerName, lastElimination.role)}
            </p>
            <button
              type="button"
              onClick={onDismissResult}
              className="mt-3 text-sm text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
            >
              Cerrar
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {allMrWhiteOut ? (
        <Card>
          <p className="text-center font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-accent)]">
            ¡Habéis eliminado a todos los Mr. White!
          </p>
          {word ? (
            <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
              La palabra era <span className="text-[var(--color-text)]">{word}</span>
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card padded={false}>
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            En juego ({alive.length})
          </h2>
        </div>
        <ul className="divide-y divide-[var(--color-border)]">
          {alive.map((player) => (
            <li
              key={player.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-[family-name:var(--font-display)] text-lg font-medium">
                {player.name}
              </span>
              {canEliminate ? (
                <Button
                  fullWidth={false}
                  variant="danger"
                  className="sm:min-w-[11rem] sm:shrink-0"
                  onClick={() => onEliminate(player.id)}
                >
                  Eliminar en ronda {currentRound}
                </Button>
              ) : null}
            </li>
          ))}
          {alive.length === 0 ? (
            <li className="px-5 py-6 text-sm text-[var(--color-text-muted)]">
              No quedan jugadores.
            </li>
          ) : null}
        </ul>
      </Card>

      {eliminated.length > 0 ? (
        <Card padded={false}>
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Eliminados
            </h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {eliminated.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-3 px-5 py-4 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--color-text-muted)] line-through">
                    {player.name}
                  </p>
                  <p className="mt-0.5 text-[var(--color-text)]">
                    {roleLabel(player.role)}
                  </p>
                </div>
                <span className="shrink-0 text-[var(--color-text-muted)]">
                  Ronda {player.eliminatedRound}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 pb-4">
        <Button variant="secondary" onClick={onNewGame}>
          Nueva partida
        </Button>
        <Button variant="ghost" onClick={onChangeConfig}>
          Cambiar configuración
        </Button>
      </div>
    </div>
  );
}
