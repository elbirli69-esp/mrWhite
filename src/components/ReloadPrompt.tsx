import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';

/** Aviso cuando la app está lista offline o hay una actualización. */
export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <p className="text-sm text-[var(--color-text)]">
          {offlineReady
            ? 'Mr White listo para jugar sin conexión.'
            : 'Hay una nueva versión disponible.'}
        </p>
        <div className="flex gap-2">
          {needRefresh ? (
            <Button fullWidth={false} className="flex-1" onClick={() => updateServiceWorker(true)}>
              Actualizar
            </Button>
          ) : null}
          <Button fullWidth={false} variant="secondary" className="flex-1" onClick={close}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
