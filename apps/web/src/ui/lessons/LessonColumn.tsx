import { GoalCard } from './GoalCard';
import { NoteCard } from './NoteCard';

/**
 * The note and goal cards. Mounted outside the HUD (whose fixed box is its own stacking layer)
 * so it can sit above the touch joystick zone and taps on a card reach the card.
 */
export function LessonColumn() {
  return (
    <div className="hud-lessons">
      <NoteCard />
      <GoalCard />
    </div>
  );
}
