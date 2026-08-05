import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import type { EliminationResult, Player } from '../types/game';
import { eliminationMessage, roleLabel } from '../types/game';

interface PlayPageProps {
  players: Player[];
  currentRound: number;
  lastElimination: EliminationResult | null;
  starterName: string | null;
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
  starterName,
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

  const hasMrWhite = players.some((p) => p.role === 'mrWhite');
  const hasFarsante = players.some((p) => p.role === 'farsante');
  const mrWhiteAlive = alive.some((p) => p.role === 'mrWhite');
  const farsantesAliveCount = alive.filter((p) => p.role === 'farsante').length;
  const farsanteAlive = farsantesAliveCount > 0;
  const allMrWhiteOut = hasMrWhite && !mrWhiteAlive;
  const allFarsantesOut = hasFarsante && !farsanteAlive;
  /** Hay que descubrir a Mr White y a todos los Farsantes (los que haya en la partida). */
  const specialsAlive = mrWhiteAlive || farsanteAlive;
  const gameWon = !specialsAlive && (hasMrWhite || hasFarsante);
  const canEliminate = alive.length > 1 && specialsAlive;

  const winSubtitle =
    hasMrWhite && hasFarsante
      ? 'Mr White y los Farsantes han sido eliminados.'
      : hasMrWhite
        ? 'Todos los Mr. White han sido eliminados.'
        : 'Todos los Farsantes han sido eliminados.';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Ronda {currentRound}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Eliminaciones
        </h1>
        <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
          Votad y eliminad sospechosos hasta descubrir a Mr White y a los Farsantes.
        </p>
        {starterName ? (
          <p className="mt-3 text-[length:var(--text-body)] text-[var(--color-text)]">
            Empieza a hablar:{' '}
            <span className="font-semibold text-[var(--color-accent)]">{starterName}</span>
          </p>
        ) : null}
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
            <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Ronda {lastElimination.round}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-[var(--color-text)]">
              {eliminationMessage(lastElimination.playerName, lastElimination.role)}
            </p>
            <button
              type="button"
              onClick={onDismissResult}
              className="mt-3 min-h-11 text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] underline-offset-2 hover:underline"
            >
              Cerrar
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {gameWon ? (
        <Card>
          <p className="text-center font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-accent)]">
            ¡Habéis descubierto a todos!
          </p>
          <p className="mt-2 text-center text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
            {winSubtitle}
          </p>
          {word ? (
            <p className="mt-3 text-center text-[length:var(--text-body)] text-[var(--color-text-muted)]">
              La palabra era{' '}
              <span className="font-semibold text-[var(--color-text)]">{word}</span>
            </p>
          ) : null}
        </Card>
      ) : allMrWhiteOut && hasFarsante ? (
        <Card>
          <p className="text-center font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-accent)]">
            ¡Mr. White eliminado!
          </p>
          <p className="mt-2 text-center text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
            Seguíd buscando a {farsantesAliveCount === 1 ? 'el Farsante' : 'los Farsantes'}.
            La palabra se revelará cuando los descubráis.
          </p>
        </Card>
      ) : allFarsantesOut && hasMrWhite ? (
        <Card>
          <p className="text-center font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-accent)]">
            ¡Farsantes eliminados!
          </p>
          <p className="mt-2 text-center text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
            Seguíd buscando a Mr White. La palabra se revelará al final.
          </p>
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
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
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
            <li className="px-5 py-6 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
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
                className="flex items-center justify-between gap-3 px-5 py-4 text-[length:var(--text-body-sm)]"
              >
                <div>
                  <p className="font-semibold text-[var(--color-text)]">
                    {player.name}
                  </p>
                  <p className="mt-1 font-medium text-[var(--color-accent)]">
                    {roleLabel(player.role)}
                  </p>
                </div>
                <span className="shrink-0 font-medium text-[var(--color-text-muted)]">
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
