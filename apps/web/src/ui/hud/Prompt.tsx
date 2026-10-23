import { useGame } from '../../game/store';
import { promptsFor } from '../labels';

const KEYS = {
  keyboard: { primary: 'Space', secondary: 'F' },
  gamepad: { primary: 'A', secondary: 'X' },
  touch: null,
} as const;

/** What the action buttons will do on the tile you're facing. */
export function Prompt() {
  const game = useGame((s) => s.game);
  const device = useGame((s) => s.device);
  if (!game) return null;
  const { primary, secondary } = promptsFor(game);
  if (!primary && !secondary) return null;
  const keys = KEYS[device];
  return (
    <div className="hud-prompt" aria-live="polite">
      {primary && (
        <span className="prompt-chip">
          {keys && <kbd>{keys.primary}</kbd>}
          {primary}
        </span>
      )}
      {secondary && (
        <span className="prompt-chip">
          {keys && <kbd>{keys.secondary}</kbd>}
          {secondary}
        </span>
      )}
    </div>
  );
}
