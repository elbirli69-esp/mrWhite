import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ScreenShellProps {
  children: ReactNode;
  screenKey: string;
  centered?: boolean;
  /** Pantalla a pantalla completa sin padding (p. ej. "Pasa el móvil"). */
  bleed?: boolean;
}

export function ScreenShell({
  children,
  screenKey,
  centered = true,
  bleed = false,
}: ScreenShellProps) {
  return (
    <div className="relative min-h-dvh w-full overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,184,109,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,245,244,0.04),transparent_45%)]"
      />
      <AnimatePresence mode="wait">
        <motion.main
          key={screenKey}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={[
            'relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-y-auto',
            bleed ? '' : 'px-5 py-8 sm:px-6 sm:py-10',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {centered && !bleed ? (
            <div className="my-auto flex w-full flex-col">{children}</div>
          ) : (
            children
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
