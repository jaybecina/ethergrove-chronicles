import { WEATHER_TABLE } from '../data/weatherTable';
import { nextFloat } from '../rng';
import type { Season, Weather } from '../types';

export function rollWeather(season: Season, day: number, rng: number): [Weather, number] {
  if (day === 1) return ['sunny', rng];
  const [v, next] = nextFloat(rng);
  let acc = 0;
  for (const [weather, weight] of WEATHER_TABLE[season]) {
    acc += weight;
    if (v < acc) return [weather, next];
  }
  return ['sunny', next];
}
