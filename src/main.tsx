import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadReadableMode } from './utils/storage';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('No se encontró el elemento #root');
}

const root = createRoot(rootEl);

function isStayCalmPath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === '/staycalm' || path.endsWith('/staycalm');
}

async function boot() {
  if (isStayCalmPath()) {
    document.documentElement.dataset.app = 'staycalm';
    await import('../stayCalm/src/index.css');
    const { default: StayCalmApp } = await import('../stayCalm/src/App');
    root.render(
      <StrictMode>
        <StayCalmApp />
      </StrictMode>,
    );
    return;
  }

  document.documentElement.dataset.readable = loadReadableMode() ? 'true' : 'false';
  await import('./index.css');
  const { default: App } = await import('./App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
