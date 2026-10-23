import { useEffect } from 'react';
import { gameStore, useGame } from '../../game/store';
import { uiStore, useUi, type TipId } from '../uiStore';

const TEXT: Record<TipId, { keys: string; touch: string }> = {
  move: {
    keys: 'Walk with W A S D. Turn the camera with Q and E. Esc opens the menu.',
    touch: 'Drag on the left side of the screen to walk.',
  },
  hoe: {
    keys: 'The hoe turns grass into soil you can plant.',
    touch: 'The hoe turns grass into soil you can plant.',
  },
  can: {
    keys: 'Water planted soil every day. Refill the can at the pond.',
    touch: 'Water planted soil every day. Refill the can at the pond.',
  },
  sickle: {
    keys: 'Cut weeds and harvest ripe crops with the sickle.',
    touch: 'Cut weeds and harvest ripe crops with the sickle.',
  },
  axe: {
    keys: 'Chop stumps for wood. It takes three swings.',
    touch: 'Chop stumps for wood. It takes three swings.',
  },
  hammer: {
    keys: 'Break rocks for stone. It also clears soil you tilled by mistake.',
    touch: 'Break rocks for stone. It also clears soil you tilled by mistake.',
  },
  seeds: {
    keys: 'Face tilled soil and press F to plant.',
    touch: 'Face tilled soil and tap ✋ to plant.',
  },
  bin: {
    keys: 'Anything in the bin sells overnight.',
    touch: 'Anything in the bin sells overnight.',
  },
  sleep: {
    keys: "It's getting late. Sleep in your bed to save and start a new day.",
    touch: "It's getting late. Sleep in your bed to save and start a new day.",
  },
};

/** One-time contextual tips (spec §3.11). */
export function Tips() {
  const tip = useUi((s) => s.tip);
  const touch = useGame((s) => s.device === 'touch');
  useEffect(() => {
    if (!tip) return;
    const id = setTimeout(() => {
      uiStore.getState().setTip(null);
    }, 7000);
    return () => {
      clearTimeout(id);
    };
  }, [tip]);
  if (!tip) return null;
  return (
    <div className="tip" role="note">
      <p>{touch ? TEXT[tip].touch : TEXT[tip].keys}</p>
      <button
        type="button"
        className="btn btn-quiet"
        onClick={() => {
          uiStore.getState().setTip(null);
        }}
      >
        Got it
      </button>
    </div>
  );
}

/** Show a tip only the first time; remembers it in settings. */
export function offerTip(id: TipId): void {
  const s = gameStore.getState();
  if (s.settings.seenTips.includes(id) || uiStore.getState().tip) return;
  s.updateSettings({ seenTips: [...s.settings.seenTips, id] });
  uiStore.getState().setTip(id);
}
