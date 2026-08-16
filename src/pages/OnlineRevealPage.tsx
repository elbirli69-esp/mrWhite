import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import type { PrivateRolePayload, PublicRoomState } from '../../shared/protocol';
import { vibrateReveal } from '../utils/game';

interface OnlineRevealPageProps {
  state: PublicRoomState;
  privateRole: PrivateRolePayload | null;
  playerId: string;
  isHost: boolean;
  revealed: boolean;
  onReveal: () => void;
  onAck: () => void;
  onBeginPlay: () => void;
}

export function OnlineRevealPage({
  state,
  privateRole,
  playerId,
  isHost,
  revealed,
  onReveal,
  onAck,
  onBeginPlay,
}: OnlineRevealPageProps) {
  const me = state.seats.find((s) => s.playerId === playerId);
  const alreadyAcked = Boolean(me?.revealAcked);
  const allAcked = state.seats.length > 0 && state.seats.every((s) => s.revealAcked);

  useEffect(() => {
    if (revealed) vibrateReveal();
  }, [revealed]);

  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Tu rol · {state.revealAckCount}/{state.seats.length} listos
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
          {me?.name ?? 'Jugador'}
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          {revealed ? 'Memoriza y oculta la pantalla' : 'Solo tú debes ver esto'}
        </p>
      </header>

      <Card className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {!revealed || !privateRole ? (
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
              <Button onClick={onReveal} disabled={!privateRole}>
                Ver mi palabra
              </Button>
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
              {privateRole.role === 'mrWhite' ? (
                <>
                  <span className="text-6xl" role="img" aria-label="Mr White">
                    🤵
                  </span>
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-accent)]">
                    Eres Mr. White
                  </h2>
                  <p className="text-[var(--color-text-muted)]">No tienes palabra.</p>
                  {privateRole.hint ? (
                    <p className="mt-2 text-sm text-[var(--color-text)]">
                      Pista: <span className="font-semibold">{privateRole.hint}</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Tu palabra
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight text-[var(--color-text)] sm:text-5xl">
                    {privateRole.word}
                  </h2>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {revealed && privateRole ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col gap-3"
        >
          <Button onClick={onAck} variant={alreadyAcked ? 'secondary' : 'primary'} disabled={alreadyAcked}>
            {alreadyAcked ? 'Listo' : 'Ya lo tengo'}
          </Button>
          {isHost ? (
            <Button onClick={onBeginPlay} disabled={!allAcked}>
              Empezar ronda 1
            </Button>
          ) : (
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              {allAcked
                ? 'Esperando al anfitrión…'
                : 'Esperando a que todos vean su palabra…'}
            </p>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
