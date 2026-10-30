import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../game/store';
import { installMenuSounds } from './menuSounds';
import type { MenuSound } from './soundMap';

function mount(html: string) {
  document.body.innerHTML = html;
}
const button = (sel: string) => {
  const el = document.querySelector<HTMLButtonElement>(sel);
  if (!el) throw new Error(`no ${sel}`);
  return el;
};
/** Menu moves are checked after the key event has fully dispatched. */
const flush = () =>
  new Promise<void>((r) => {
    setTimeout(r, 0);
  });

describe('menu sounds', () => {
  let play: ReturnType<typeof vi.fn<(id: MenuSound) => void>>;
  let store: ReturnType<typeof createGameStore>;
  let dispose: () => void;

  beforeEach(() => {
    play = vi.fn<(id: MenuSound) => void>();
    store = createGameStore();
    dispose = installMenuSounds(play, store);
  });
  afterEach(() => {
    dispose();
    document.body.innerHTML = '';
  });

  it('blips when an arrow key moves the menu cursor', async () => {
    mount('<div class="panel"><button id="a">A</button><button id="b">B</button></div>');
    button('#a').focus();
    button('#a').addEventListener('keydown', () => {
      button('#b').focus();
    });
    button('#a').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await flush();
    expect(play.mock.calls).toEqual([['menuMove']]);
  });

  it('stays quiet when an arrow key does not move focus', async () => {
    mount('<div class="screen"><input id="name" /><button>Go</button></div>');
    const input = document.querySelector<HTMLInputElement>('#name');
    input?.focus();
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await flush();
    expect(play).not.toHaveBeenCalled();
  });

  it('confirms a menu button click', () => {
    mount('<main class="title-screen"><button id="go">New game</button></main>');
    button('#go').click();
    expect(play.mock.calls).toEqual([['menuConfirm']]);
  });

  it('plays back for the panel close button', () => {
    mount(
      '<div class="panel"><header class="panel-head"><button class="icon-btn" id="x">×</button></header></div>',
    );
    button('#x').click();
    expect(play.mock.calls).toEqual([['menuBack']]);
  });

  it('plays back when an overlay closes', () => {
    store.getState().setOverlay('pause');
    store.getState().setOverlay(null);
    expect(play.mock.calls).toEqual([['menuBack']]);
  });

  it('does not double-blip when a confirm closes the overlay', () => {
    mount('<div class="panel"><button id="ok">Sleep</button></div>');
    store.getState().setOverlay('sleep');
    button('#ok').click();
    store.getState().setOverlay(null);
    expect(play.mock.calls).toEqual([['menuConfirm']]);
  });

  it('plays back when leaving a sub-screen for the title', () => {
    store.getState().setScreen('slots');
    store.getState().setScreen('title');
    store.getState().setScreen('newGame');
    store.getState().setScreen('title');
    expect(play.mock.calls).toEqual([['menuBack'], ['menuBack']]);
  });

  it('ignores HUD and disabled buttons', () => {
    mount(
      '<div class="hud"><button id="tool">Hoe</button></div><div class="panel"><button id="off" disabled>Buy</button></div>',
    );
    button('#tool').click();
    button('#off').click();
    expect(play).not.toHaveBeenCalled();
  });

  it('stops listening once disposed', () => {
    dispose();
    mount('<main class="title-screen"><button id="go">Go</button></main>');
    button('#go').click();
    store.getState().setOverlay('pause');
    store.getState().setOverlay(null);
    expect(play).not.toHaveBeenCalled();
  });
});
