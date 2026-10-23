import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Arrow keys (and gamepad d-pad, which the loop turns into arrow keys) move focus inside a menu. */
export function useMenuNavigation(ref: RefObject<HTMLElement | null>, autoFocus = true): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    const previous = document.activeElement as HTMLElement | null;
    if (autoFocus) items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      if (target.getAttribute('type') === 'range') return;
      const list = items();
      if (list.length === 0) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement as HTMLElement);
      list[(i + dir + list.length) % list.length]?.focus();
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [ref, autoFocus]);
}
