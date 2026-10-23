import type { LoadResult, SaveSlotSummary, SlotId } from '@hearthvale/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gameStore } from '../../game/store';
import type { IdbSaveRepository } from '../../save/idbRepository';
import { downloadSave, importSave } from '../../save/fileIO';
import { saveRepo } from '../../save/repo';
import { useMenuNavigation } from '../focus';
import { dateLine, gold, playTime } from '../format';
import { uiStore, type SlotsMode } from '../uiStore';

interface Props {
  repo?: IdbSaveRepository;
  mode: SlotsMode;
}

export function SaveSlots({ repo = saveRepo, mode }: Props) {
  const [slots, setSlots] = useState<SaveSlotSummary[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ slot: SlotId; action: 'delete' | 'overwrite' } | null>(
    null,
  );
  const ref = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useMenuNavigation(ref, slots !== null);

  const refresh = useCallback(() => {
    void repo.list().then(setSlots);
  }, [repo]);
  useEffect(refresh, [refresh]);

  const play = (slot: SlotId, result: LoadResult) => {
    if (result.kind !== 'ok') return;
    const s = gameStore.getState();
    s.startGame(result.file.state, slot, result.file.playTimeMs);
    s.setScreen('game');
  };
  const startNew = (slot: SlotId) => {
    uiStore.getState().setPendingSlot(slot);
    gameStore.getState().setScreen('newGame');
  };

  return (
    <div className="screen screen-paper">
      <div
        ref={ref}
        className="panel panel-wide"
        role="region"
        aria-label={mode === 'new' ? 'Choose a slot' : 'Load a farm'}
      >
        <h2>{mode === 'new' ? 'Choose a slot for your farm' : 'Your farms'}</h2>
        <ul className="slot-cards">
          {(slots ?? []).map((s) => (
            <li
              key={s.slot}
              className={`slot-card${s.summary ? '' : ' is-empty'}${s.corrupt ? ' is-corrupt' : ''}`}
            >
              {s.summary ? (
                <>
                  <h3>{s.summary.farmName}</h3>
                  <p>{s.summary.playerName}</p>
                  <p>{dateLine(s.summary.calendar)}</p>
                  <p>{gold.format(s.summary.gold)} gold</p>
                  <p className="muted">{playTime(s.playTimeMs)}</p>
                </>
              ) : s.corrupt ? (
                <>
                  <h3>Damaged save</h3>
                  <p className="muted">
                    This save can't be read. A backup from your previous save may still work.
                  </p>
                </>
              ) : (
                <h3 className="muted">Empty slot</h3>
              )}
              <div className="row">
                {mode === 'new' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (s.summary) setConfirm({ slot: s.slot, action: 'overwrite' });
                      else startNew(s.slot);
                    }}
                  >
                    {s.summary ? 'Replace' : 'Start here'}
                  </button>
                )}
                {mode === 'load' && s.summary && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      void repo.load(s.slot).then((r) => {
                        play(s.slot, r);
                      })
                    }
                  >
                    Play
                  </button>
                )}
                {mode === 'load' && s.corrupt && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      void repo.loadBackup(s.slot).then((r) => {
                        if (r.kind === 'ok') play(s.slot, r);
                        else setMessage('No working backup was found for this slot.');
                      })
                    }
                  >
                    Load backup
                  </button>
                )}
                {s.summary && (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() =>
                      void repo.load(s.slot).then((r) => {
                        if (r.kind === 'ok') downloadSave(r.file);
                      })
                    }
                  >
                    Export
                  </button>
                )}
                {(s.summary ?? s.corrupt) && (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => {
                      setConfirm({ slot: s.slot, action: 'delete' });
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {confirm && (
          <div className="confirm" role="alertdialog" aria-label="Confirm">
            <p>
              {confirm.action === 'delete'
                ? `Delete the farm in slot ${confirm.slot}? This can't be undone.`
                : `Replace the farm in slot ${confirm.slot} with a new one?`}
            </p>
            <div className="row">
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setConfirm(null);
                }}
              >
                Keep it
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const { slot, action } = confirm;
                  setConfirm(null);
                  if (action === 'overwrite') startNew(slot);
                  else void repo.remove(slot).then(refresh);
                }}
              >
                {confirm.action === 'delete' ? 'Delete farm' : 'Replace farm'}
              </button>
            </div>
          </div>
        )}
        {message && (
          <p role="status" className="message">
            {message}
          </p>
        )}
        <div className="row">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              gameStore.getState().setScreen('title');
            }}
          >
            Back
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => file.current?.click()}>
            Import a save file
          </button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              void f.text().then(async (text) => {
                const result = importSave(text);
                if (!result.ok) {
                  setMessage("This file isn't a Hearthvale save.");
                  return;
                }
                const empty = (slots ?? []).find((s) => !s.summary && !s.corrupt);
                if (!empty) {
                  setMessage('All three slots are in use. Delete one, then import again.');
                  return;
                }
                await repo.save(empty.slot, result.file);
                setMessage(`Imported into slot ${empty.slot}.`);
                refresh();
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
