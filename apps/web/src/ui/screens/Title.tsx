import { useEffect, useRef, useState } from 'react';
import type { SaveSlotSummary } from '@ethergrove/core';
import { gameStore } from '../../game/store';
import { loadSlot } from '../../save/autosave';
import type { IdbSaveRepository } from '../../save/idbRepository';
import { saveRepo } from '../../save/repo';
import { useMenuNavigation } from '../focus';
import { uiStore, useUi } from '../uiStore';
import { Panel } from './Panel';
import { Settings } from './Settings';

export function Title({ repo = saveRepo }: { repo?: IdbSaveRepository }) {
  const [latest, setLatest] = useState<SaveSlotSummary | null>(null);
  const settingsOpen = useUi((s) => s.settingsOpen);
  const ref = useRef<HTMLElement>(null);
  useMenuNavigation(ref);

  useEffect(() => {
    void repo.list().then((slots) => {
      const used = slots.filter((s) => s.savedAt);
      used.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
      setLatest(used[0] ?? null);
    });
  }, [repo]);

  const go = (mode: 'new' | 'load') => {
    uiStore.getState().setSlotsMode(mode);
    gameStore.getState().setScreen('slots');
  };

  return (
    <main className="title-screen">
      <header className="title-mark">
        <h1>Ethergrove Chronicles</h1>
        <p>Grandpa's farm is waiting.</p>
      </header>
      <nav ref={ref} className="title-menu" aria-label="Main menu">
        {latest?.summary && (
          <button
            type="button"
            className="btn btn-primary btn-large"
            onClick={() => {
              void loadSlot(gameStore, repo, latest.slot).then((r) => {
                if (r.kind === 'ok') gameStore.getState().setScreen('game');
              });
            }}
          >
            Continue {latest.summary.farmName}
          </button>
        )}
        <button
          type="button"
          className={`btn btn-large ${latest ? 'btn-quiet' : 'btn-primary'}`}
          onClick={() => {
            go('new');
          }}
        >
          New game
        </button>
        <button
          type="button"
          className="btn btn-quiet btn-large"
          onClick={() => {
            go('load');
          }}
        >
          Load game
        </button>
        <button
          type="button"
          className="btn btn-quiet btn-large"
          onClick={() => {
            uiStore.getState().setSettingsOpen(true);
          }}
        >
          Settings
        </button>
      </nav>
      {settingsOpen && (
        <Panel
          title="Settings"
          onClose={() => {
            uiStore.getState().setSettingsOpen(false);
          }}
        >
          <Settings />
        </Panel>
      )}
    </main>
  );
}
