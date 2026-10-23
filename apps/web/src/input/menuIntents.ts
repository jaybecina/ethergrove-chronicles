import type { StoreApi } from 'zustand/vanilla';
import type { GameStore } from '../game/store';
import type { Intents } from './intents';

const NAV_KEY = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
} as const;

/**
 * Gamepad d-pad / A / B in menus. Synthetic key events are untrusted and trigger no browser
 * default action, so form controls are driven directly.
 */
export function applyMenuIntent(intents: Intents, store: StoreApi<GameStore>): void {
  const target = (document.activeElement as HTMLElement | null) ?? document.body;
  const s = store.getState();
  const inMenu = s.overlay !== null || s.screen !== 'game';
  const input = target instanceof HTMLInputElement ? target : null;

  if (intents.nav) {
    if (input?.type === 'range' && (intents.nav === 'left' || intents.nav === 'right')) {
      if (intents.nav === 'right') input.stepUp();
      else input.stepDown();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key: NAV_KEY[intents.nav], bubbles: true }),
      );
    }
  }
  if (intents.confirm && inMenu) {
    const clickable =
      target instanceof HTMLButtonElement || input?.type === 'checkbox' || input?.type === 'radio';
    if (clickable) target.click();
  }
  if (intents.back && s.overlay) s.setOverlay(null);
}
