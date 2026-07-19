import type { ChangeEvent } from 'react';

interface NumberStepperProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function NumberStepper({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: NumberStepperProps) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Number.parseInt(e.target.value, 10);
    if (Number.isNaN(next)) return;
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            {label}
          </p>
          {description ? (
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Disminuir ${label}`}
          onClick={decrease}
          disabled={value <= min}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-2xl font-light text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-30"
        >
          −
        </button>

        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={onInput}
          aria-label={label}
          className="h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-center font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={increase}
          disabled={value >= max}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-2xl font-light text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
