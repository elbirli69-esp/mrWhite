import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface NamesPageProps {
  names: string[];
  error: string | null;
  onChangeName: (index: number, name: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function NamesPage({
  names,
  error,
  onChangeName,
  onContinue,
  onBack,
}: NamesPageProps) {
  const canContinue = !error;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          ← Volver
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Nombres
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Escribe el nombre de cada jugador antes del reparto.
        </p>
      </header>

      <Card>
        <div className="flex flex-col gap-4">
          {names.map((name, index) => (
            <label key={index} className="flex flex-col gap-1.5">
              <span className="text-sm text-[var(--color-text-muted)]">
                Jugador {index + 1}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => onChangeName(index, e.target.value)}
                placeholder={`Nombre del jugador ${index + 1}`}
                autoComplete="off"
                maxLength={24}
                className="h-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/50 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
              />
            </label>
          ))}
        </div>

        {error && names.some((n) => n.trim()) ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={onContinue} disabled={!canContinue}>
            Empezar reparto
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Cambiar configuración
          </Button>
        </div>
      </Card>
    </div>
  );
}
