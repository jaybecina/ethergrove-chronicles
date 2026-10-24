import { LessonAnnouncer } from '../lessons/GoalCard';
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
      <LessonAnnouncer />
      <MarkerPointer />
      <Gold />
      <Stamina />
      <Prompt />
      <Hotbar />
    </div>
  );
}
