import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui/theme.css';
import './ui/lessons/lessons.css';
import { gameStore } from './game/store';
import { parseProfileOff, setProfileOff } from './render/profileSwitches';

if (import.meta.env.VITE_E2E === 'true') {
  // Frame-rate profile switches (spec §7.3), read before the 3D scene mounts.
  setProfileOff(parseProfileOff(window.location.search));
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
