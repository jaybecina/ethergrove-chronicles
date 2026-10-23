import { BALANCE, TOOL_ORDER, type HotbarIndex } from '@hearthvale/core';
import { gameStore, useGame } from '../../game/store';
import { ItemIcon, ToolIcon } from '../icons';
import { displayName } from '../labels';

export function Hotbar() {
  const active = useGame((s) => s.game?.activeSlot ?? 0);
  const charges = useGame((s) => s.game?.canCharges ?? 0);
  const quick = useGame((s) => s.game?.quickSlots);
  const bag = useGame((s) => s.game?.bag);
  if (!quick || !bag) return null;
  const select = (index: HotbarIndex) => {
    gameStore.getState().dispatch({ type: 'selectHotbar', index });
  };
  const ring = (charges / BALANCE.canCharges) * 100;

  return (
    <div className="hud-hotbar" role="tablist" aria-label="Hotbar">
      {TOOL_ORDER.map((tool, i) => (
        <button
          key={tool}
          type="button"
          role="tab"
          aria-selected={active === i}
          className="slot slot-tool"
          onClick={() => {
            select(i as HotbarIndex);
          }}
        >
          <span className="sr-only">
            {displayName(tool)}
            {tool === 'can' ? `, ${charges} of ${BALANCE.canCharges} water` : ''}
          </span>
          <ToolIcon tool={tool} />
          <kbd className="slot-key">
            <span className="sr-only">, key </span>
            {i + 1}
          </kbd>
          {tool === 'can' && (
            <span
              className="can-charge"
              aria-hidden="true"
              style={{ ['--charge' as string]: `${ring}%` }}
            />
          )}
        </button>
      ))}
      <span className="hotbar-gap" aria-hidden="true" />
      {quick.map((bagIndex, q) => {
        const stack = bagIndex === null ? null : bag[bagIndex];
        const index = (5 + q) as HotbarIndex;
        return (
          <button
            key={q}
            type="button"
            role="tab"
            aria-selected={active === index}
            className={`slot slot-item${stack ? '' : ' is-empty'}`}
            onClick={() => {
              select(index);
            }}
          >
            <span className="sr-only">{stack ? `${displayName(stack.id)}, ` : 'Empty slot'}</span>
            {stack && <ItemIcon id={stack.id} />}
            {stack && <span className="slot-qty">{stack.qty}</span>}
            <kbd className="slot-key">
              <span className="sr-only">, key </span>
              {index + 1}
            </kbd>
          </button>
        );
      })}
    </div>
  );
}
