import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { NumberStepper } from '../components/NumberStepper';
import { Toggle } from '../components/Toggle';
import type { PublicRoomState } from '../../shared/protocol';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../shared/game-types';

interface OnlineLobbyPageProps {
  state: PublicRoomState;
  playerId: string;
  isHost: boolean;
  error: string | null;
  onSetReady: (ready: boolean) => void;
  onUpdateConfig: (config: {
    mrWhiteCount: number;
    farsanteCount: number;
    mrWhiteHasHints: boolean;
    adultMode: boolean;
  }) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

export function OnlineLobbyPage({
  state,
  playerId,
  isHost,
  error,
  onSetReady,
  onUpdateConfig,
  onStartGame,
  onLeave,
}: OnlineLobbyPageProps) {
  const me = state.seats.find((s) => s.playerId === playerId);
  const connected = state.seats.filter((s) => s.connected);
  const allReady =
    connected.length >= MIN_PLAYERS && connected.every((s) => s.ready);
  const playerCount = connected.length;
  const maxSpecial = Math.max(0, playerCount - 1);
  const normals = Math.max(
    0,
    playerCount - state.config.mrWhiteCount - state.config.farsanteCount,
  );

  const patchConfig = (
    partial: Partial<{
      mrWhiteCount: number;
      farsanteCount: number;
      mrWhiteHasHints: boolean;
      adultMode: boolean;
    }>,
  ) => {
    onUpdateConfig({
      mrWhiteCount: partial.mrWhiteCount ?? state.config.mrWhiteCount,
      farsanteCount: partial.farsanteCount ?? state.config.farsanteCount,
      mrWhiteHasHints: partial.mrWhiteHasHints ?? state.config.mrWhiteHasHints,
      adultMode: partial.adultMode ?? state.config.adultMode,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <button
          type="button"
          onClick={onLeave}
          className="mb-4 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          ← Salir
        </button>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Lobby
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Código{' '}
          <span className="font-mono tracking-[0.18em] text-[var(--color-accent)]">
            {state.code}
          </span>
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Comparte el código. Cuando todos estén listos, el anfitrión empieza.
        </p>
      </header>

      <Card>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Jugadores
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
              {connected.length} / {MAX_PLAYERS}
            </p>
          </div>
          {me ? (
            <Button
              fullWidth={false}
              variant={me.ready ? 'secondary' : 'primary'}
              className="min-w-[8.5rem]"
              onClick={() => onSetReady(!me.ready)}
            >
              {me.ready ? 'No listo' : 'Listo'}
            </Button>
          ) : null}
        </div>

        <ul className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)]">
          {state.seats.map((seat) => (
            <li
              key={seat.playerId}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p
                  className={[
                    'font-medium',
                    seat.connected ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]',
                  ].join(' ')}
                >
                  {seat.name}
                  {seat.playerId === playerId ? ' (tú)' : ''}
                  {seat.isHost ? ' · anfitrión' : ''}
                </p>
                {!seat.connected ? (
                  <p className="text-xs text-[var(--color-text-muted)]">Desconectado</p>
                ) : null}
              </div>
              <span
                className={[
                  'shrink-0 text-xs font-semibold uppercase tracking-wide',
                  seat.ready ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {seat.ready ? 'Listo' : 'Esperando'}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {isHost ? (
        <Card>
          <h2 className="mb-6 font-[family-name:var(--font-display)] text-lg font-semibold">
            Configuración
          </h2>
          <div className="flex flex-col gap-8">
            <NumberStepper
              label="Impostores"
              description="Sin palabra. Debe fingir."
              value={state.config.mrWhiteCount}
              min={0}
              max={maxSpecial}
              onChange={(mrWhiteCount) => {
                const room = Math.max(0, playerCount - 1 - mrWhiteCount);
                const farsanteCount = Math.min(state.config.farsanteCount, room);
                patchConfig({ mrWhiteCount, farsanteCount });
              }}
            />
            <NumberStepper
              label="Farsantes"
              description="Ven otra palabra de la misma familia, claramente distinta (sin saberlo)."
              value={state.config.farsanteCount}
              min={0}
              max={Math.max(0, playerCount - 1 - state.config.mrWhiteCount)}
              onChange={(farsanteCount) => patchConfig({ farsanteCount })}
            />
            <Toggle
              label="Pistas para el impostor"
              description="Recibe una pista de ambiente relacionada de lejos."
              checked={state.config.mrWhiteHasHints}
              onChange={(mrWhiteHasHints) => patchConfig({ mrWhiteHasHints })}
            />
            <Toggle
              label="Versión adultos"
              description="Pack de palabras +18."
              checked={state.config.adultMode}
              onChange={(adultMode) => patchConfig({ adultMode })}
            />
          </div>
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            Jugadores normales estimados:{' '}
            <span className="font-semibold text-[var(--color-text)]">{normals}</span>
            {playerCount < MIN_PLAYERS
              ? ` · Faltan ${MIN_PLAYERS - playerCount} para empezar`
              : null}
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">
            Impostores: {state.config.mrWhiteCount} · Farsantes: {state.config.farsanteCount}
            {state.config.mrWhiteHasHints ? ' · Con pistas' : ''}
            {state.config.adultMode ? ' · +18' : ''}
          </p>
        </Card>
      )}

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </div>
      ) : null}

      {isHost ? (
        <Button onClick={onStartGame} disabled={!allReady}>
          Empezar partida
        </Button>
      ) : (
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          Esperando a que el anfitrión empiece…
        </p>
      )}
    </div>
  );
}
