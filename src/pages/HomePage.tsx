import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Toggle } from '../components/Toggle';

interface HomePageProps {
  onStartLocal: () => void;
  onStartOnline: () => void;
  readableMode: boolean;
  onReadableModeChange: (enabled: boolean) => void;
}

export function HomePage({
  onStartLocal,
  onStartOnline,
  readableMode,
  onReadableModeChange,
}: HomePageProps) {
  return (
    <div className="flex flex-col gap-10">
      <header className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
          aria-hidden
        >
          <span className="text-4xl">🤵</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mb-4"
        >
          <a
            href="/"
            className="text-sm font-medium tracking-wide text-[var(--color-text-muted)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] hover:underline"
          >
            ← Apps
          </a>
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45 }}
          className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--color-text)] sm:text-6xl"
        >
          Mr White
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.4 }}
          className="mx-auto mt-4 max-w-sm text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]"
        >
          Deducción en grupo: en un solo móvil o en salas online con amigos.
        </motion.p>
      </header>

      <Card>
        <ul className="mb-8 space-y-4 text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
          <li className="flex gap-3">
            <span className="mt-0.5 font-semibold text-[var(--color-accent)]">01</span>
            <span>Configura jugadores o crea una sala compartida.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 font-semibold text-[var(--color-accent)]">02</span>
            <span>Cada persona ve su palabra (o pista) en secreto.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 font-semibold text-[var(--color-accent)]">03</span>
            <span>Votad y eliminad hasta descubrir a Mr White y a los Farsantes.</span>
          </li>
        </ul>

        <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4">
          <Toggle
            label="Modo legible"
            description="Texto más grande y máximo contraste para ver mejor la pantalla."
            checked={readableMode}
            onChange={onReadableModeChange}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={onStartLocal}>Jugar en este móvil</Button>
          <Button variant="secondary" onClick={onStartOnline}>
            Crear / unir sala
          </Button>
        </div>
      </Card>
    </div>
  );
}
