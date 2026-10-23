/**
 * After the clock resumes (a dialog closed), a still-held action button must be released
 * before it acts, so confirming a dialog never swings a tool at nothing.
 */
export function createResumeGuard(): { filter(pressed: boolean, running: boolean): boolean } {
  let blocked = false;
  return {
    filter(pressed, running) {
      if (!running) {
        if (pressed) blocked = true;
        return false;
      }
      if (!pressed) blocked = false;
      return pressed && !blocked;
    },
  };
}
