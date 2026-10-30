import { describe, expect, it } from 'vitest';
import { createSoundSystem, type AudioBackend } from './sound';
import { soundsFor } from './soundMap';

function fakeBackend({ throwing = false } = {}) {
  const log: string[] = [];
  const rec =
    (fmt: (...a: never[]) => string) =>
    (...a: never[]) => {
      if (throwing) throw new Error('no audio');
      log.push(fmt(...a));
    };
  const backend: AudioBackend = {
    sfx: rec((id: string, mul: number) => `sfx:${id}:${mul}`),
    cue: rec((c: string) => `cue:${c}`),
    jingle: rec((id: string) => `jingle:${id}`),
    setVolumes: rec((m: number, s: number) => `vol:${m}:${s}`),
    setPaused: rec((p: boolean) => `paused:${p}`),
    suspend: rec(() => 'suspend'),
    resume: rec(() => 'resume'),
  };
  return { backend, log };
}

describe('soundsFor', () => {
  it('maps tool hits, harvests and storms', () => {
    expect(
      soundsFor({ type: 'toolUsed', tool: 'hoe', x: 0, y: 0, hit: true }, { surface: 'dirt' }),
    ).toEqual(['hoe']);
    expect(
      soundsFor({ type: 'toolUsed', tool: 'axe', x: 0, y: 0, hit: false }, { surface: 'dirt' }),
    ).toEqual(['swing']);
    expect(
      soundsFor({ type: 'cropHarvested', x: 0, y: 0, crop: 'turnip' }, { surface: 'dirt' }),
    ).toEqual(['harvest']);
    expect(soundsFor({ type: 'weatherChanged', weather: 'storm' }, { surface: 'grass' })).toEqual(
      [],
    );
    expect(soundsFor({ type: 'goldChanged', gold: 10, delta: 5 }, { surface: 'grass' })).toEqual([
      'coin',
    ]);
    expect(soundsFor({ type: 'goldChanged', gold: 10, delta: -5 }, { surface: 'grass' })).toEqual(
      [],
    );
    expect(soundsFor({ type: 'staminaLow' }, { surface: 'grass' })).toEqual([]);
  });
});

describe('lesson sounds', () => {
  it('lessonDone chimes; lessonsComplete chimes; notes are silent', () => {
    const ctx = { surface: 'grass' as const };
    expect(soundsFor({ type: 'lessonDone', id: 'till' }, ctx)).toEqual(['chime']);
    expect(soundsFor({ type: 'lessonsComplete', gift: 100 }, ctx)).toEqual(['chime']);
    expect(soundsFor({ type: 'noteShown', id: 'rain' }, ctx)).toEqual([]);
  });

  it('plays the same sound once when it repeats within 150 ms', () => {
    const { backend, log } = fakeBackend();
    let t = 0;
    const sys = createSoundSystem(backend, () => t);
    sys.unlock();
    sys.play('chime');
    t = 100;
    sys.play('chime');
    expect(log.filter((l) => l === 'sfx:chime:1')).toHaveLength(1);
    t = 260;
    sys.play('chime');
    expect(log.filter((l) => l === 'sfx:chime:1')).toHaveLength(2);
  });
});

describe('sound system', () => {
  it('stays silent until unlocked by a user gesture', () => {
    const { backend, log } = fakeBackend();
    const sys = createSoundSystem(backend);
    sys.play('hoe');
    sys.playJingle('morning');
    sys.footstep('grass');
    expect(log).toEqual([]);
    sys.unlock();
    sys.play('hoe');
    expect(log.at(-1)).toBe('sfx:hoe:1');
  });

  it('starts the latest cue on unlock, not the first one requested', () => {
    const { backend, log } = fakeBackend();
    const sys = createSoundSystem(backend);
    sys.setCue('title');
    sys.setCue('night');
    expect(log).toEqual([]);
    sys.unlock();
    expect(log).toEqual(['resume', 'vol:0.6:0.8', 'cue:night']);
    sys.unlock();
    expect(log).toHaveLength(3);
    expect(sys.state()).toMatchObject({ unlocked: true, cue: 'night' });
  });

  it('sends a cue only when it changes', () => {
    const { backend, log } = fakeBackend();
    const sys = createSoundSystem(backend);
    sys.unlock();
    sys.setCue('spring');
    sys.setCue('spring');
    sys.setCue('home');
    expect(log.filter((l) => l.startsWith('cue:'))).toEqual(['cue:spring', 'cue:home']);
  });

  it('clamps volumes to 0..1', () => {
    const { backend, log } = fakeBackend();
    const sys = createSoundSystem(backend);
    sys.unlock();
    sys.setVolumes(2, -1);
    expect(sys.volumes()).toEqual({ music: 1, sfx: 0 });
    expect(log.at(-1)).toBe('vol:1:0');
  });

  it('alternates footstep pitch so steps don’t sound machine-gunned', () => {
    const { backend, log } = fakeBackend();
    let t = 0;
    const sys = createSoundSystem(backend, () => t);
    sys.unlock();
    for (let i = 0; i < 3; i++) {
      sys.footstep('grass');
      t += 400;
    }
    expect(log.filter((l) => l.startsWith('sfx:'))).toEqual([
      'sfx:step-grass:0.97',
      'sfx:step-grass:1.03',
      'sfx:step-grass:0.97',
    ]);
  });

  it('plays a jingle file and remembers the last one', () => {
    const { backend, log } = fakeBackend();
    const sys = createSoundSystem(backend);
    sys.unlock();
    sys.playJingle('season-fall');
    expect(log.at(-1)).toBe('jingle:season-fall');
    expect(sys.state().jingle).toBe('season-fall');
  });

  it('passes pause only when it changes', () => {
    const { backend, log } = fakeBackend();
    const sys = createSoundSystem(backend);
    sys.unlock();
    sys.setPaused(true);
    sys.setPaused(true);
    sys.setPaused(false);
    expect(log.filter((l) => l.startsWith('paused'))).toEqual(['paused:true', 'paused:false']);
  });

  it('records the last sound effect', () => {
    const { backend } = fakeBackend();
    const sys = createSoundSystem(backend);
    sys.unlock();
    sys.play('coin');
    expect(sys.state().lastSfx).toBe('coin');
  });

  it('never throws when the backend fails', () => {
    const { backend } = fakeBackend({ throwing: true });
    const sys = createSoundSystem(backend);
    expect(() => {
      sys.setCue('title');
      sys.unlock();
      sys.play('harvest');
      sys.playJingle('morning');
      sys.setVolumes(0.5, 0.5);
      sys.setPaused(true);
      sys.suspend();
      sys.resume();
    }).not.toThrow();
  });
});
