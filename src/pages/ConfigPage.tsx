import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { NumberStepper } from '../components/NumberStepper';
import { Toggle } from '../components/Toggle';
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
          className="mb-4 min-h-11 text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] underline-offset-2 transition-colors hover:underline"
        >
          ← Volver
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Configuración
        </h1>
        <p className="mt-2 text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--color-text-muted)]">
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
            description={
              config.mrWhiteHasHints
                ? 'Sin palabra, pero con una pista para improvisar.'
                : 'Sin palabra. Debe fingir.'
            }
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

          <Toggle
            label="Pistas para Mr White"
            description="Si está activo, Mr White ve una pista cercana a la palabra secreta."
            checked={config.mrWhiteHasHints}
            disabled={config.mrWhiteCount === 0}
            onChange={(mrWhiteHasHints) => onChange({ mrWhiteHasHints })}
          />

          <Toggle
            label="Versión adultos (+18)"
            description="Solo palabras malsonantes, sexo y humor gordo. Apágalo si hay menores o no apetece."
            checked={config.adultMode}
            onChange={(adultMode) => onChange({ adultMode })}
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

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Jugadores normales:{' '}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.max(0, config.playerCount - config.mrWhiteCount - config.farsanteCount)}
          </span>
        </div>

        {!validation.valid && validation.error ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-[var(--color-danger)]/45 bg-[var(--color-danger)]/15 px-4 py-3 text-[length:var(--text-body-sm)] font-medium text-[var(--color-danger)]"
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
