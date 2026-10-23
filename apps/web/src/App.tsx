import { createNewGame } from '@hearthvale/core';
import { useEffect } from 'react';
import { installAudio } from './audio/install';
import { eventBus } from './game/eventBus';
import { gameStore, useGame } from './game/store';
import { getInputSystem } from './input/system';
import { installAutosave } from './save/autosave';
import { saveRepo } from './save/repo';
import { GameCanvas } from './scene/GameCanvas';
import { Hud } from './ui/hud/Hud';
import { MerchantCart } from './ui/screens/MerchantCart';
import { MorningReport } from './ui/screens/MorningReport';
import { Intro } from './ui/screens/Intro';
import { NewGame } from './ui/screens/NewGame';
import { Pause } from './ui/screens/Pause';
import { SaveSlots } from './ui/screens/SaveSlots';
import { ShippingBin } from './ui/screens/ShippingBin';
import { SleepConfirm } from './ui/screens/SleepConfirm';
import { Tips, offerTip } from './ui/screens/Tips';
import { Title } from './ui/screens/Title';
import { Toasts } from './ui/screens/Toasts';
import { ActionButtons } from './ui/touch/ActionButtons';
import { Joystick } from './ui/touch/Joystick';
import { installUiBridge } from './ui/uiBridge';
import { useUi } from './ui/uiStore';

/** A fixed, pretty farm at golden hour behind the title screen. */
function showcase() {
  const g = createNewGame({ seed: 7, farmName: '', playerName: '' });
  return {
    ...g,
    calendar: { ...g.calendar, minute: 1030 },
    player: { ...g.player, x: 12.5, z: 12.5 },
  };
}

const coarse = () => window.matchMedia('(pointer: coarse)').matches;

export function App() {
  const screen = useGame((s) => s.screen);
  const overlay = useGame((s) => s.overlay);
  const device = useGame((s) => s.device);
  const settings = useGame((s) => s.settings);
  const slotsMode = useUi((s) => s.slotsMode);
  const { touch } = getInputSystem();
  const showTouch = device === 'touch' || coarse();

  useEffect(() => {
    if (!gameStore.getState().game) gameStore.getState().replaceGame(showcase());
    const offBridge = installUiBridge(gameStore, eventBus);
    const offSave = installAutosave(gameStore, saveRepo, eventBus);
    const offAudio = installAudio(gameStore, eventBus);
    return () => {
      offBridge();
      offSave();
      offAudio();
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  }, [settings.textScale, settings.reducedMotion]);

  useEffect(() => {
    if (screen === 'game') offerTip('move');
  }, [screen]);

  useEffect(() => {
    if (screen === 'title') {
      const g = gameStore.getState().game;
      if (g?.farmName) gameStore.getState().replaceGame(showcase());
    }
  }, [screen]);

  return (
    <div className={`app${showTouch ? ' is-touch' : ''}`}>
      <GameCanvas />
      {screen === 'title' && <Title />}
      {screen === 'slots' && <SaveSlots mode={slotsMode} />}
      {screen === 'newGame' && <NewGame />}
      {screen === 'intro' && <Intro />}
      {screen === 'game' && (
        <>
          <Hud />
          {showTouch && overlay === null && <Joystick source={touch} />}
          {showTouch && overlay === null && <ActionButtons source={touch} />}
          {overlay === 'pause' && <Pause />}
          {overlay === 'bin' && <ShippingBin />}
          {overlay === 'cart' && <MerchantCart />}
          {overlay === 'sleep' && <SleepConfirm />}
          {overlay === 'morning' && <MorningReport />}
          <Tips />
        </>
      )}
      <Toasts />
    </div>
  );
}
