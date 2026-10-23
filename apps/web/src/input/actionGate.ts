/** Lets a held button fire once on press, then at most once per repeatMs. */
export function createActionGate(repeatMs = 350): {
  allow(pressed: boolean, nowMs: number): boolean;
} {
  let last: number | null = null;
  return {
    allow(pressed, nowMs) {
      if (!pressed) {
        last = null;
        return false;
      }
      if (last === null || nowMs - last >= repeatMs) {
        last = nowMs;
        return true;
      }
      return false;
    },
  };
}
