import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import type { Player } from '../types/game';
import { vibrateReveal } from '../utils/game';

interface RevealPageProps {
  player: Player;
  playerIndex: number;
  totalPlayers: number;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
}

export function RevealPage({
  player,
  playerIndex,
  totalPlayers,
  revealed,
  onReveal,
  onNext,
}: RevealPageProps) {
  useEffect(() => {
    if (revealed) vibrateReveal();
  }, [revealed]);

  const isLast = playerIndex >= totalPlayers - 1;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
        {playerIndex + 1} / {totalPlayers}
      </p>

      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
          {player.name}
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          {revealed ? 'Memoriza y oculta la pantalla' : 'Solo tú debes ver esto'}
        </p>
      </header>

      <Card className="min-h-[280px] flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
              transition={{ duration: 0.28 }}
              className="flex w-full flex-col items-center gap-6"
            >
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-4xl"
                aria-hidden
              >
                ?
              </div>
              <Button onClick={onReveal}>Ver mi palabra</Button>
            </motion.div>
          ) : (
            <motion.div
              key="shown"
              initial={{ opacity: 0, scale: 0.88, rotateX: 12 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="flex w-full flex-col items-center gap-4"
            >
              {player.role === 'mrWhite' ? (
                <>
                  <span className="text-6xl" role="img" aria-label="Mr White">
                    🤵
                  </span>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
                    Eres Mr. White
                  </h2>
                  <p className="text-[var(--color-text-muted)]">No tienes palabra.</p>
                </>
              ) : (
                <>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Tu palabra
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight text-[var(--color-text)] sm:text-5xl">
                    {player.word}
                  </h2>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {revealed ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Button onClick={onNext}>
            {isLast ? 'Finalizar reparto' : 'Pasar al siguiente jugador'}
          </Button>
        </motion.div>
      ) : null}
    </div>
  );
}
