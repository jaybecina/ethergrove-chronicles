import { makeSaveFile, type SaveRepository } from '@hearthvale/core';
import { useState } from 'react';
import { gameStore, useGame } from '../../game/store';
import { saveNow } from '../../save/autosave';
import { downloadSave } from '../../save/fileIO';
import { saveRepo } from '../../save/repo';
import { toastStore } from '../toastStore';
import { BagPanel } from './BagPanel';
import { CalendarPanel } from './CalendarPanel';
import { Panel } from './Panel';
import { Settings } from './Settings';

type Tab = 'bag' | 'calendar' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'bag', label: 'Bag' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'settings', label: 'Settings' },
];

export function Pause({ repo = saveRepo }: { repo?: SaveRepository }) {
  const [tab, setTab] = useState<Tab>('bag');
  const farm = useGame((s) => s.game?.farmName ?? '');
  const resume = () => {
    gameStore.getState().setOverlay(null);
  };
  return (
    <Panel title={farm || 'Paused'} onClose={resume} closeLabel="Resume" wide>
      <div className="tabs" role="tablist" aria-label="Menu">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="tab"
            onClick={() => {
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="tab-body">
        {tab === 'bag' && <BagPanel />}
        {tab === 'calendar' && <CalendarPanel />}
        {tab === 'settings' && <Settings />}
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={resume}>
          Resume
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            const { game, playTimeMs } = gameStore.getState();
            if (game) downloadSave(makeSaveFile(game, playTimeMs, new Date()));
          }}
        >
          Export save
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            const quit = () => {
              const s = gameStore.getState();
              s.setOverlay(null);
              s.setScreen('title');
            };
            saveNow(gameStore, repo).then(quit, () => {
              toastStore
                .getState()
                .push("Couldn't save. Use Export save to keep your progress.", 'warn', 6000);
            });
          }}
        >
          Save and quit
        </button>
      </div>
    </Panel>
  );
}
