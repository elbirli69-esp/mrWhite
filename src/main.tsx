import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { loadReadableMode } from './utils/storage';

/** Aplica modo legible antes del primer paint de React para evitar parpadeo. */
document.documentElement.dataset.readable = loadReadableMode() ? 'true' : 'false';

const root = document.getElementById('root');

if (!root) {
  throw new Error('No se encontró el elemento #root');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
