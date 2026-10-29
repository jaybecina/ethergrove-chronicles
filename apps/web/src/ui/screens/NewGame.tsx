import { createNewGame, type SaveRepository } from '@ethergrove/core';
import { useRef, useState } from 'react';
import { gameStore } from '../../game/store';
import { saveNow } from '../../save/autosave';
import { saveRepo } from '../../save/repo';
import { useMenuNavigation } from '../focus';
import { JOURNAL_TEXT } from '../lessons/lessonText';
import { uiStore, useUi } from '../uiStore';

const MAX = 16;

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] ?? 1) >>> 1;
}

export function NewGame({ repo = saveRepo }: { repo?: SaveRepository }) {
  const slot = useUi((s) => s.pendingSlot) ?? 1;
  const [name, setName] = useState('');
  const [farm, setFarm] = useState('');
  const [lessons, setLessons] = useState(true);
  const ref = useRef<HTMLFormElement>(null);
  useMenuNavigation(ref);
  const ready = name.trim().length > 0 && farm.trim().length > 0;

  return (
    <div className="screen screen-paper">
      <form
        ref={ref}
        className="panel panel-form"
        aria-label="New farm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          const s = gameStore.getState();
          s.startGame(
            createNewGame({
              seed: randomSeed(),
              playerName: name.trim(),
              farmName: farm.trim(),
              lessons,
            }),
            slot,
          );
          s.setScreen('intro');
          void saveNow(gameStore, repo);
        }}
      >
        <h2>A farm of your own</h2>
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={MAX}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
        <label className="field">
          <span>Farm name</span>
          <input
            value={farm}
            maxLength={MAX}
            autoComplete="off"
            onChange={(e) => {
              setFarm(e.target.value);
            }}
          />
        </label>
        <label className="field field-check">
          <input
            type="checkbox"
            checked={lessons}
            onChange={(e) => {
              setLessons(e.target.checked);
            }}
          />
          <span>
            {JOURNAL_TEXT.newGameLabel}
            <small>{JOURNAL_TEXT.newGameHint}</small>
          </span>
        </label>
        <div className="row">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              uiStore.getState().setSlotsMode('new');
              gameStore.getState().setScreen('slots');
            }}
          >
            Back
          </button>
          <button type="submit" className="btn btn-primary" disabled={!ready}>
            Start farming
          </button>
        </div>
      </form>
    </div>
  );
}
