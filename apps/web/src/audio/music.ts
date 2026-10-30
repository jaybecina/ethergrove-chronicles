import type { GameEvent, LocationId, Season, Weather } from '@ethergrove/core';
import type { Overlay, Screen } from '../game/store';

export type TrackId =
  'title' | 'spring' | 'summer' | 'fall' | 'winter' | 'night' | 'home' | 'shop' | 'rain';
/** What the music director asks for: one track per situation (audio spec §4.1). */
export type CueId = TrackId;
export type JingleId = 'morning' | 'season' | 'lessonsComplete' | 'faint';
/** The shipped jingle files: one season fanfare per season, in that season's key. */
export type JingleFile = 'morning' | 'lessonsComplete' | 'faint' | `season-${Season}`;

export interface MusicInput {
  screen: Screen;
  overlay: Overlay | null;
  location: LocationId;
  season: Season;
  minute: number;
  weather: Weather;
}

/** 20:00: the night track takes over. */
const NIGHT_MINUTE = 1200;
/**
 * Which music fits the moment (audio spec §4.1); the first matching rule wins. Rain and storms play the one
 * rain track in every season; night, the house and the cart still win over the weather. Returns a literal, so it is
 * cheap to call on every store change.
 */
export function pickTrack(s: MusicInput | null): CueId {
  if (!s || s.screen !== 'game') return 'title';
  if (s.overlay === 'cart') return 'shop';
  if (s.minute >= NIGHT_MINUTE) return 'night';
  if (s.location === 'house') return 'home';
  if (s.weather === 'rain' || s.weather === 'storm') return 'rain';
  return s.season;
}

/** The file a jingle plays: the season fanfare is the new season's own file (audio spec §4.3). */
export function jingleFile(id: JingleId, season: Season): JingleFile {
  return id === 'season' ? `season-${season}` : id;
}

const JINGLE_PRIORITY: readonly [GameEvent['type'], JingleId][] = [
  ['passedOut', 'faint'],
  ['seasonChanged', 'season'],
  ['dayStarted', 'morning'],
  ['lessonsComplete', 'lessonsComplete'],
];

/** The one jingle an event batch earns, if any (spec §5.4). */
export function jingleFor(events: readonly GameEvent[]): JingleId | null {
  for (const [type, id] of JINGLE_PRIORITY) if (events.some((e) => e.type === type)) return id;
  return null;
}
