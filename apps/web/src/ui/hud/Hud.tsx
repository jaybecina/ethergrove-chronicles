import { Clock } from './Clock';
import { Gold } from './Gold';
import { Hotbar } from './Hotbar';
import { Prompt } from './Prompt';
import { Stamina } from './Stamina';

export function Hud() {
  return (
    <div className="hud">
      <Clock />
      <Gold />
      <Stamina />
      <Prompt />
      <Hotbar />
    </div>
  );
}
