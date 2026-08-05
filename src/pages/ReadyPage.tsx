import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { fireConfetti } from '../utils/confetti';

interface ReadyPageProps {
  starterName: string | null;
  onBeginPlay: () => void;
  onNewGame: () => void;
  onChangeConfig: () => void;
}

export function ReadyPage({
  starterName,
  onBeginPlay,
  onNewGame,
  onChangeConfig,
}: ReadyPageProps) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    fireConfetti();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent)]/15 text-3xl"
          aria-hidden
        >
          ✓
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Todos los jugadores están listos.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-2xl font-semibold text-[var(--color-accent)]"
        >
          ¡Empieza la partida!
        </motion.p>
      </header>

      <Card>
        {starterName ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
            className="mb-6 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 px-4 py-5 text-center"
          >
            <p className="tracking-wide-label text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Empieza a hablar
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)] sm:text-4xl">
              {starterName}
            </p>
          </motion.div>
        ) : null}

        <p className="mb-8 text-center text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
          Hablad por turnos sobre la palabra sin decirla. Luego votad y eliminad hasta
          descubrir a Mr White y a los Farsantes; la palabra se revela al final.
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={onBeginPlay}>Empezar ronda 1</Button>
          <Button variant="secondary" onClick={onNewGame}>
            Nueva partida
          </Button>
          <Button variant="ghost" onClick={onChangeConfig}>
            Cambiar configuración
          </Button>
        </div>
      </Card>
    </div>
  );
}
