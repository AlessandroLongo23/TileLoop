import React from 'react';
import ReactDOM from 'react-dom/client';
import { rehydrateStores, persistedStores } from '@tileloop/core';
import { installWebPlatform } from './platform/webPlatform';
import App from './App';
import './index.css';

// Keep a custom --vh in sync with the visual viewport (mobile browser chrome).
function syncViewportHeight() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

async function bootstrap() {
  installWebPlatform();
  syncViewportHeight();
  window.addEventListener('resize', syncViewportHeight);

  // Re-read persisted progress/settings now that the real storage is installed
  // (stores auto-hydrate at import time, before the platform is configured).
  await rehydrateStores(persistedStores);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
