import { describe, expect, it } from 'vitest';
import {
  asContext,
  FakeAudioContext,
  FakeBufferSource,
  FakeFilter,
  FakeGain,
} from '../test/fakeAudio';
import { JINGLES, MUSIC } from './manifest';
import { createPlayer } from './player';

/** Bytes that remember their URL, so a fake decode can say which file it was. */
const bytesFor = (url: string) => new TextEncoder().encode(url).buffer;
const urlOf = (b: ArrayBuffer) => new TextDecoder().decode(b);

function setup(
  fetchBytes: (url: string) => Promise<ArrayBuffer> = (u) => Promise.resolve(bytesFor(u)),
) {
  const fake = new FakeAudioContext();
  Object.assign(fake, {
    decodeAudioData: (b: ArrayBuffer) => Promise.resolve({ duration: 3, url: urlOf(b) }),
  });
  const player = createPlayer({ ctx: asContext(fake), fetchBytes });
  // The player builds its graph first, in this order (player.ts).
  const [trackBus, musicOut, sfxOut] = fake.created('gain') as FakeGain[];
  const musicFilter = fake.created('filter')[0] as FakeFilter;
  const sources = () => fake.created('bufferSource') as FakeBufferSource[];
  return { fake, player, trackBus, musicOut, sfxOut, musicFilter, sources };
}
const urlOfSource = (s: FakeBufferSource) => (s.buffer as { url: string }).url;
const loopOf = (s: FakeBufferSource) => s as unknown as { loopStart: number; loopEnd: number };

describe('player', () => {
  it('loops a track between the manifest loop points', async () => {
    const { player, sources } = setup();
    await player.playTrack('spring');
    const [s] = sources();
    expect(s?.loop).toBe(true);
    expect(s && urlOfSource(s)).toBe(`/assets/${MUSIC.spring.file}`);
    expect(s && loopOf(s).loopStart).toBe(MUSIC.spring.loopStart);
    expect(s && loopOf(s).loopEnd).toBe(MUSIC.spring.loopEnd);
  });

  it('does not restart the track that is already playing (audio plan Review Focus 2)', async () => {
    const { player, sources } = setup();
    await player.playTrack('rain');
    await player.playTrack('rain');
    expect(sources()).toHaveLength(1);
  });

  it('keeps the playing track when a cue flaps back to it before the other track has loaded', async () => {
    const never = new Promise<ArrayBuffer>(() => undefined);
    const { player, sources } = setup((u) =>
      u.includes('shop') ? never : Promise.resolve(bytesFor(u)),
    );
    await player.playTrack('rain');
    void player.playTrack('shop'); // the cart opens; its track is still loading…
    await player.playTrack('rain'); // …and closes again
    expect(sources()).toHaveLength(1);
    expect(sources()[0]?.stoppedAt).toBeNull();
  });

  it('never overlaps more than two tracks when cues flap, and settles on one', async () => {
    const { fake, player } = setup();
    await player.playTrack('spring');
    await player.playTrack('rain');
    await player.playTrack('spring');
    expect(player.stats().activeTracks).toBeLessThanOrEqual(2);
    fake.currentTime = 1.3;
    expect(player.stats().activeTracks).toBe(1);
  });

  it('ignores a slow load that a newer cue has overtaken', async () => {
    let release: (b: ArrayBuffer) => void = () => undefined;
    const slow = new Promise<ArrayBuffer>((r) => {
      release = r;
    });
    const { player, sources } = setup((u) =>
      u.includes('spring') ? slow : Promise.resolve(bytesFor(u)),
    );
    const first = player.playTrack('spring');
    await player.playTrack('summer');
    release(bytesFor(`/assets/${MUSIC.spring.file}`));
    await first;
    expect(sources().map(urlOfSource)).toEqual([`/assets/${MUSIC.summer.file}`]);
  });

  it('does not keep the decoded audio of a load that a newer cue overtook', async () => {
    let release: (b: ArrayBuffer) => void = () => undefined;
    const slow = new Promise<ArrayBuffer>((r) => {
      release = r;
    });
    const { player } = setup((u) => (u.includes('spring') ? slow : Promise.resolve(bytesFor(u))));
    const first = player.playTrack('spring');
    await player.playTrack('summer');
    release(bytesFor(`/assets/${MUSIC.spring.file}`));
    await first;
    expect(player.stats().loaded).toBe(1);
  });

  it('keeps at most two decoded tracks', async () => {
    const { player } = setup();
    for (const id of ['title', 'spring', 'summer'] as const) await player.playTrack(id);
    expect(player.stats().loaded).toBeLessThanOrEqual(2);
  });

  it('muffles and lowers the music while paused', () => {
    const { player, musicFilter, musicOut } = setup();
    player.setVolumes(0.5, 0.8);
    player.setPaused(true);
    expect(musicFilter.frequency.calls.at(-1)?.[1]).toBe(1200);
    expect(musicOut?.gain.calls.at(-1)?.[1]).toBeCloseTo(0.3);
    player.setPaused(false);
    expect(musicFilter.frequency.calls.at(-1)?.[1]).toBe(20000);
    expect(musicOut?.gain.calls.at(-1)?.[1]).toBeCloseTo(0.5);
  });

  it('ducks the track under a jingle and brings it back after', async () => {
    const { player, trackBus, sources } = setup();
    await player.playJingle('morning');
    const calls = trackBus?.gain.calls ?? [];
    expect(calls).toContainEqual(['linearRampToValueAtTime', 0.25, 0.08]);
    expect(calls).toContainEqual(['linearRampToValueAtTime', 1, 3 + 0.8]);
    expect(sources()[0] && urlOfSource(sources()[0] as FakeBufferSource)).toBe(
      `/assets/${JINGLES.morning.file}`,
    );
  });

  it('starts sound effects a moment ahead, at their pitch', async () => {
    const { fake, player, sources, sfxOut } = setup();
    fake.currentTime = 2;
    player.setVolumes(0.5, 0.6);
    player.playSfx('hoe', 1.2);
    await new Promise((r) => setTimeout(r, 0));
    const [s] = sources();
    expect(s?.startedAt).toBeCloseTo(2.005);
    expect(s?.playbackRate.value).toBe(1.2);
    expect(sfxOut?.gain.value).toBe(0.6);
  });

  it('drops sound effects while audio is suspended, so they never pile up and burst out on resume', async () => {
    const { fake, player, sources } = setup();
    fake.state = 'suspended';
    player.playSfx('hoe', 1);
    player.playSfx('coin', 1);
    await new Promise((r) => setTimeout(r, 0));
    expect(sources()).toEqual([]);
    fake.state = 'running';
    player.playSfx('hoe', 1);
    await new Promise((r) => setTimeout(r, 0));
    expect(sources()).toHaveLength(1);
  });

  it('stays silent when a file fails to load', async () => {
    const { player, sources } = setup(() => Promise.reject(new Error('offline')));
    await expect(player.playTrack('night')).resolves.toBeUndefined();
    await expect(player.playJingle('faint')).resolves.toBeUndefined();
    player.playSfx('coin', 1);
    await new Promise((r) => setTimeout(r, 0));
    expect(sources()).toEqual([]);
  });
});
