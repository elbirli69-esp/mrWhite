import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadReadableMode } from './utils/storage';

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

  if (path === '/mrwhite') {
    document.documentElement.dataset.app = 'mrwhite';
    document.title = 'Mr White';
    document.documentElement.dataset.readable = loadReadableMode() ? 'true' : 'false';
    await import('./index.css');
    const { default: App } = await import('./App');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    return;
  }

  document.documentElement.dataset.app = 'hub';
  document.title = 'Elige app';
  await import('./hub.css');
  const { HubPage } = await import('./pages/HubPage');
  root.render(
    <StrictMode>
      <HubPage />
    </StrictMode>,
  );
}

void boot();
