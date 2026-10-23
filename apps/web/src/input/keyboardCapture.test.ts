import { afterEach, describe, expect, it } from 'vitest';
import { createKeyboardSource } from './keyboard';
import { createResumeGuard } from './resumeGuard';

const press = (target: EventTarget, code: string, key = code) => {
  const e = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  target.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }));
  return e;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('keyboard capture (review finding 1)', () => {
  it('typing a space in a text field is not blocked or treated as an action', () => {
    const kb = createKeyboardSource(window, { capture: () => true });
    const input = document.body.appendChild(document.createElement('input'));
    const e = press(input, 'Space', ' ');
    expect(e.defaultPrevented).toBe(false);
    expect(kb.read().primary).toBe(false);
    kb.dispose();
  });

  it('in menus Space and Tab keep their normal behaviour and do not reach the game', () => {
    const kb = createKeyboardSource(window, { capture: () => false });
    const button = document.body.appendChild(document.createElement('button'));
    expect(press(button, 'Space', ' ').defaultPrevented).toBe(false);
    expect(press(button, 'Tab', 'Tab').defaultPrevented).toBe(false);
    const r = kb.read();
    expect(r.primary).toBe(false);
    expect(r.menu ?? false).toBe(false);
    kb.dispose();
  });

  it('Escape still works as the menu key while a menu is open', () => {
    const kb = createKeyboardSource(window, { capture: () => false });
    press(window, 'Escape', 'Escape');
    expect(kb.read().menu).toBe(true);
    kb.dispose();
  });

  it('in play Space and Tab are captured', () => {
    const kb = createKeyboardSource(window, { capture: () => true });
    expect(press(window, 'Space', ' ').defaultPrevented).toBe(true);
    expect(press(window, 'Tab', 'Tab').defaultPrevented).toBe(true);
    expect(kb.read()).toMatchObject({ primary: true, menu: true });
    kb.dispose();
  });
});

describe('resume guard (review finding 5)', () => {
  it('a button held while a menu closes does not fire until released', () => {
    const guard = createResumeGuard();
    expect(guard.filter(true, false)).toBe(false); // A pressed on a dialog
    expect(guard.filter(true, true)).toBe(false); // dialog closed, A still held
    expect(guard.filter(false, true)).toBe(false); // released
    expect(guard.filter(true, true)).toBe(true); // a new press works
  });

  it('presses that start during play pass straight through', () => {
    const guard = createResumeGuard();
    expect(guard.filter(true, true)).toBe(true);
  });
});
