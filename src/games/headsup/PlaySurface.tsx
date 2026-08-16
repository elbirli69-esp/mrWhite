import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { vibrateReveal } from '../../utils/game';

const SWIPE_THRESHOLD = 90;

interface PlaySurfaceProps {
  word: string | null;
  playerName: string | null;
  secondsLeft: number;
  roundCorrect: number;
  roundSkipped: number;
  allowSkip: boolean;
  onCorrect: () => void;
  onSkip: () => void;
}

/**
 * Pantalla a pantalla completa: el que sostiene el móvil desliza
 * sin mirar. Derecha = correcto, izquierda = pasar.
 */
export function PlaySurface({
  word,
  playerName,
  secondsLeft,
  roundCorrect,
  roundSkipped,
  allowSkip,
  onCorrect,
  onSkip,
}: PlaySurfaceProps) {
  const x = useMotionValue(0);
  const [flash, setFlash] = useState<'correct' | 'skip' | null>(null);
  const locked = useRef(false);

  const bgCorrect = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const bgSkip = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverscroll = html.style.overscrollBehaviorY;
    const prevBodyOverscroll = body.style.overscrollBehaviorY;
    const prevBodyOverflow = body.style.overflow;
    const prevTouchAction = body.style.touchAction;

    html.style.overscrollBehaviorY = 'none';
    body.style.overscrollBehaviorY = 'none';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    html.dataset.headsupPlay = 'true';

    let startX = 0;
    let startY = 0;
    const onTouchStart = (event: TouchEvent) => {
      startX = event.touches[0]?.clientX ?? 0;
      startY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const x = event.touches[0]?.clientX ?? 0;
      const y = event.touches[0]?.clientY ?? 0;
      const dx = Math.abs(x - startX);
      const dy = Math.abs(y - startY);
      // Bloquea pull-to-refresh / scroll; deja pasar el swipe horizontal.
      if (dy > dx && dy > 6) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      html.style.overscrollBehaviorY = prevHtmlOverscroll;
      body.style.overscrollBehaviorY = prevBodyOverscroll;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevTouchAction;
      delete html.dataset.headsupPlay;
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const trigger = (kind: 'correct' | 'skip') => {
    if (locked.current) return;
    locked.current = true;
    setFlash(kind);
    vibrateReveal();
    if (kind === 'correct') onCorrect();
    else onSkip();
    window.setTimeout(() => {
      locked.current = false;
      setFlash(null);
      x.set(0);
    }, 220);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    const wentRight = dx > SWIPE_THRESHOLD || vx > 700;
    const wentLeft = dx < -SWIPE_THRESHOLD || vx < -700;

    if (wentRight) {
      trigger('correct');
      return;
    }
    if (wentLeft && allowSkip) {
      trigger('skip');
      return;
    }
    x.set(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex touch-none select-none flex-col bg-[var(--color-bg)] text-[var(--color-text)]"
      style={{ overscrollBehavior: 'none', WebkitUserSelect: 'none' }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emerald-500/35"
        style={{ opacity: flash === 'correct' ? 1 : bgCorrect }}
      />
      {allowSkip ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-rose-500/30"
          style={{ opacity: flash === 'skip' ? 1 : bgSkip }}
        />
      ) : null}

      <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-[length:var(--text-body)] text-[var(--color-text-muted)]">{playerName}</p>
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
          {secondsLeft}
        </p>
      </div>

      <motion.div
        className="relative z-10 flex min-h-0 flex-1 touch-none flex-col items-center justify-center px-6"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.85}
        style={{ x }}
        onDragEnd={onDragEnd}
      >
        <p className="text-[length:var(--text-body-sm)] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Palabra
        </p>
        <h1 className="mt-4 max-w-full text-center font-[family-name:var(--font-display)] text-5xl font-semibold leading-tight sm:text-6xl">
          {word}
        </h1>
        <p className="mt-8 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Aciertos {roundCorrect}
          {allowSkip ? ` · Pases ${roundSkipped}` : ''}
        </p>
      </motion.div>

      <div className="relative z-10 grid grid-cols-2 gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-3 text-center">
          <p className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-text-muted)]">
            ← {allowSkip ? 'Pasar' : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/15 px-3 py-3 text-center">
          <p className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-accent)]">
            Correcto →
          </p>
        </div>
      </div>
    </div>
  );
}
