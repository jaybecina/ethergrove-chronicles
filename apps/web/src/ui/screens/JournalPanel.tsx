import { LESSON_ORDER, NOTE_IDS, type LessonId } from '@hearthvale/core';
import { useEffect, useRef, useState } from 'react';
import type { Device } from '../../input/intents';
import { gameStore, useGame } from '../../game/store';
import { chipFor, chipsFor, HINT_ACTIONS, type Chip } from '../lessons/hints';
import { JOURNAL_TEXT, LESSON_TEXT, NOTE_TEXT } from '../lessons/lessonText';

const DEVICES: { id: Device; label: string }[] = [
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'gamepad', label: 'Gamepad' },
  { id: 'touch', label: 'Touch' },
];

function Chips({ chips }: { chips: Chip[] }) {
  return (
    <ul className="goal-chips" aria-label="Controls">
      {chips.map((c) => (
        <li key={c.label} className="prompt-chip">
          {c.keys.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
          {c.label}
        </li>
      ))}
    </ul>
  );
}

function SkipConfirm({ onClose }: { onClose: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
  }, []);
  return (
    <div className="journal-confirm" role="alertdialog" aria-label={JOURNAL_TEXT.skipTitle}>
      <p className="journal-confirm-title">{JOURNAL_TEXT.skipTitle}</p>
      <p>{JOURNAL_TEXT.skipBody}</p>
      <div className="row">
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            gameStore.getState().dispatch({ type: 'skipLessons' });
            onClose();
          }}
        >
          {JOURNAL_TEXT.skipConfirm}
        </button>
        <button ref={keep} type="button" className="btn btn-primary" onClick={onClose}>
          {JOURNAL_TEXT.skipCancel}
        </button>
      </div>
    </div>
  );
}

/** Every lesson, note and control, readable any time (spec §4.8). */
export function JournalPanel() {
  const game = useGame((s) => s.game);
  const device = useGame((s) => s.device);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  if (!game) return null;
  const { lesson } = game.tutorial;
  const active = lesson !== 'off' && lesson !== 'complete';
  const current = active ? LESSON_ORDER.indexOf(lesson) : -1;
  const status = (i: number) => {
    if (lesson === 'off') return '';
    if (lesson === 'complete' || i < current) return 'Done';
    return i === current ? 'Current' : 'Upcoming';
  };
  const toggle = (key: string) => {
    setOpen(open === key ? null : key);
  };

  return (
    <div className="journal">
      <h3>{JOURNAL_TEXT.lessons}</h3>
      <ol className="journal-list" aria-label={JOURNAL_TEXT.lessons}>
        {LESSON_ORDER.map((id: LessonId, i) => {
          const st = status(i);
          return (
            <li key={id} className={`journal-row${st ? ` is-${st.toLowerCase()}` : ''}`}>
              <button
                type="button"
                className="journal-row-head"
                aria-expanded={open === id}
                onClick={() => {
                  toggle(id);
                }}
              >
                {st && <span className="journal-state">{`${st}: `}</span>}
                {LESSON_TEXT[id].title}
              </button>
              {open === id && (
                <div className="journal-row-body">
                  <p>{LESSON_TEXT[id].body}</p>
                  <Chips chips={chipsFor(id, device, game)} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <h3>{JOURNAL_TEXT.notes}</h3>
      <dl className="journal-notes">
        {NOTE_IDS.map((id) => (
          <div key={id}>
            <dt>{NOTE_TEXT[id].title}</dt>
            <dd>{NOTE_TEXT[id].body}</dd>
          </div>
        ))}
      </dl>

      <h3>{JOURNAL_TEXT.controls}</h3>
      <table
        className={`journal-controls${showAll ? ' show-all' : ''}`}
        aria-label={JOURNAL_TEXT.controls}
      >
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
            {DEVICES.map((d) => (
              <th key={d.id} scope="col" className={d.id === device ? 'is-current' : undefined}>
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HINT_ACTIONS.map((a) => (
            <tr key={a}>
              <th scope="row">{chipFor(a, 'keyboard', game).label}</th>
              {DEVICES.map((d) => (
                <td key={d.id} className={d.id === device ? 'is-current' : undefined}>
                  {chipFor(a, d.id, game).keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="btn btn-quiet journal-show-all"
        aria-pressed={showAll}
        onClick={() => {
          setShowAll(!showAll);
        }}
      >
        {JOURNAL_TEXT.showAll}
      </button>

      <div className="row">
        {active ? (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setConfirm(true);
            }}
          >
            {JOURNAL_TEXT.skip}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              const s = gameStore.getState();
              s.dispatch({ type: 'restartLessons' });
              s.setOverlay(null);
            }}
          >
            {JOURNAL_TEXT.restart}
          </button>
        )}
      </div>
      {confirm && (
        <SkipConfirm
          onClose={() => {
            setConfirm(false);
          }}
        />
      )}
    </div>
  );
}
