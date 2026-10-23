import { ITEMS, sellPrice, type Command } from '@hearthvale/core';
import { gameStore, useGame } from '../../game/store';
import { ItemIcon } from '../icons';
import { displayName } from '../labels';
import { gold } from '../format';
import { Panel } from './Panel';

export function ShippingBin() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const dispatch = (cmd: Command) => gameStore.getState().dispatch(cmd);
  const sellable = game.bag.flatMap((cell, bagIndex) =>
    cell && ITEMS[cell.id].sell !== null ? [{ cell, bagIndex }] : [],
  );
  const total = game.bin.reduce((n, s) => n + (sellPrice(s.id) ?? 0) * s.qty, 0);
  return (
    <Panel
      title="Shipping bin"
      onClose={() => {
        gameStore.getState().setOverlay(null);
      }}
      wide
    >
      <div className="bin-columns">
        <section aria-label="Your bag">
          <h3>Your bag</h3>
          {sellable.length === 0 && (
            <p className="muted">Nothing to sell yet. Harvest crops or clear the field.</p>
          )}
          <ul className="shop-list">
            {sellable.map(({ cell, bagIndex }) => {
              const name = displayName(cell.id);
              return (
                <li key={bagIndex} className="shop-row">
                  <ItemIcon id={cell.id} size={30} />
                  <div className="shop-name">
                    <span>
                      {name} × {cell.qty}
                    </span>
                    <span className="muted">{sellPrice(cell.id)} gold each</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    aria-label={`Ship one ${name}`}
                    onClick={() => dispatch({ type: 'shipItem', bagIndex, qty: 1 })}
                  >
                    Ship 1
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    aria-label={`Ship all ${name}`}
                    onClick={() => dispatch({ type: 'shipItem', bagIndex, qty: cell.qty })}
                  >
                    Ship all
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-label="In the bin">
          <h3>In the bin</h3>
          {game.bin.length === 0 && <p className="muted">The bin is empty.</p>}
          <ul className="shop-list">
            {game.bin.map((s, binIndex) => {
              const name = displayName(s.id);
              return (
                <li key={s.id} className="shop-row">
                  <ItemIcon id={s.id} size={30} />
                  <div className="shop-name">
                    <span>
                      {name} × {s.qty}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    aria-label={`Take back ${name}`}
                    onClick={() => dispatch({ type: 'unshipItem', binIndex, qty: s.qty })}
                  >
                    Take back
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="bin-total">Sells tonight for {gold.format(total)} gold</p>
        </section>
      </div>
    </Panel>
  );
}
