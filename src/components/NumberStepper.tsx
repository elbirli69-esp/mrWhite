import type { ChangeEvent } from 'react';

interface NumberStepperProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /**
   * Valores permitidos (p. ej. 30, 45, 60, 90).
   * Si se indica, +/− salta entre esas opciones en lugar de ir de 1 en 1.
   */
  options?: readonly number[];
}

function nearestOption(options: readonly number[], value: number): number {
  return options.reduce((best, n) =>
    Math.abs(n - value) < Math.abs(best - value) ? n : best,
  );
}

export function NumberStepper({
  label,
  description,
  value,
  min,
  max,
  onChange,
  options,
}: NumberStepperProps) {
  const sortedOptions = options ? [...options].sort((a, b) => a - b) : null;
  const effectiveMin = sortedOptions ? sortedOptions[0]! : min;
  const effectiveMax = sortedOptions ? sortedOptions[sortedOptions.length - 1]! : max;
  const current = sortedOptions ? nearestOption(sortedOptions, value) : value;
  const currentIndex = sortedOptions ? sortedOptions.indexOf(current) : -1;

  const decrease = () => {
    if (sortedOptions) {
      if (currentIndex <= 0) return;
      onChange(sortedOptions[currentIndex - 1]!);
      return;
    }
    onChange(Math.max(effectiveMin, value - 1));
  };

  const increase = () => {
    if (sortedOptions) {
      if (currentIndex < 0 || currentIndex >= sortedOptions.length - 1) return;
      onChange(sortedOptions[currentIndex + 1]!);
      return;
    }
    onChange(Math.min(effectiveMax, value + 1));
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Number.parseInt(e.target.value, 10);
    if (Number.isNaN(next)) return;
    if (sortedOptions) {
      onChange(nearestOption(sortedOptions, next));
      return;
    }
    onChange(Math.min(effectiveMax, Math.max(effectiveMin, next)));
  };

  const atMin = sortedOptions ? currentIndex <= 0 : value <= effectiveMin;
  const atMax = sortedOptions
    ? currentIndex < 0 || currentIndex >= sortedOptions.length - 1
    : value >= effectiveMax;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            {label}
          </p>
          {description ? (
            <p className="mt-1 text-[length:var(--text-body-sm)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Disminuir ${label}`}
          onClick={decrease}
          disabled={atMin}
          className="flex h-[var(--touch-min)] w-[var(--touch-min)] shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-2xl font-light text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-30"
        >
          −
        </button>

        <input
          type="number"
          inputMode="numeric"
          min={effectiveMin}
          max={effectiveMax}
          step={sortedOptions ? undefined : 1}
          value={current}
          onChange={onInput}
          aria-label={label}
          className="h-[var(--touch-min)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-center font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={increase}
          disabled={atMax}
          className="flex h-[var(--touch-min)] w-[var(--touch-min)] shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-2xl font-light text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
