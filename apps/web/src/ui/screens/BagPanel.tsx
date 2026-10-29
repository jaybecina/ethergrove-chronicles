import type { Command } from '@ethergrove/core';
import { useState } from 'react';
import { gameStore, useGame } from '../../game/store';
import { ItemIcon } from '../icons';
import { displayName } from '../labels';

/** Pick a cell, then another to swap; pin the picked item to a quick slot. */
export function BagPanel() {
  const bag = useGame((s) => s.game?.bag);
  const quick = useGame((s) => s.game?.quickSlots);
  const [picked, setPicked] = useState<number | null>(null);
  if (!bag || !quick) return null;
  const dispatch = (cmd: Command) => gameStore.getState().dispatch(cmd);
  const pickedItem = picked === null ? null : bag[picked];
  return (
    <div className="bag">
      <p className="muted">
        Choose an item, then another slot to move it. Pin items to keys 6 to 8 for quick use.
      </p>
      <div className="bag-grid">
        {bag.map((cell, i) => {
          const pin = quick.indexOf(i);
          return (
            <button
              key={i}
              type="button"
              className={`bag-cell${picked === i ? ' is-picked' : ''}${cell ? '' : ' is-empty'}`}
              aria-pressed={picked === i}
              onClick={() => {
                if (picked === null) {
                  if (cell) setPicked(i);
                  return;
                }
                if (picked !== i) dispatch({ type: 'moveBagItem', from: picked, to: i });
                setPicked(null);
              }}
            >
              <span className="sr-only">
                {cell ? `${displayName(cell.id)}, ` : `Empty bag slot ${i + 1}`}
              </span>
              {cell && <ItemIcon id={cell.id} size={30} />}
              {cell && <span className="slot-qty">{cell.qty}</span>}
              {pin >= 0 && (
                <span className="pin">
                  <span className="sr-only">, key </span>
                  {pin + 6}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {pickedItem && picked !== null && (
        <div className="row">
          <span>{displayName(pickedItem.id)}</span>
          {([0, 1, 2] as const).map((q) => (
            <button
              key={q}
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                dispatch({ type: 'assignQuickSlot', slot: q, bagIndex: picked });
                setPicked(null);
              }}
            >
              Pin to {q + 6}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
