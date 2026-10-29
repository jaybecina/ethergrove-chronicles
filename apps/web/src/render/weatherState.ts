import type { GameState } from '@ethergrove/core';
import { QUALITY, type QualityTier } from './quality';
import { weatherVisuals, type WeatherVisuals } from './weatherVisuals';

/** Live weather look for this frame; written by <Weather>, read by lights and sky. */
export const weatherNow: { visuals: WeatherVisuals; flash: number } = {
  visuals: weatherVisuals('sunny', 'high'),
  flash: 0,
};

export function visualsFor(game: GameState, tier: QualityTier): WeatherVisuals {
  return game.player.location === 'farm'
    ? weatherVisuals(game.weather.today, tier)
    : weatherVisuals('sunny', tier);
}

type ThunderListener = () => void;
const thunder = new Set<ThunderListener>();

export function onThunder(fn: ThunderListener): () => void {
  thunder.add(fn);
  return () => thunder.delete(fn);
}

export function emitThunder(): void {
  thunder.forEach((fn) => {
    fn();
  });
}

export { QUALITY };
