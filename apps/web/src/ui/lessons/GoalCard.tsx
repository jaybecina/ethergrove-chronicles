import { CROPS, isMature, LESSON_GOAL, type GameState, type LessonId } from '@hearthvale/core';
import { useGame } from '../../game/store';
import { chipsFor } from './hints';
import { useLessons, lessonStore } from './lessonStore';
import { LESSON_TEXT } from './lessonText';

const isLesson = (l: GameState['tutorial']['lesson']): l is LessonId =>
  l !== 'off' && l !== 'complete';

/** "2 / 3" for counted lessons, "watered / total" for water lessons. */
function progress(game: GameState, id: LessonId): string | null {
  const goal = LESSON_GOAL[id];
  if (goal) return `${game.tutorial.count} / ${goal}`;
  if (id !== 'water' && id !== 'waterDaily') return null;
  const crops = game.maps.farm.tiles.filter((t) => t.crop);
  if (crops.length === 0) return null;
  return `${crops.filter((t) => t.watered === true).length} / ${crops.length}`;
}

/** "Ripe in N days" while harvesting and nothing is ripe yet. */
function ripeIn(game: GameState): string | null {
  const crops = game.maps.farm.tiles.flatMap((t) => (t.crop ? [t.crop] : []));
  if (crops.length === 0 || crops.some(isMature)) return null;
  const days = Math.max(1, Math.min(...crops.map((c) => CROPS[c.id].days - c.age)));
  return `Ripe in ${days} day${days === 1 ? '' : 's'}`;
}

/** Screen-reader live region for lesson and note events; always mounted so nothing is missed. */
export function LessonAnnouncer() {
  const announce = useLessons((s) => s.announce);
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {announce}
    </div>
  );
}

/** The current lesson, under the clock (spec §4.2). */
export function GoalCard() {
  const game = useGame((s) => s.game);
  const device = useGame((s) => s.device);
  const visible = useGame((s) => s.screen === 'game' && s.overlay === null);
  const expanded = useLessons((s) => s.expanded);
  const doneFlash = useLessons((s) => s.doneFlash);
  if (!game || !visible || !isLesson(game.tutorial.lesson)) return null;
  const id = doneFlash ?? game.tutorial.lesson;
  const text = LESSON_TEXT[id];
  const count = doneFlash ? null : progress(game, id);
  const ripe = !doneFlash && id === 'harvest' ? ripeIn(game) : null;
  const open = expanded && !doneFlash;
  return (
    <div className="lesson-card goal-card">
      <button
        type="button"
        className="goal-head"
        aria-expanded={open}
        onClick={() => {
          lessonStore.getState().setExpanded(!expanded);
        }}
      >
        <span className="goal-icon" aria-hidden="true">
          {doneFlash ? '✓' : '✎'}
        </span>
        <span className="goal-title-wrap">
          <span className={`goal-title${doneFlash ? ' is-done' : ''}`}>{text.title}</span>
          {ripe && <span className="goal-sub">{ripe}</span>}
        </span>
        {count && <span className="goal-pill">{count}</span>}
      </button>
      {open && (
        <div className="goal-body">
          <p>{text.body}</p>
          <ul className="goal-chips" aria-label="Controls">
            {chipsFor(id, device, game).map((c) => (
              <li key={c.label} className="prompt-chip">
                {c.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
