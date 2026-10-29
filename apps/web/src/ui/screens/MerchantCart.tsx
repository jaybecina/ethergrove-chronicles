import { CROPS, addItem, cartStock, cropOfSeed, isCartOpen, type SeedId } from '@ethergrove/core';
import { useState } from 'react';
import { gameStore, useGame } from '../../game/store';
import { ItemIcon } from '../icons';
import { displayName } from '../labels';
import { gold } from '../format';
import { Panel } from './Panel';

function Row({ seed }: { seed: SeedId }) {
  const game = useGame((s) => s.game);
  const [qty, setQty] = useState(1);
  if (!game) return null;
  const crop = cropOfSeed(seed);
  const price = crop ? CROPS[crop].seedCost : 0;
  const total = price * qty;
  const fits = addItem(game.bag, seed, qty).overflow === 0;
  const reason = total > game.gold ? 'Not enough gold' : !fits ? 'Your bag is full' : null;
  const name = displayName(seed);
  return (
    <li className="shop-row">
      <ItemIcon id={seed} size={34} />
      <div className="shop-name">
        <span>{name}</span>
        <span className="muted">
          {price} gold each{crop ? `, ripe in ${CROPS[crop].days} days` : ''}
          {crop && CROPS[crop].regrow ? `, regrows every ${CROPS[crop].regrow}` : ''}
        </span>
      </div>
      <div className="stepper" role="group" aria-label={`Quantity of ${name}`}>
        <button
          type="button"
          aria-label={`One fewer ${name}`}
          onClick={() => {
            setQty((q) => Math.max(1, q - 1));
          }}
        >
          −
        </button>
        <output aria-live="polite">{qty}</output>
        <button
          type="button"
          aria-label={`One more ${name}`}
          onClick={() => {
            setQty((q) => Math.min(99, q + 1));
          }}
        >
          +
        </button>
      </div>
      <div className="shop-buy">
        <button
          type="button"
          className="btn btn-primary"
          disabled={reason !== null}
          onClick={() => {
            gameStore.getState().dispatch({ type: 'buyItem', itemId: seed, qty });
            setQty(1);
          }}
        >
          Buy{' '}
          <span className="sr-only">
            {qty} {name}{' '}
          </span>
          for {gold.format(total)}
          <span className="sr-only"> gold</span>
        </button>
        {reason && <span className="reason">{reason}</span>}
      </div>
    </li>
  );
}

export function MerchantCart() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const close = () => {
    gameStore.getState().setOverlay(null);
  };
  const open = isCartOpen(game);
  return (
    <Panel title="Sol's cart" onClose={close} wide>
      <p className="speech">
        {open
          ? 'Fresh seeds from over the hills. What are you planting today?'
          : "I'm packing up for now. Come back between 9 AM and 5 PM."}
      </p>
      {open && (
        <ul className="shop-list">
          {cartStock(game).map((seed) => (
            <Row key={seed} seed={seed} />
          ))}
        </ul>
      )}
      <p className="muted">You have {gold.format(game.gold)} gold.</p>
    </Panel>
  );
}
