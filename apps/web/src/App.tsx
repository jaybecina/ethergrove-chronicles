import { createNewGame } from '@hearthvale/core';
import { useEffect } from 'react';
import { gameStore, useGame } from './game/store';
import { getInputSystem } from './input/system';
import { GameCanvas } from './scene/GameCanvas';
import { Hud } from './ui/hud/Hud';
import { ActionButtons } from './ui/touch/ActionButtons';
import { Joystick } from './ui/touch/Joystick';

// Temporary shell until the real screens land (Task 23).
function startDevGame() {
  const s = gameStore.getState();
  s.startGame(
    createNewGame({ seed: Date.now() % 100000, farmName: 'Hearthvale', playerName: 'Farmer' }),
    1,
  );
  if (window.innerHeight > window.innerWidth) s.zoom(1);
  s.setScreen('game');
}

const coarse = () => window.matchMedia('(pointer: coarse)').matches;

export function App() {
  const screen = useGame((s) => s.screen);
  const device = useGame((s) => s.device);
  const settings = useGame((s) => s.settings);
  const { touch } = getInputSystem();
  const showTouch = device === 'touch' || coarse();

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  }, [settings.textScale, settings.reducedMotion]);

  return (
    <div className={`app${showTouch ? ' is-touch' : ''}`}>
      <GameCanvas />
      {screen === 'game' ? (
        <>
          <Hud />
          {showTouch && <Joystick source={touch} />}
          {showTouch && <ActionButtons source={touch} />}
        </>
      ) : (
        <button
          type="button"
          onClick={startDevGame}
          style={{ position: 'fixed', top: 20, left: 20 }}
        >
          Start
        </button>
      )}
    </div>
  );
}
