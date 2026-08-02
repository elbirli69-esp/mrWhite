import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { NumberStepper } from '../components/NumberStepper';
import type { GameConfig } from '../types/game';
import { MAX_PLAYERS, MIN_PLAYERS } from '../types/game';
import type { ValidationResult } from '../utils/validation';

interface ConfigPageProps {
  config: GameConfig;
  validation: ValidationResult;
  onChange: (partial: Partial<GameConfig>) => void;
  onStart: () => void;
  onBack: () => void;
}

export function ConfigPage({
  config,
  validation,
  onChange,
  onStart,
  onBack,
}: ConfigPageProps) {
  const maxSpecial = Math.max(0, config.playerCount - 1);

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
          Configuración
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Ajusta la partida. La última configuración se guarda sola.
        </p>
      </header>

      <Card>
        <div className="flex flex-col gap-8">
          <NumberStepper
            label="Jugadores"
            description={`Entre ${MIN_PLAYERS} y ${MAX_PLAYERS}`}
            value={config.playerCount}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            onChange={(playerCount) => {
              const next: Partial<GameConfig> = { playerCount };
              const cap = Math.max(0, playerCount - 1);
              if (config.mrWhiteCount > cap) next.mrWhiteCount = cap;
              if (config.farsanteCount > cap) {
                next.farsanteCount = Math.min(config.farsanteCount, cap);
              }
              const mw = next.mrWhiteCount ?? config.mrWhiteCount;
              const fs = next.farsanteCount ?? config.farsanteCount;
              if (mw + fs >= playerCount) {
                next.farsanteCount = Math.max(0, playerCount - 1 - mw);
              }
              onChange(next);
            }}
          />

          <NumberStepper
            label="Mr White"
            description="Sin palabra, pero con una pista para improvisar."
            value={config.mrWhiteCount}
            min={0}
            max={maxSpecial}
            onChange={(mrWhiteCount) => {
              const room = config.playerCount - 1 - mrWhiteCount;
              const farsanteCount =
                config.farsanteCount > room ? Math.max(0, room) : config.farsanteCount;
              onChange({ mrWhiteCount, farsanteCount });
            }}
          />

          <NumberStepper
            label="Farsantes"
            description="Ven una palabra parecida (sin saberlo)."
            value={config.farsanteCount}
            min={0}
            max={Math.max(0, config.playerCount - 1 - config.mrWhiteCount)}
            onChange={(farsanteCount) => onChange({ farsanteCount })}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          Jugadores normales:{' '}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.max(0, config.playerCount - config.mrWhiteCount - config.farsanteCount)}
          </span>
        </div>

        {!validation.valid && validation.error ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]"
          >
            {validation.error}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={onStart} disabled={!validation.valid}>
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
