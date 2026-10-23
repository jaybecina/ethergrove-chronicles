import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { gameStore } from './game/store';

if (import.meta.env.VITE_E2E === 'true') {
  void import('./game/debugHook').then((m) => {
    m.installDebugHook(gameStore);
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
