import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/store';

const fmt = new Intl.NumberFormat('en-US');
const DURATION = 600;
const TICK = 30;

export function Gold() {
  const gold = useGame((s) => s.game?.gold ?? 0);
  const [shown, setShown] = useState(gold);
  const from = useRef(gold);

  useEffect(() => {
    const start = from.current;
    if (start === gold) return;
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += TICK;
      const k = Math.min(1, elapsed / DURATION);
      const v = Math.round(start + (gold - start) * (1 - (1 - k) ** 3));
      from.current = v;
      setShown(v);
      if (k >= 1) clearInterval(id);
    }, TICK);
    return () => {
      clearInterval(id);
    };
  }, [gold]);

  return (
    <div className="hud-gold" role="status" aria-live="polite" aria-label="Gold">
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
        <circle cx="10" cy="10" r="8" className="coin" />
        <circle cx="10" cy="10" r="5" className="coin-inner" />
      </svg>
      <span>{fmt.format(shown)}</span>
    </div>
  );
}
