import { createNewGame } from '@hearthvale/core';
import { useGame, gameStore } from './game/store';
import { getInputSystem } from './input/system';
import { GameCanvas } from './scene/GameCanvas';
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

export function App() {
  const screen = useGame((s) => s.screen);
  const { touch } = getInputSystem();
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <GameCanvas />
      {screen === 'game' ? (
        <>
          <Joystick source={touch} />
          <ActionButtons source={touch} />
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
