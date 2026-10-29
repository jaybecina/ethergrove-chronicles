import { BALANCE } from '@ethergrove/core';
import { useGame } from '../../game/store';

export function Stamina() {
  const stamina = useGame((s) => s.game?.player.stamina ?? 0);
  const pct = (stamina / BALANCE.maxStamina) * 100;
  const low = stamina <= BALANCE.staminaLowAt;
  return (
    <div
      className={`hud-stamina${low ? ' is-low' : ''}${stamina <= 0 ? ' is-empty' : ''}`}
      role="progressbar"
      aria-label="Stamina"
      aria-valuemin={0}
      aria-valuemax={BALANCE.maxStamina}
      aria-valuenow={Math.round(stamina)}
    >
      <span className="stamina-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
