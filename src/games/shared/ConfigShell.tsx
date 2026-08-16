import type { ReactNode } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

interface ConfigShellProps {
  title?: string;
  description?: string;
  children: ReactNode;
  error?: string | null;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export function ConfigShell({
  title = 'Configuración',
  description = 'Ajusta la partida. La última configuración se guarda sola.',
  children,
  error,
  canContinue,
  onBack,
  onContinue,
}: ConfigShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 min-h-11 text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] underline-offset-2 transition-colors hover:underline"
        >
          ← Volver
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
          {description}
        </p>
      </header>

      <Card>
        <div className="flex flex-col gap-8">{children}</div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-[var(--color-danger)]/45 bg-[var(--color-danger)]/15 px-4 py-3 text-[length:var(--text-body-sm)] font-medium text-[var(--color-danger)]"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={onContinue} disabled={!canContinue}>
            Continuar
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
}
