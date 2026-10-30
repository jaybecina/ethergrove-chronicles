import type { StoreApi } from 'zustand/vanilla';
import type { GameStore } from '../game/store';
import type { MenuSound } from './soundMap';

/** Elements inside these are menus; HUD buttons (hotbar, touch actions) are not, and stay silent. */
export const MENU_SELECTOR = '.title-screen, .screen, .panel';
const CLOSE_SELECTOR = '.panel-head .icon-btn';
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);
/** A close that follows a click within this window was caused by it, so it doesn't blip twice. */
const FOLLOW_MS = 150;

const inMenu = (el: Element | null) => el?.closest(MENU_SELECTOR) != null;

/** Console-style menu blips (spec §8), from document-level listeners so no component changes. */
export function installMenuSounds(
  play: (id: MenuSound) => void,
  store: StoreApi<GameStore>,
): () => void {
  let lastClick = -Infinity;

  const onKey = (e: KeyboardEvent) => {
    if (!NAV_KEYS.has(e.key)) return;
    const before = document.activeElement;
    // After the whole dispatch: menu navigation and Tab move focus in later listeners or by default.
    setTimeout(() => {
      const after = document.activeElement;
      if (after !== before && inMenu(after)) play('menuMove');
    }, 0);
  };

  const onClick = (e: MouseEvent) => {
    const btn = (e.target as Element | null)?.closest<HTMLElement>('button, [role="button"]');
    if (!btn || !inMenu(btn)) return;
    if ((btn as HTMLButtonElement).disabled || btn.getAttribute('aria-disabled') === 'true') return;
    lastClick = performance.now();
    play(btn.matches(CLOSE_SELECTOR) ? 'menuBack' : 'menuConfirm');
  };

  const offStore = store.subscribe((s, p) => {
    const closed = p.overlay !== null && s.overlay === null;
    const backToTitle = s.screen === 'title' && (p.screen === 'slots' || p.screen === 'newGame');
    if ((closed || backToTitle) && performance.now() - lastClick > FOLLOW_MS) play('menuBack');
  });

  document.addEventListener('keydown', onKey, true);
  document.addEventListener('click', onClick);
  return () => {
    offStore();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('click', onClick);
  };
}
