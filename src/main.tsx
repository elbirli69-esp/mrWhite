import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import {
  APP_BRAND,
  canonicalPartyPath,
  resolvePartyRoute,
} from './brand';
import {
  clearChunkReloadGuard,
  shouldReloadForChunkError,
} from './utils/chunkLoadRecovery';
import { loadReadableMode } from './utils/storage';

/** Tras un deploy, chunks viejos (p. ej. transformers.web-HASH.js) ya no existen. */
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (shouldReloadForChunkError()) {
    window.location.reload();
  }
});

/** Actualiza la PWA en cuanto hay una versión nueva (evita mensajes viejos en el móvil). */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true);
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      void registration.update();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.setInterval(check, 30_000);
    check();
  },
});

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('No se encontró el elemento #root');
}

const root = createRoot(rootEl);

function normalizePath(): string {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

async function boot() {
  const path = normalizePath();

  const redirectTo = canonicalPartyPath(path);
  if (redirectTo) {
    window.history.replaceState(null, '', redirectTo);
    window.location.replace(redirectTo);
    return;
  }

  if (path === '/staycalm') {
    document.documentElement.dataset.app = 'staycalm';
    document.title = 'stayCalm';
    await import('../stayCalm/src/index.css');
    const { default: StayCalmApp } = await import('../stayCalm/src/App');
    root.render(
      <StrictMode>
        <StayCalmApp />
      </StrictMode>,
    );
    return;
  }

  if (path === '/bulardocreator') {
    document.documentElement.dataset.app = 'bulardo';
    document.title = 'bulardoCreator';
    await import('../bulardoCreator/src/index.css');
    const { default: BulardoApp } = await import('../bulardoCreator/src/App');
    root.render(
      <StrictMode>
        <BulardoApp />
      </StrictMode>,
    );
    return;
  }

  const party = resolvePartyRoute(path);
  if (party) {
    document.documentElement.dataset.app = party.app;
    document.title = party.title;
    document.documentElement.dataset.readable = loadReadableMode() ? 'true' : 'false';
    await import('./index.css');
    const { default: App } = await party.loader();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    return;
  }

  document.documentElement.dataset.app = 'hub';
  document.title = APP_BRAND;
  await import('./hub.css');
  const { HubPage } = await import('./pages/HubPage');
  root.render(
    <StrictMode>
      <HubPage />
    </StrictMode>,
  );
}

void boot().then(() => {
  // Arranque OK: resetear el contador de recargas por chunks viejos.
  window.setTimeout(() => clearChunkReloadGuard(), 3_000);
});
