import { GoalCard, LessonAnnouncer } from '../lessons/GoalCard';
import { NoteCard } from '../lessons/NoteCard';
import { Clock } from './Clock';
import { MarkerPointer } from './MarkerPointer';
import { Gold } from './Gold';
import { Hotbar } from './Hotbar';
import { Prompt } from './Prompt';
import { Stamina } from './Stamina';

export function Hud() {
  return (
    <div className="hud">
      <Clock />
      <div className="hud-lessons">
        <NoteCard />
        <GoalCard />
      </div>
      <LessonAnnouncer />
      <MarkerPointer />
      <Gold />
      <Stamina />
      <Prompt />
      <Hotbar />
    </div>
  );
}
