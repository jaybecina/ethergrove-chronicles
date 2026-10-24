import { gameStore } from '../../game/store';
import { Panel } from '../screens/Panel';
import { lessonStore, useLessons } from './lessonStore';
import { COMPLETE_TEXT } from './lessonText';

/** "The rest is yours": shown once when the last lesson is done (spec §4.5). */
export function LessonsComplete() {
  const gift = useLessons((s) => s.completeGift);
  if (gift === null) return null;
  const close = () => {
    lessonStore.getState().clearComplete();
    gameStore.getState().setOverlay(null);
  };
  return (
    <Panel title={COMPLETE_TEXT.title} onClose={close}>
      <p className="lessons-complete-body">{COMPLETE_TEXT.body}</p>
      <p className="lessons-complete-gift">{COMPLETE_TEXT.gift(gift)}</p>
      <button type="button" className="btn btn-primary" onClick={close}>
        {COMPLETE_TEXT.button}
      </button>
    </Panel>
  );
}
