interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleProps) {
  return (
    <div
      className={[
        'flex items-start justify-between gap-4',
        disabled ? 'opacity-45' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-[var(--color-text)]">{label}</p>
        {description ? (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
          'disabled:cursor-not-allowed',
          checked
            ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
        ].join(' ')}
      >
        <span
          aria-hidden
          className={[
            'absolute top-1 left-1 h-6 w-6 rounded-full bg-[var(--color-text)] shadow transition-transform',
            checked ? 'translate-x-6 bg-[var(--color-bg)]' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
