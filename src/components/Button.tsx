import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-bg)] hover:brightness-110 active:scale-[0.98] shadow-[0_8px_24px_rgba(232,184,109,0.25)]',
  secondary:
    'bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] active:scale-[0.98]',
  danger:
    'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/25 active:scale-[0.98]',
};

export function Button({
  children,
  variant = 'primary',
  fullWidth = true,
  className = '',
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold tracking-tight transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        fullWidth ? 'w-full' : '',
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </motion.button>
  );
}
