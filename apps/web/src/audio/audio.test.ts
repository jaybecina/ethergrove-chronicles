import { describe, expect, it } from 'vitest';
import { createSoundSystem, type SoundFactory, type SoundHandle } from './sound';
import { soundsFor } from './soundMap';

function fakeFactory(failing: string[] = []) {
  const log: string[] = [];
  const volumes = new Map<string, number>();
  const factory: SoundFactory = (id, { loop }) => {
    const handle: SoundHandle = {
      play: () => {
        if (failing.includes(id)) throw new Error('missing file');
        log.push(`play:${id}${loop ? ':loop' : ''}`);
      },
      stop: () => log.push(`stop:${id}`),
      volume: (v) => {
        volumes.set(id, v);
      },
      fade: (from, to) => {
        log.push(`fade:${id}:${from}->${to}`);
      },
    };
    return handle;
  };
  return { factory, log, volumes };
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
    expect(soundsFor({ type: 'weatherChanged', weather: 'storm' }, { surface: 'grass' })).toContain(
      'thunderAmbient',
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

describe('sound system', () => {
  it('stays silent until unlocked by a user gesture', () => {
    const { factory, log } = fakeFactory();
    const sys = createSoundSystem(factory);
    sys.play('hoe');
    expect(log).toEqual([]);
    sys.unlock();
    sys.play('hoe');
    expect(log).toEqual(['play:hoe']);
  });

  it('clamps volumes to 0..1', () => {
    const { factory, volumes } = fakeFactory();
    const sys = createSoundSystem(factory);
    sys.unlock();
    sys.setVolumes(2, -1);
    sys.play('hoe');
    sys.playMusic('spring');
    expect(volumes.get('hoe')).toBe(0);
    expect(volumes.get('music-spring')).toBeUndefined();
    expect(sys.volumes()).toEqual({ music: 1, sfx: 0 });
  });

  it('crossfades between season tracks', () => {
    const { factory, log } = fakeFactory();
    const sys = createSoundSystem(factory);
    sys.unlock();
    sys.playMusic('spring');
    sys.playMusic('summer');
    expect(log).toContain('play:music-spring:loop');
    expect(log).toContain('play:music-summer:loop');
    expect(log.some((l) => l.startsWith('fade:music-spring:'))).toBe(true);
    sys.playMusic('summer');
    expect(log.filter((l) => l === 'play:music-summer:loop')).toHaveLength(1);
  });

  it('a missing file never throws', () => {
    const { factory } = fakeFactory(['harvest']);
    const sys = createSoundSystem(factory);
    sys.unlock();
    expect(() => {
      sys.play('harvest');
    }).not.toThrow();
  });

  it('switches ambience with weather and time', () => {
    const { factory, log } = fakeFactory();
    const sys = createSoundSystem(factory);
    sys.unlock();
    sys.setAmbient({ weather: 'rain', minute: 600, outdoors: true, season: 'spring' });
    expect(log).toContain('play:rainAmbient:loop');
    sys.setAmbient({ weather: 'sunny', minute: 600, outdoors: true, season: 'summer' });
    expect(log).toContain('stop:rainAmbient');
    expect(log).toContain('play:cicadas:loop');
  });
});
