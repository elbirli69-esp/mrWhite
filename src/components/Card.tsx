import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className = '', padded = true }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_16px_48px_rgba(0,0,0,0.45)]',
        padded ? 'p-6 sm:p-8' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </motion.div>
  );
}
