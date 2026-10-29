import type { SaveRepository } from '@ethergrove/core';
import { gameStore } from '../../game/store';
import { saveNow } from '../../save/autosave';
import { saveRepo } from '../../save/repo';
import { Panel } from './Panel';

export function SleepConfirm({ repo = saveRepo }: { repo?: SaveRepository }) {
  const close = () => {
    gameStore.getState().setOverlay(null);
  };
  return (
    <Panel title="Go to bed?" onClose={close}>
      <p>Sleeping ends the day, sells what's in the bin, and saves your farm.</p>
      <div className="row">
        <button type="button" className="btn btn-quiet" onClick={close}>
          Not yet
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const s = gameStore.getState();
            s.setOverlay(null);
            s.dispatch({ type: 'sleep' });
            void saveNow(gameStore, repo);
          }}
        >
          Sleep and save
        </button>
      </div>
    </Panel>
  );
}
