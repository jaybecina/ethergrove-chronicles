import { useEffect, useRef, useState } from 'react';
import { gameStore, useGame } from '../../game/store';
import { INTRO_FLIGHT_MS } from '../../scene/introCamera';
import { uiStore } from '../uiStore';

/** Ethergrove Chronicles spec §3.3, verbatim. */
export const INTRO_LETTER =
  "If you're reading this, I've gone down into the Heartdeep and haven't come back up yet. Keep the farm alive until I do. It's gone wild, I know. So did I, for a while. Plant something. Then plant something else. The roots remember people who stay. — Grandpa Elias";

const CHAR_MS = 30;

function finish() {
  const s = gameStore.getState();
  uiStore.getState().setFlightStart(null);
  s.updateSettings({ introSeen: true });
  s.setScreen('game');
}

export function Intro() {
  const seen = useGame((s) => s.settings.introSeen);
  const [shown, setShown] = useState(0);
  const [flying, setFlying] = useState(false);
  const done = shown >= INTRO_LETTER.length;
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (done || flying) return;
    const id = setInterval(() => {
      setShown((n) => Math.min(INTRO_LETTER.length, n + 1));
    }, CHAR_MS);
    return () => {
      clearInterval(id);
    };
  }, [done, flying]);

  useEffect(() => {
    if (done) continueRef.current?.focus();
  }, [done]);

  useEffect(() => {
    const reveal = () => {
      setShown(INTRO_LETTER.length);
    };
    window.addEventListener('keydown', reveal);
    window.addEventListener('pointerdown', reveal);
    return () => {
      window.removeEventListener('keydown', reveal);
      window.removeEventListener('pointerdown', reveal);
    };
  }, []);

  useEffect(() => {
    if (!flying) return;
    uiStore.getState().setFlightStart(performance.now());
    const id = setTimeout(finish, INTRO_FLIGHT_MS);
    return () => {
      clearTimeout(id);
    };
  }, [flying]);

  return (
    <div className={`intro${flying ? ' is-flying' : ''}`}>
      {!flying && (
        <article className="letter" aria-label="A letter from Grandpa Elias">
          <p data-testid="letter" aria-live="off">
            {INTRO_LETTER.slice(0, shown)}
          </p>
          {done && (
            <button
              ref={continueRef}
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFlying(true);
              }}
            >
              Continue
            </button>
          )}
        </article>
      )}
      {seen && (
        <button type="button" className="btn btn-quiet intro-skip" onClick={finish}>
          Skip intro
        </button>
      )}
    </div>
  );
}
