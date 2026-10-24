import { useEffect } from 'react';
import { useGame } from '../../game/store';
import { lessonStore, useLessons } from './lessonStore';
import { JOURNAL_TEXT, NOTE_TEXT } from './lessonText';

const AUTO_DISMISS_MS = 10_000;

/** One-time notes from Grandpa, shown one at a time above the goal card (spec §4.4). */
export function NoteCard() {
  const head = useLessons((s) => s.noteQueue[0]);
  const queued = useLessons((s) => s.noteQueue.length);
  const visible = useGame((s) => s.screen === 'game' && s.overlay === null);
  useEffect(() => {
    if (!head || !visible) return;
    const id = setTimeout(() => {
      lessonStore.getState().dismissNote();
    }, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(id);
    };
  }, [head, queued, visible]);
  if (!head || !visible) return null;
  const text = NOTE_TEXT[head];
  return (
    <div className="lesson-card note-card">
      <p className="note-eyebrow">{JOURNAL_TEXT.eyebrow}</p>
      <p className="note-title">{text.title}</p>
      <p className="note-body">{text.body}</p>
      <button
        type="button"
        className="btn btn-quiet"
        onClick={() => {
          lessonStore.getState().dismissNote();
        }}
      >
        Got it
      </button>
    </div>
  );
}
