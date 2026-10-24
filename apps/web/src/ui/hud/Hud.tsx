import { GoalCard, LessonAnnouncer } from '../lessons/GoalCard';
import { NoteCard } from '../lessons/NoteCard';
import { Clock } from './Clock';
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
      <Gold />
      <Stamina />
      <Prompt />
      <Hotbar />
    </div>
  );
}
