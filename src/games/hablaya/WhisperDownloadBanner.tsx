import { Button } from '../../components/Button';

type Props = {
  status: 'loading' | 'ready' | 'error';
  progress: number;
  message: string;
  error: string | null;
  onRetry: () => void;
};

/** Estado de descarga de Whisper en la home de Habla ya. */
export function WhisperDownloadBanner({ status, progress, message, error, onRetry }: Props) {
  if (status === 'ready') {
    return (
      <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-[length:var(--text-body-sm)] text-emerald-100">
        <p className="font-semibold text-emerald-50">Whisper listo en el dispositivo</p>
        <p className="mt-1 text-emerald-100/85">{message}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-[length:var(--text-body-sm)] text-rose-100">
        <p className="font-semibold text-rose-50">No se pudo preparar Whisper</p>
        <p className="mt-1 text-rose-100/90">{error || message}</p>
        <div className="mt-3">
          <Button variant="secondary" onClick={onRetry}>
            Reintentar descarga
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
      <p className="font-semibold text-[var(--color-text)]">Descargando Whisper en local…</p>
      <p className="mt-1">{message}</p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>
      <p className="mt-2 tabular-nums text-[length:var(--text-body-sm)]">{progress}%</p>
      <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
        La primera vez descarga el modelo (móvil: base; PC: small). Luego queda en caché. Habla
        cerca del micrófono; puedes corregir la transcripción antes de puntuar.
      </p>
    </div>
  );
}
